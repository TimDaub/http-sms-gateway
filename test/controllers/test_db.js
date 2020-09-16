// @format
const path = require("path");
const src = "../../src";
require("dotenv").config({ path: path.resolve(src, `.env`) });
const test = require("ava").serial;
const { existsSync, unlinkSync } = require("fs");
const sqlite = require("better-sqlite3");

const { init, outgoing, incoming } = require(`${src}/controllers/db.js`);
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
    dateTimeSent: new Date().toISOString()
  };

  incoming.store(expected);
  const db = sqlite(sqlConfig.path, sqlConfig.options);
  const message = db
    .prepare(`SELECT * FROM incoming WHERE id = ?`)
    .get(expected.id);
  // NOTE: serialport-gsm reports back with a property `message`, however our
  // property for the messages content is called `text`
  t.deepEqual(
    {
      id: expected.id,
      sender: expected.sender,
      text: expected.message,
      dateTimeSent: expected.dateTimeSent
    },
    message
  );
  t.teardown(teardown);
});
