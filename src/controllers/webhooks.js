// @format
const { EventEmitter } = require("events");
const { v4: uuidv4 } = require("uuid");

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
    console.log("bla");
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

  sendAll() {
    db.events.decayedList().map(this.send);
  }

  send(evt) {
    console.log(evt);
  }
}

module.exports = WebhookHandler;
