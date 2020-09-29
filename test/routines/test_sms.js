// @format
const test = require("ava").serial;
const path = require("path");
const sqlite = require("better-sqlite3");

const SMSHandler = require("../../src/controllers/sms.js");
const WebhookCtrl = require("../../src/controllers/webhooks.js");
const { init, dump, webhooks } = require("../../src/controllers/db.js");
const smsRoutine = require("../../src/routines/sms.js");

const { DB_PATH, SQLITE_SCHEMA_PATH } = process.env;
const sqlConfig = {
  path: path.resolve(__dirname, `../../${DB_PATH}`),
  schema: path.resolve(__dirname, `../../${SQLITE_SCHEMA_PATH}`),
  options: {
    verbose: console.info
  }
};

const teardown = () => {
  dump();
};

test("if storeWithId supplies a + to an international number", async t => {
  init();
  const wh = {
    id: "abc",
    url: "http://example.com",
    secret: "aaaaaaaaaa",
    event: "incomingMessage"
  };
  webhooks.store(wh);

  let smsHandler;
  try {
    smsHandler = new SMSHandler({});
  } catch (err) {
    // NOTE: We assume a throw here as tests shouldn't require a live device.
  }
  const expected = {
    sender: "0123456789",
    message: "this is an sms",
    index: 0,
    dateTimeSent: new Date(),
    dateTimeCreated: new Date()
  };
  smsRoutine.storeWithId(expected);

  const db = sqlite(sqlConfig.path, sqlConfig.options);
  const evt = db.prepare("SELECT * from events").get();
  const msg = JSON.parse(evt.message);
  t.assert(msg.sender === `+${expected.sender}`);

  t.teardown(teardown);
});
