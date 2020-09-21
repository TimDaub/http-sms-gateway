// @format
const crypto = require("crypto");
const { SqliteError } = require("better-sqlite3");

const logger = require("../logger.js");
const SMSHandler = require("../controllers/sms.js");
const { sms: smsOptions } = require("../options.js");
const { incoming, outgoing } = require("../controllers/db.js");

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
  console.log(id);

  try {
    incoming.store({ ...msg, id });
  } catch (err) {
    if (
      err instanceof SqliteError &&
      err.message.includes("UNIQUE constraint failed")
    ) {
      logger.warn(`Skipping to store message with id (duplicate): ${id}`);
    } else {
      throw err;
    }
  }
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
