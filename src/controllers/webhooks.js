// @format
const { EventEmitter } = require("events");
const { v4: uuidv4 } = require("uuid");
const fetch = require("cross-fetch");
const crypto = require("crypto");
const AbortController = require("abort-controller");

const logger = require("../logger.js");
const db = require("./db.js");
const { possibleEvents, timeout } = require("../constants.js");

class WebhookHandler extends EventEmitter {
  constructor() {
    super();

    this.send = this.send.bind(this);
    this.sendAll = this.sendAll.bind(this);
    this.addEvent = this.addEvent.bind(this);
  }

  addEvent(name, msg) {
    if (!possibleEvents.includes(name)) {
      throw new Error(
        `parameter 'name' (${name}) needs to be one of: ${possibleEvents.join(
          ","
        )}`
      );
    }

    const evt = {
      name,
      message: JSON.stringify(msg),
      trys: 0,
      lastTry: new Date().toISOString()
    };

    // NOTE: We create a new event for each webhook.
    db.webhooks
      .list(name)
      .forEach(({ id }) =>
        db.events.store({ ...evt, webhookId: id, id: uuidv4() })
      );
  }

  async sendAll() {
    db.events.decayedList().map(this.send);
  }

  async send(evt) {
    const sig = crypto
      .createHmac("sha256", evt.secret)
      .update(evt.message)
      .digest("hex");

    const controller = new AbortController();
    const { signal } = controller;
    signal.addEventListener("abort", () => {
      // NOTE: This error will be caught within fetch's try catch block.
      throw new Error("Webhook delivery aborted; timeout");
    });

    let res, error;
    try {
      setTimeout(() => controller.abort(), timeout);

      logger.info(
        `Requesting POST ${evt.url} to deliver webhook message ${JSON.stringify(
          evt.message
        )}`
      );
      res = await fetch(evt.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-SMS-GATEWAY-Signature": sig
        },
        body: evt.message,
        signal
      });
    } catch (err) {
      logger.error(
        `Looks like the server wasn't responding. Hit error when delivering webhook with id: ${
          evt.id
        } and error msg: ${err.message} and result ${JSON.stringify(res)}`
      );
      db.events.updateTrys(evt.id);
      return;
    }

    if (res.status === 200) {
      logger.info(`Successful webhook delivery for event with id: ${evt.id}`);
      db.events.remove(evt.id);
    } else {
      logger.info(
        `Failed webhook delivery for event with id: ${evt.id} and status ${
          res.status
        }`
      );
      db.events.updateTrys(evt.id);
    }
  }
}

module.exports = WebhookHandler;
