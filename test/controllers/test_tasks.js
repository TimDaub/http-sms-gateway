// @format
const test = require("ava").serial;
const rewire = require("rewire");
const mockSpawn = require("mock-spawn");
const { once } = require("events");

const { parseOutput } = require("../../src/controllers/tasks.js");
const tasks = rewire("../../src/controllers/tasks.js");

const { init, store, dump } = require("../../src/controllers/db.js");

const teardown = () => {
  tasks.__set__("spawn", require("child_process").spawn);
  dump();
};

test("if the output of successfully sending an sms in gammu is parsed", t => {
  const out =
    ",Sending SMS 1/1....waiting for network answer..OK, message reference=18\n,If you want break, press Ctrl+C...\n";
  const parsed = parseOutput(out);
  t.assert(parsed.state === "OK");
  t.assert(parsed.reference === "18");
});

test("if sms is sent via gammu and output is returned", async t => {
  init();
  const out =
    ",Sending SMS 1/1....waiting for network answer..OK, message reference=18\n,If you want break, press Ctrl+C...\n";

  const gammuSpawn = mockSpawn();
  gammuSpawn.setDefault(gammuSpawn.simple(0, out));
  gammuSpawn.sequence.add(gammuSpawn.simple(0, out));
  tasks.__set__("spawn", gammuSpawn);

  const output = await tasks.send({
    receiver: "0152901820",
    text: "this is a text",
    id: "abc"
  });

  const [{ state, reference }] = await once(
    tasks.getEventEmitter(),
    "partial_progress_outgoing"
  );
  t.assert(state === "OK");
  t.assert(reference === "18");

  t.teardown(teardown);
});

test("if when sms sending fails, task module sends error too", async t => {
  init();
  const out =
    ",Sending SMS 1/1....waiting for network answer..error 28, message reference=-1\nUnknown error.\n,If you want break, press Ctrl+C...\n";

  const gammuSpawn = mockSpawn();
  gammuSpawn.setDefault(gammuSpawn.simple(0, out));
  gammuSpawn.sequence.add(gammuSpawn.simple(0, out));
  tasks.__set__("spawn", gammuSpawn);

  const output = await tasks.send({
    receiver: "018",
    text: "this is a text",
    id: "abc"
  });

  const [res] = await once(tasks.getEventEmitter(), "error");
  t.assert(res.message);
  t.assert(res.output.state === "error 28");
  t.assert(res.output.reference === "-1");

  t.teardown(teardown);
});

test("to make sure gammu command is formatted correctly", async t => {
  init();
  const out =
    ",Sending SMS 1/1....waiting for network answer..OK, message reference=18\n,If you want break, press Ctrl+C...\n";
  const gammuSpawn = mockSpawn();
  gammuSpawn.setDefault(gammuSpawn.simple(0, out));
  gammuSpawn.sequence.add(gammuSpawn.simple(0, out));
  tasks.__set__("spawn", gammuSpawn);

  const receiver = "0152901820";
  const text = "hello world";
  const output = await tasks.send({
    receiver,
    text,
    id: "abc"
  });

  const call = gammuSpawn.calls[0];
  t.assert(call.args[0] === "sendsms");
  t.assert(call.args[1] === "TEXT");
  t.assert(call.args[2] === receiver);
  t.assert(call.args[3] === "-text");
  t.assert(call.args[4] === text);

  t.teardown(teardown);
});

test("if messages from db get sent", async t => {
  init();
  const out =
    ",Sending SMS 1/1....waiting for network answer..OK, message reference=18\n,If you want break, press Ctrl+C...\n";
  const gammuSpawn = mockSpawn();
  gammuSpawn.setDefault(gammuSpawn.simple(0, out));
  gammuSpawn.sequence.add(gammuSpawn.simple(0, out));
  tasks.__set__("spawn", gammuSpawn);

  const emitter = tasks.getEventEmitter();
  store({ id: "abc", receiver: "123", text: "ein test", status: "SCHEDULED" });
  emitter.emit("process_outgoing");
  const [res] = await once(emitter, "partial_done_outgoing");
  t.assert(res.id === "abc");

  t.teardown(teardown);
});
