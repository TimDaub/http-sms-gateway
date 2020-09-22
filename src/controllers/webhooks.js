// @format
const { EventEmitter } = require("events");
const { v4: uuidv4 } = require("uuid");
const fetch = require("cross-fetch");
const crypto = require("crypto");

const logger = require("../logger.js");
const db = require("./db.js");
const { possibleEvents } = require("../constants.js");

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

    const res = await fetch(evt.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-SMS-GATEWAY-Signature": sig
      },
      body: evt.message
    });

    if (res.status === 200) {
      logger.info(`Successful webhook delivery for event with id: ${evt.id}`);
      db.events.remove(evt.id);
    } else {
      logger.info(`Failed webhook delivery for event with id: ${evt.id}`);
      db.events.updateTrys(evt.id);
    }
  }
}

module.exports = WebhookHandler;
