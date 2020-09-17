// @format
require("dotenv").config();
const express = require("express");
const compression = require("compression");
const bearerToken = require("express-bearer-token");
const createError = require("http-errors");
const expressPino = require("express-pino-logger");

const logger = require("./logger.js");
const apiV1 = require("./api/v1.js");
const smsRoutine = require("./routines/sms.js");

const { NODE_ENV, SERVER_PORT, BEARER_TOKEN } = process.env;
const app = express();
const expressLogger = expressPino({ logger });

const tokenAuth = (req, res, next) => {
  if (req.token === BEARER_TOKEN) {
    next();
  } else {
    return next(createError(401, "Authorization header is missing or invalid"));
  }
};

app.use(expressLogger);
app.use(bearerToken());
app.use(tokenAuth);
app.use(express.json());
app.use("/api/v1", apiV1);
app.use(compression());

if (NODE_ENV !== "test") {
  smsRoutine.launch();
}

app.listen(SERVER_PORT, () => {
  logger.info(`Server started at port: ${SERVER_PORT}`);
});

module.exports = app;
