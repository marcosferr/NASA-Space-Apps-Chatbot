const route = require("express").Router();
const sessionController = require("../controllers/session.controller");
const ttsController = require("../controllers/tts.controller");
if (process.env.NODE_ENV === "development") {
  route.get("/", sessionController.sessionHandler, (req, res) => {
    res.json({ session: req.session });
  });
}

route.post(
  "/messages",
  sessionController.sessionHandler,
  sessionController.newMessage
);

route.post("/tts", ttsController.ttsHandler);

module.exports = route;
