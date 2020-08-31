// @format
const express = require("express");

const v1 = express.Router();

v1.get("/", (req, res) => {
  res.json({ hello: "world" });
});

module.exports = v1;
