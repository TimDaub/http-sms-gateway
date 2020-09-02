//@format
const { EventEmitter, once } = require("events");
const { spawn } = require("child_process");

const { getAllMessages, updateStatus } = require("./db.js");
const { ImplementationError } = require("../errors.js");

const emitter = new EventEmitter();
const getEventEmitter = () => emitter;
const sendAllScheduled = () => getAllMessages("SCHEDULED").forEach(send);
const updateDB = ({ id, state }) =>
  updateStatus(id, state) && emitter.emit("partial_done_outgoing", { id });
emitter.on("process_outgoing", sendAllScheduled);
emitter.on("partial_progress_outgoing", updateDB);

function parseOutput(out) {
  // NOTE: Following are output formats of the gammu cli:
  //   pi@raspberrypi:~$ gammu sendsms TEXT <receiver> -text "this is a final test"
  //   If you want break, press Ctrl+C...
  //   Sending SMS 1/1....waiting for network answer..OK, message reference=15
  //   pi@raspberrypi:~$ gammu sendsms TEXT 018 -text "this is a final test"
  //   If you want break, press Ctrl+C...
  //   Sending SMS 1/1....waiting for network answer..error 28, message reference=-1
  //   Unknown error.
  //   and in the node.js shell:
  //   > spawnSync("gammu", ["sendsms", "TEXT", "<receiver>", "-text", "some text"]).output.toString()
  //   ',Sending SMS 1/1....waiting for network answer..OK, message reference=18\n,If you want break, press Ctrl+C...\n'
  //   > spawnSync("gammu", ["sendsms", "TEXT", "018", "-text", "some text"]).output.toString()
  //   ',Sending SMS 1/1....waiting for network answer..error 28, message reference=-1\nUnknown error.\n,If you want break, press Ctrl+C...\n'
  if (out.includes("Sending SMS")) {
    const pattern = new RegExp(
      "\\.\\.(OK|error\\s\\d{2}),\\smessage reference=(.*?)\\n"
    );
    const [, state, reference] = out.match(pattern);
    return {
      // NOTE: I haven't found a reference regarding the error number. Once I've
      // found one, errors can be matched distinctively.
      state,
      reference
    };
  } else {
    throw new ImplementationError(
      `Parsing for this type of output not supported: ${out}`
    );
  }
}

// NOTE: Sending a SMS successfully can take some time, and since all sync
// child_process functions are blocking node.js's event loop, we opt to use the
// event listener pattern here.
async function send({ receiver, text, id }) {
  const gammu = spawn("gammu", ["sendsms", "TEXT", receiver, "-text", text]);

  let out;
  gammu.stdout.on("data", data => (out += data));
  gammu.stderr.on("data", data => (out += data));
  gammu.on("close", () => {
    let output = parseOutput(out);
    output = { ...output, id };

    if (output.state.includes("error")) {
      emitter.emit("error", { message: "Error sending sms", output });
    } else if (output.state.includes("OK")) {
      emitter.emit("partial_progress_outgoing", output);
    }
  });
}

module.exports = { getEventEmitter, send, parseOutput };
