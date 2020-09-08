// @format
require("dotenv").config();
const express = require("express");
const compression = require("compression");
const bearerToken = require("express-bearer-token");

const apiV1 = require("./api/v1.js");

const { NODE_ENV, SERVER_PORT, BEARER_TOKEN } = process.env;
const app = express();

const tokenAuth = (req, res, next) => {
  if (req.token === BEARER_TOKEN) {
    next();
  } else {
    res.status(401).send();
  }
};

app.use(bearerToken());
app.use(tokenAuth);
app.use(express.json());
app.use("/api/v1", apiV1);
app.use(compression());

if (NODE_ENV !== "test") {
  const { getEventEmitter } = require("./controllers/sms.js");
  const sms = getEventEmitter();
  setInterval(() => sms.emit("process_outgoing"), 1000);
}

app.listen(SERVER_PORT, () => {
  console.info(`Server started at port: ${SERVER_PORT}`);
});

module.exports = app;
