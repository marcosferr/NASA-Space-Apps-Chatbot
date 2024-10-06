const openai = require("../utils/openai");
const { PassThrough } = require("stream");

exports.ttsHandler = async (req, res) => {
  const { message, lang = "en" } = req.body;
  console.log(message);
  try {
    // Call OpenAI TTS API
    const ttsResponse = await openai.audio.speech.create({
      input: message,
      model: "tts-1",
      voice: "alloy",
      speed: 1,
      response_format: "mp3",
    });
    console.log(ttsResponse);

    // Read the stream and convert it to a buffer
    const audioBuffer = await streamToBuffer(ttsResponse.body);

    // Send the MP3 file as a response
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Disposition", 'attachment; filename="speech.mp3"');
    res.send(audioBuffer);
  } catch (error) {
    console.error("Error generating TTS:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

// Helper function to convert stream to buffer
const streamToBuffer = (stream) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", (err) => reject(err));
  });
};
