// @format
const express = require("express");
const sqlite = require("better-sqlite3");

const { store } = require("../controllers/db.js");
const { genHash } = require("../util.js");

const v1 = express.Router();

v1.post("/sms", (req, res) => {
  // TODO: How can we avoid passing unsanitized text and receiver to shell?
  // Consider using: express-sanitize-input
  if (req.body.receiver && req.body.text) {
    const id = genHash(`${req.body.receiver}:${req.body.text}`);
    const msg = {
      receiver: req.body.receiver,
      text: req.body.text,
      id,
      status: "SCHEDULED"
    };

    store(msg);
    res.status(202).send({
      id,
      status: "SCHEDULED"
    });
  } else {
    res.status(400).send({
      message: `"receiver" and "text" need to be present in request body.`
    });
  }
});

module.exports = v1;
