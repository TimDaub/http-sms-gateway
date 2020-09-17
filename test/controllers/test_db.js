// @format
const path = require("path");
const src = "../../src";
require("dotenv").config({ path: path.resolve(src, `.env`) });
const test = require("ava").serial;
const { existsSync, unlinkSync } = require("fs");
const sqlite = require("better-sqlite3");

const {
  init,
  outgoing,
  incoming,
  webhooks
} = require(`${src}/controllers/db.js`);
const { DB_PATH, SQLITE_SCHEMA_PATH } = process.env;

const sqlConfig = {
  path: path.resolve(__dirname, `../../${DB_PATH}`),
  schema: path.resolve(__dirname, `../../${SQLITE_SCHEMA_PATH}`),
  options: {
    verbose: console.info
  }
};

const teardown = () => {
  unlinkSync(sqlConfig.path);
};

test("if init function creates db schema", t => {
  init();
  t.assert(existsSync(sqlConfig.path));
  const db = sqlite(sqlConfig.path, sqlConfig.options);
  const tableName = "outgoing";
  const table = db
    .prepare(`SELECT name FROM sqlite_master WHERE name= ?`)
    .get(tableName);
  t.assert(table.name === tableName);

  t.teardown(teardown);
});

test("if init function skips schema creation when one already exists", t => {
  init();
  init();
  t.assert(true);
  t.teardown(teardown);
});

test("if function stores data in sqlite database", t => {
  init();
  const expected = {
    id: "abc",
    receiver: "1234",
    text: "hello",
    status: "SCHEDULED"
  };
  outgoing.store(expected);
  const db = sqlite(sqlConfig.path, sqlConfig.options);
  const message = db
    .prepare(`SELECT * FROM outgoing WHERE id = ?`)
    .get(expected.id);
  t.deepEqual(expected, message);
  t.teardown(teardown);
});

test("if function returns all message of a status", t => {
  init();
  const expected = {
    id: "abc",
    receiver: "1234",
    text: "hello",
    status: "SCHEDULED"
  };
  outgoing.store(expected);
  const [msg] = outgoing.getAllMessages("SCHEDULED");
  t.deepEqual(expected, msg);
  t.teardown(teardown);
});

test("if function updates status in db", t => {
  init();
  const expected = {
    id: "abc",
    receiver: "1234",
    text: "hello",
    status: "SCHEDULED"
  };
  outgoing.store(expected);

  outgoing.updateStatus(expected.id, "lol");
  const [msg] = outgoing.getAllMessages("lol");
  t.deepEqual({ ...expected, status: "lol" }, msg);
  t.teardown(teardown);
});

test("if store stores incoming message", t => {
  init();
  const expected = {
    id: "abc",
    sender: "1234",
    message: "hello",
    dateTimeSent: new Date()
  };

  incoming.store(expected);
  const db = sqlite(sqlConfig.path, sqlConfig.options);
  const message = db
    .prepare(`SELECT * FROM incoming WHERE id = ?`)
    .get(expected.id);
  // NOTE: serialport-gsm reports back with a property `message`, however our
  // property for the messages content is called `text`
  t.assert(expected.id === message.id);
  t.assert(expected.sender === message.sender);
  t.assert(expected.message === message.text);
  t.assert(expected.dateTimeSent === message.dateTimeSent);
  t.assert(message.dateTimeCreated);
  t.teardown(teardown);
});

test("if list returns filtered list of incoming messages", t => {
  init();
  const expected = {
    id: "abc",
    sender: "1234",
    message: "hello",
    dateTimeSent: new Date()
  };
  const unexpected = {
    id: "cba",
    sender: "4321",
    message: "hello",
    dateTimeSent: new Date()
  };
  incoming.store(expected);
  incoming.store(unexpected);
  const msgs = incoming.list(expected.sender);
  t.assert(expected.id === msgs[0].id);
  t.assert(expected.sender === msgs[0].sender);
  t.assert(expected.message === msgs[0].text);
  t.assert(expected.dateTimeSent === msgs[0].dateTimeSent);
  t.assert(msgs[0].dateTimeCreated);
  t.teardown(teardown);
});

test("if webhooks store creates data in database", t => {
  init();
  const expected = {
    id: "abc",
    url: "http://example.com",
    secret: "aaaaaaaaaa",
    event: "incomingMessage"
  };
  webhooks.store(expected);
  const db = sqlite(sqlConfig.path, sqlConfig.options);
  const webhook = db
    .prepare(`SELECT * FROM webhooks WHERE id = ?`)
    .get(expected.id);
  t.deepEqual(expected, webhook);
  t.teardown(teardown);
});
