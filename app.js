const express = require("express");
const cookieParser = require("cookie-parser");
//Config dotenv
const dotenv = require("dotenv");
dotenv.config({ path: "./config/config.env" });
require("./config/mongoose.config");

const ErrorHandler = require("./utils/errorHandler");
const app = express();
// Body parser
app.use(express.json());
app.use(cookieParser());
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const xssClean = require("xss-clean");
const cors = require("cors");
const errorMiddleware = require("./middlewares/errors");
//Setting up CORS
if (process.env.NODE_ENV === "production") {
  app.use(
    cors({
      origin: function (origin, callback) {
        if (
          origin === "http://marcosferr.tech" ||
          origin === "https://marcosferr.tech"
        ) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
    })
  );
} else {
  app.use(cors());
}
//Preventing XSS attacks
app.use(xssClean());
//Setting up security headers
app.use(helmet());
//Setting up rate limiter
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, //10 mins
  max: 15, //15 requests
});
app.use(limiter);
const sessionRoutes = require("./routes/session.routes");
app.use("/api/v1/", sessionRoutes);

//use error handle
app.use(errorMiddleware);
app.all("*", (req, res, next) => {
  next(new ErrorHandler(404, `${req.originalUrl} route not found`));
});

module.exports = app;
