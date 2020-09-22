// @format
const { EventEmitter } = require("events");
const { v4: uuidv4 } = require("uuid");

const db = require("./db.js");
const { possibleEvents } = require("../constants.js");

class WebhookHandler extends EventEmitter {
  constructor() {
    super();
  }

  addEvent(name, msg) {
    if (!possibleEvents.includes(name)) {
      throw new Error(
        `parameter 'name' (${name}) needs to be one of: ${possibleEvents.join(
          ","
        )}`
      );

      const id = uuidv4();
      const evt = {
        id,
        name,
        message: JSON.stringify(msg)
      };
      db.events.store(evt);
    }
  }

  sendAll() {
    const events = db.events.list();
  }
}

module.exports = WebhookHandler;
