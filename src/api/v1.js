// @format
const express = require("express");
const sqlite = require("better-sqlite3");
const { body, validationResult, query, param } = require("express-validator");
const isgsm7 = require("isgsm7");
const { v4: uuidv4 } = require("uuid");
const createError = require("http-errors");
const parsePhoneNumber = require("libphonenumber-js/min");

const { possibleEvents } = require("../constants.js");
const logger = require("../logger.js");
const { outgoing, incoming, webhooks } = require("../controllers/db.js");
const { COUNTRY_OF_OPERATION } = process.env;
logger.info(`Country of operation is: ${COUNTRY_OF_OPERATION}`);

const v1 = express.Router();
const numberError = new Error(
  "Invalid mobile phone number (e.g. wrong country)"
);

v1.post(
  "/outgoing",
  body("receiver").custom(value => {
    if (!parsePhoneNumber(value, COUNTRY_OF_OPERATION).isPossible()) {
      throw numberError;
    }
    return true;
  }),
  body("text").custom(value => {
    if (!isgsm7(value)) {
      throw new Error("text must be encoded as GSM 7-bit");
    }
    return true;
  }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.error("Body is malformed", errors.array());
      return next(createError(400, "Body is malformed"), errors.array());
    }

    const receiver = parsePhoneNumber(req.body.receiver, COUNTRY_OF_OPERATION);
    const id = uuidv4();
    const msg = {
      receiver: receiver.number,
      text: req.body.text,
      id,
      status: "SCHEDULED"
    };

    outgoing.store(msg);
    res.status(202).send({
      id,
      status: "SCHEDULED"
    });
  }
);

v1.get(
  "/incoming",
  query("sender").custom(value => {
    if (!parsePhoneNumber(value, COUNTRY_OF_OPERATION).isPossible()) {
      throw numberError;
    }
    return true;
  }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(
        createError(
          400,
          "Malformed query parameters. Make sure to use encodeURIComponent on phone numbers."
        ),
        errors.array()
      );
    }
    const sender = parsePhoneNumber(req.query.sender, COUNTRY_OF_OPERATION);
    const messages = incoming.list(sender.number);
    res.status(200).send(messages);
  }
);

v1.delete("/webhooks/:id", param("id").isUUID(), (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const msg = "id needs to be valid uuid";
    logger.error(msg, errors.array());
    return next(createError(400, msg), errors.array());
  }

  try {
    webhooks.remove(req.params.id);
  } catch (err) {
    logger.error(err.message);
    return next(createError(404, err.message));
  }
  res.status(200).send();
});

v1.post(
  "/webhooks",
  body("url").isURL({ protocols: ["http", "https"] }),
  body("secret").isLength({ min: 10, max: 64 }),
  body("event").isIn(possibleEvents),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.error("Body is malformed", errors.array());
      return next(createError(400, "Body is malformed"), errors.array());
    }

    const webhook = {
      id: uuidv4(),
      url: req.body.url,
      secret: req.body.secret,
      event: req.body.event
    };

    webhooks.store(webhook);
    res.status(201).send(webhook);
  }
);

module.exports = v1;
