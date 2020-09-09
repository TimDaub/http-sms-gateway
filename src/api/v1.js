// @format
const express = require("express");
const sqlite = require("better-sqlite3");
const { body, validationResult } = require("express-validator");
const isgsm7 = require("isgsm7");
const { v4: uuidv4 } = require("uuid");
const createError = require("http-errors");

const { store } = require("../controllers/db.js");

const v1 = express.Router();

v1.post(
  "/sms",
  body("receiver").isMobilePhone(),
  body("text").custom(value => {
    if (!isgsm7(value)) {
      throw new Error("text must be encoded as GSM 7-bit");
    }
    return true;
  }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(createError(400, "Body is malformed"), errors.array());
    }

    const id = uuidv4();
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
  }
);

module.exports = v1;
