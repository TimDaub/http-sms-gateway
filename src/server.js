// @format
require("dotenv").config();
const express = require("express");
const compression = require("compression");

const apiV1 = require("./api/v1.js");

const { SERVER_PORT } = process.env;
const app = express();

app.use(express.json());
app.use("/api/v1", apiV1);
app.use(compression());

app.listen(SERVER_PORT, () => {
  console.info(`Server started at port: ${SERVER_PORT}`);
});

module.exports = app;
