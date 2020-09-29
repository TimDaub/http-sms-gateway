// @format
const crypto = require("crypto");
const { SqliteError } = require("better-sqlite3");

const logger = require("../logger.js");
const SMSHandler = require("../controllers/sms.js");
const { sms: smsOptions } = require("../options.js");
const { incoming, outgoing } = require("../controllers/db.js");
const WebhookHandler = require("../controllers/webhooks.js");

function storeWithId(msg) {
  // NOTE: By using content-addressed identification, we make sure to not
  // store any duplicates in our database. Note that we've intentionally left
  // out index, as it could change when we call `deleteMessage`.
  const { sender, message, dateTimeSent } = msg;
  const content = `${sender}-${message}-${dateTimeSent.toISOString()}`;
  const id = crypto
    .createHash("sha256")
    .update(content)
    .digest("hex");
  msg = { ...msg, id };

  try {
    incoming.store(msg);
  } catch (err) {
    if (
      err instanceof SqliteError &&
      err.message.includes("UNIQUE constraint failed")
    ) {
      logger.warn(`Skipping to store message with id (duplicate): ${id}`);
      return;
    } else {
      throw err;
    }
  }
  const webhooks = new WebhookHandler();
  delete msg.index;
  delete msg.dateTimeCreated;

  // NOTE: A webhook receiver is likely to expect a valid phone number with a
  // location code starting with a `+`. However, serialport-gsm does only give
  // us a number without a `+` in many cases. Which is why we supply one here
  // when necessary.
  if (!msg.sender.includes("+")) {
    msg.sender = `+${msg.sender}`;
  }
  webhooks.addEvent("incomingMessage", msg);
}

function launch() {
  const sms = new SMSHandler(smsOptions);

  sms.on("open", () => {
    setInterval(sms.sendAll, 1000);
    setInterval(sms.receiveAll, 1000);
  });

  sms.on("progress", ({ id, response }) => outgoing.updateStatus(id, response));
  sms.on("error", ({ id, response }) => outgoing.updateStatus(id, response));

  sms.on("message", storeWithId);
}

module.exports = { launch, storeWithId };
