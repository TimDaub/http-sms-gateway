// @format
const test = require("ava").serial;
const rewire = require("rewire");
const { EventEmitter } = require("events");

const tasks = rewire("../../src/controllers/tasks.js");
const { init, store, dump } = require("../../src/controllers/db.js");

const teardown = () => {
  dump();
};

test("if sms is sent and output is returned", async t => {
  init();

  let modem = tasks.__get__("modem");
  modem.sendSMS = (receiver, text, alert, cb) => cb({ status: "success" });
  tasks.__set__("modem", modem);
  modem.emit("open");
  const emitter = new EventEmitter();
  const promise = new Promise(resolve => {
    emitter.on("partial_progress_outgoing", res => {
      resolve(true);
    });
  });
  tasks.__set__("emitter", emitter);

  const output = tasks.send({
    receiver: "0152901820",
    text: "this is a text",
    id: "abc"
  });

  t.assert(await promise);
  t.teardown(teardown);
});

test("if sms errors, error is sent", async t => {
  init();

  let modem = tasks.__get__("modem");
  modem.sendSMS = (receiver, text, alert, cb) => cb({ status: "fail" });
  tasks.__set__("modem", modem);
  modem.emit("open");
  const emitter = new EventEmitter();
  const promise = new Promise((resolve, reject) => {
    emitter.on("error", res => {
      resolve(true);
    });
  });
  tasks.__set__("emitter", emitter);

  const output = tasks.send({
    receiver: "0152901820",
    text: "this is a text",
    id: "abc"
  });

  t.assert(await promise);
  t.teardown(teardown);
});

test("if messages from db get sent", async t => {
  init();

  store({ id: "abc", receiver: "123", text: "ein test", status: "SCHEDULED" });

  let modem = tasks.__get__("modem");
  modem.sendSMS = (receiver, text, alert, cb) =>
    cb({ status: "success", data: { response: "message sent successfully" } });
  tasks.__set__("modem", modem);
  modem.emit("open");
  const emitter = tasks.__get__("emitter");
  const promise = new Promise(resolve => {
    emitter.on("done_outgoing", res => {
      resolve(true);
    });
  });
  emitter.emit("process_outgoing");
  tasks.__set__("emitter", emitter);

  t.assert(await promise);
  t.teardown(teardown);
});
