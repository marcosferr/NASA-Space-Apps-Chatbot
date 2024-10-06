const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: true,
    },
    response: {
      type: String,
      required: true,
    },
    support_images: {
      type: Array,
      required: false,
    },
    references: {
      type: Array,
      required: false,
    },
    followup_questions: {
      type: Array,
      required: false,
    },
  },
  { _id: false }
);

const sessionSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
    },
    threadID: {
      type: String,
    },
    chat: {
      type: [chatSchema],
      default: [],
    },
    userAgent: {
      type: String,
      required: false,
    },
  },
  { timestamps: true }
);

const Session = mongoose.model("Session", sessionSchema);

module.exports = Session;
