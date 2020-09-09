// @format
require("dotenv").config();
const express = require("express");
const compression = require("compression");
const bearerToken = require("express-bearer-token");
const createError = require("http-errors");

const apiV1 = require("./api/v1.js");
const SMSHandler = require("./controllers/sms.js");
const smsOptions = require("./options.js");
const { updateStatus } = require("./controllers/db.js");

const { NODE_ENV, SERVER_PORT, BEARER_TOKEN } = process.env;
const app = express();

const tokenAuth = (req, res, next) => {
  if (req.token === BEARER_TOKEN) {
    next();
  } else {
    return next(createError(401, "Authorization header is missing or invalid"));
  }
};

app.use(bearerToken());
app.use(tokenAuth);
app.use(express.json());
app.use("/api/v1", apiV1);
app.use(compression());

if (NODE_ENV !== "test") {
  const sms = new SMSHandler(smsOptions);
  sms.on("progress", ({ id, response }) => updateStatus(id, response));
  setInterval(sms.sendAll, 1000);
}

app.listen(SERVER_PORT, () => {
  console.info(`Server started at port: ${SERVER_PORT}`);
});

module.exports = app;
