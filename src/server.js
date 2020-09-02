// @format
require("dotenv").config();
const express = require("express");
const compression = require("compression");
const bearerToken = require("express-bearer-token");

const apiV1 = require("./api/v1.js");
const { getEventEmitter } = require("./controllers/tasks.js");

const { SERVER_PORT, BEARER_TOKEN } = process.env;
const app = express();
const tasks = getEventEmitter();

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

setInterval(() => tasks.emit("process_outgoing"), 1000);

app.listen(SERVER_PORT, () => {
  console.info(`Server started at port: ${SERVER_PORT}`);
});

module.exports = app;
