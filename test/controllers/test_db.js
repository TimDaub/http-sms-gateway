// @format
const path = require("path");
const src = "../../src";
require("dotenv").config({ path: path.resolve(src, `.env`) });
const test = require("ava").serial;
const { existsSync, unlinkSync } = require("fs");
const sqlite = require("better-sqlite3");
const sub = require("date-fns/sub");
const add = require("date-fns/add");

const {
  init,
  outgoing,
  incoming,
  webhooks,
  events
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

test("if event store creates data in database", t => {
  init();
  const wh = {
    id: "abc",
    url: "http://example.com",
    secret: "aaaaaaaaaa",
    event: "incomingMessage"
  };
  webhooks.store(wh);
  const expected = {
    id: "abc",
    name: "incomingMessage",
    message: '{"hello": "world"}',
    trys: 0,
    lastTry: new Date().toISOString(),
    webhookId: wh.id
  };
  events.store(expected);
  const db = sqlite(sqlConfig.path, sqlConfig.options);
  const evt = db.prepare(`SELECT * FROM events WHERE id = ?`).get(expected.id);
  t.assert(expected.id === evt.id);
  t.assert(expected.name === evt.name);
  t.assert(expected.message === evt.message);
  t.assert(expected.trys === evt.trys);
  t.assert(expected.lastTry === evt.lastTry);
  t.assert(expected.webhookId === evt.webhookId);
  t.assert(evt.dateTimeCreated);
  t.teardown(teardown);
});

test("if messages are indeed popped when popAllMessages is called", t => {
  init();
  const expected = [
    {
      id: "abc",
      receiver: "1234",
      text: "hello",
      status: "SCHEDULED"
    },
    {
      id: "cba",
      receiver: "4321",
      text: "olleh",
      status: "SCHEDULED"
    }
  ];
  outgoing.store(expected[0]);
  outgoing.store(expected[1]);

  const messages = outgoing.popAllMessages("SCHEDULED");
  t.assert(messages.length === 2);
  const expectedEmpty = outgoing.getAllMessages("SCHEDULED");
  t.assert(expectedEmpty.length === 0);
  t.teardown(teardown);
});

test.skip("sqlite capabilities", t => {
  init();
  const db = sqlite(sqlConfig.path, sqlConfig.options);
  let res = db
    .prepare("SELECT datetime('now') == datetime('now') as val")
    .get();
  t.assert(res.val === 1);

  res = db
    .prepare("SELECT datetime('now') == datetime('now', '-1 minutes') as val")
    .get();
  t.assert(res.val === 0);
  db.exec("CREATE TABLE test (id TEXT NOT NULL, testval TEXT NOT NULL)");
  const date = new Date().toISOString();
  const obj = {
    date: new Date().toISOString(),
    id: "hello"
  };
  db.prepare("INSERT INTO test (id, testval) VALUES (@id, @date)").run(obj);
  res = db
    .prepare("SELECT * FROM test WHERE datetime(?) = datetime(testval)")
    .all(obj.date);
  t.assert(res[0].id === obj.id);

  const objPast = {
    date: sub(new Date(), { minutes: 1 }).toISOString(),
    id: "hello2"
  };
  const objFuture = {
    date: add(new Date(), { minutes: 1 }).toISOString(),
    id: "hello3"
  };
  db.prepare("INSERT INTO test (id, testval) VALUES (@id, @date)").run(objPast);
  db.prepare("INSERT INTO test (id, testval) VALUES (@id, @date)").run(
    objFuture
  );

  // NOTE: Only select entries where their testval is in the past
  res = db
    .prepare("SELECT * FROM test WHERE datetime('now') > datetime(testval)")
    .all();
  t.assert(res[0].id === objPast.id);
  t.assert(res.length === 1);
  // NOTE: Only select entries where their testval is in the future
  res = db
    .prepare("SELECT * FROM test WHERE datetime('now') < datetime(testval)")
    .all();
  t.assert(res[0].id === objFuture.id);
  t.assert(res.length === 1);

  res = db
    .prepare(
      "SELECT * FROM test WHERE datetime('now') < (SELECT datetime(testval) FROM test WHERE )"
    )
    .all();
  t.assert(res[0].id === objFuture.id);
  t.assert(res.length === 1);

  t.teardown(teardown);
});

test("if events returns all events in database", t => {
  init();
  const wh = {
    id: "whid",
    url: "http://example.com",
    secret: "aaaaaaaaaa",
    event: "incomingMessage"
  };
  webhooks.store(wh);
  const expected = [
    {
      id: "first",
      name: "incomingMessage",
      message: '{"hello": "world"}',
      trys: 0,
      lastTry: new Date().toISOString(),
      webhookId: wh.id
    },
    {
      id: "skip",
      name: "incomingMessage",
      message: '{"world": "hello"}',
      trys: 1,
      lastTry: new Date().toISOString(),
      webhookId: wh.id
    },
    {
      id: "skip3",
      name: "incomingMessage",
      message: '{"world": "hello"}',
      trys: 11,
      lastTry: new Date().toISOString(),
      webhookId: wh.id
    },
    {
      id: "second",
      name: "incomingMessage",
      message: '{"world": "hello"}',
      trys: 1,
      lastTry: sub(new Date(), { minutes: 10 }).toISOString(),
      webhookId: wh.id
    },
    {
      id: "skip2",
      name: "incomingMessage",
      message: '{"world": "hello"}',
      trys: 2,
      lastTry: sub(new Date(), { minutes: 2 }).toISOString(),
      webhookId: wh.id
    },
    {
      id: "skip4",
      name: "incomingMessage",
      message: '{"world": "hello"}',
      trys: 2,
      lastTry: sub(new Date(), { minutes: 3 }).toISOString(),
      webhookId: wh.id
    },
    {
      id: "third",
      name: "incomingMessage",
      message: '{"world": "hello"}',
      trys: 2,
      lastTry: sub(new Date(), { minutes: 4 }).toISOString(),
      webhookId: wh.id
    },
    {
      id: "forth",
      name: "incomingMessage",
      message: '{"world": "hello"}',
      trys: 2,
      lastTry: sub(new Date(), { minutes: 60 }).toISOString(),
      webhookId: wh.id
    },
    {
      id: "skip5",
      name: "incomingMessage",
      message: '{"world": "hello"}',
      trys: 3,
      lastTry: sub(new Date(), { minutes: 7 }).toISOString(),
      webhookId: wh.id
    },
    {
      id: "fifth",
      name: "incomingMessage",
      message: '{"world": "hello"}',
      trys: 3,
      lastTry: sub(new Date(), { minutes: 8 }).toISOString(),
      webhookId: wh.id
    }
  ];
  expected.map(events.store);

  const db = sqlite(sqlConfig.path, sqlConfig.options);
  const dbEvents = events.decayedList();
  t.assert(dbEvents[0].id === expected[0].id);
  t.assert(dbEvents[1].id === expected[3].id);
  t.assert(dbEvents[2].id === expected[6].id);
  t.assert(dbEvents[3].id === expected[7].id);
  t.assert(dbEvents[4].id === expected[9].id);
  dbEvents.forEach(({ url }) => t.assert(url, wh.url));
  t.teardown(teardown);
});

test("if db ctrl returns all webhooks of a specific event", t => {
  init();
  const expected = {
    id: "abc",
    url: "http://example.com",
    secret: "aaaaaaaaaa",
    event: "incomingMessage"
  };
  webhooks.store(expected);
  const res = webhooks.list(expected.event);
  t.deepEqual([expected], res);

  t.teardown(teardown);
});

test("if db deletes event with id", t => {
  init();
  const wh = {
    id: "abc",
    url: "http://example.com",
    secret: "aaaaaaaaaa",
    event: "incomingMessage"
  };
  webhooks.store(wh);
  const expected = {
    id: "abc",
    name: "incomingMessage",
    message: '{"hello": "world"}',
    trys: 0,
    lastTry: new Date().toISOString(),
    webhookId: wh.id
  };
  events.store(expected);
  const db = sqlite(sqlConfig.path, sqlConfig.options);
  const evt = db.prepare(`SELECT * FROM events WHERE id = ?`).get(expected.id);

  events.remove(expected.id);
  const empty = db
    .prepare(`SELECT * FROM events WHERE id = ?`)
    .get(expected.id);
  t.assert(!empty);

  t.teardown(teardown);
});

test("if for an event, trys are updated", t => {
  init();
  const wh = {
    id: "abc",
    url: "http://example.com",
    secret: "aaaaaaaaaa",
    event: "incomingMessage"
  };
  webhooks.store(wh);
  const expected = {
    id: "abc",
    name: "incomingMessage",
    message: '{"hello": "world"}',
    trys: 0,
    lastTry: new Date().toISOString(),
    webhookId: wh.id
  };
  events.store(expected);
  const db = sqlite(sqlConfig.path, sqlConfig.options);
  const evt = db.prepare(`SELECT * FROM events WHERE id = ?`).get(expected.id);

  events.updateTrys(evt.id);
  const updatedEvt = db
    .prepare(`SELECT * FROM events WHERE id = ?`)
    .get(expected.id);
  t.assert(expected.trys + 1 === updatedEvt.trys);
  t.assert(
    new Date(expected.lastTry).getTime() <
      new Date(updatedEvt.lastTry).getTime()
  );

  t.teardown(teardown);
});
