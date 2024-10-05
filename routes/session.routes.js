const route = require("express").Router();
const sessionController = require("../controllers/session.controller");

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

module.exports = route;
