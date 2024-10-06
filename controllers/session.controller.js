const Session = require("../models/session.model");
const uuid = require("uuid");
const errorHandler = require("../utils/errorHandler");
const openai = require("../utils/openai");
const removeMd = require("remove-markdown");

exports.sessionHandler = async (req, res, next) => {
  // Check if cookie exists
  if (!req.cookies.sessionToken) {
    // Generate a random token
    const token = uuid.v4();
    // Create a new session with the token
    const session = new Session({
      token,
      userAgent: req.headers["user-agent"],
    });
    await session.save();
    // Save the session to the database
    res.cookie("sessionToken", session.token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    });

    req.session = session; // Add session to req
    next();
  } else {
    try {
      // Get the session from the database
      const session = await Session.findOne({
        token: req.cookies.sessionToken,
      });

      if (!session) {
        return new errorHandler(404, "Session not found");
      }

      req.session = session; // Add session to req
      next();
    } catch (error) {
      console.error("Error finding session:", error);
      return errorHandler(500, "Internal server error");
    }
  }
};

exports.newMessage = async (req, res) => {
  const { message } = req.body;
  const { session } = req;

  try {
    // Check if session has a threadID
    if (!session.threadID) {
      // Create a new thread
      const thread = await openai.beta.threads.create();

      // Save the threadID to the session
      session.threadID = thread.id;
      // Save the session to the database
      await session.save();
    }

    // Add a message to the thread with the user's question
    await openai.beta.threads.messages.create(session.threadID, {
      role: "user",
      content: message,
    });

    // Send the message to the thread
    const run = await openai.beta.threads.runs.create(session.threadID, {
      assistant_id: process.env.ASSISTANT_ID,
    });

    const runResults = await checkRunStatus(session, run);

    if (runResults.status !== "completed") {
      throw new Error(`Run failed with status: ${runResults.status}`);
    }

    const messages = await openai.beta.threads.messages.list(session.threadID);

    let last_message = messages.data[0];
    let response = last_message.content[0].text.value;
    // Remove Markdown formatting
    response = removeMd(response);
    response = response.replace(/【\d+†source】/g, "");

    // Call a normal chat completion to get a parseable JSON object
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant. Parse the content into json",
        },
        { role: "user", content: response },
      ],
      functions: [
        {
          name: "give_answer_with_image",
          description:
            "Provide a response with a support image and url or cite references",
          parameters: {
            type: "object",
            properties: {
              response: { type: "string" },
              references: {
                type: "array",
                items: {
                  type: "string",
                  description: "References of the content",
                },
              },
              support_images: {
                type: "array",
                items: {
                  type: "string",
                  description: "URL of the image",
                },
                description:
                  "Array of image URLs. Can contain multiple images.",
              },
            },
            required: ["response"],
          },
        },
      ],
      function_call: { name: "give_answer_with_image" },
    });

    const parsedResponse = JSON.parse(
      completion.choices[0].message.function_call.arguments
    );
    console.log(parsedResponse);
    console.log(parsedResponse.response);

    if (!parsedResponse.response) {
      throw new Error(
        "Parsed response is missing the required `response` field."
      );
    }
    // Add the message and response to the session chat
    await Session.updateOne(
      { _id: session._id },
      {
        $push: {
          chat: {
            message,
            response: parsedResponse.response,
            support_images: parsedResponse.support_images,
            references: parsedResponse.references,
          },
        },
      }
    );
    await session.save();

    // Return the response
    res.json({
      response: parsedResponse.response,
      img_url: parsedResponse.support_images,
      references: parsedResponse.references,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    return new errorHandler(500, "Internal server error");
  }
};

const checkRunStatus = async (session, run, maxAttempts = 30) => {
  let attempts = 0;
  while (attempts < maxAttempts) {
    const runResults = await openai.beta.threads.runs.retrieve(
      session.threadID,
      run.id
    );
    if (runResults.status === "completed" || runResults.status === "failed") {
      return runResults;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
    attempts++;
  }
  throw new Error("Run timed out");
};
