//@format
const { EventEmitter, once } = require("events");
const serialportgsm = require("serialport-gsm");

const { getAllMessages, updateStatus } = require("./db.js");
const { ImplementationError } = require("../errors.js");

const { DEVICE_PATH, SIM_PIN } = process.env;

const emitter = new EventEmitter();
const getEventEmitter = () => emitter;
const sendAllScheduled = () => {
  getAllMessages("SCHEDULED").forEach(send);
  emitter.emit("done_outgoing");
};
const updateDB = ({ id, response }) =>
  updateStatus(id, response) && emitter.emit("partial_done_outgoing", { id });

const modem = serialportgsm.Modem();
const options = {
  baudRate: 19200,
  dataBits: 8,
  parity: "none",
  stopBits: 1,
  xon: false,
  rtscts: false,
  xoff: false,
  xany: false,
  autoDeleteOnReceive: true,
  enableConcatenation: true,
  incomingCallIndication: false,
  incomingSMSIndication: false,
  pin: SIM_PIN,
  customInitCommand: "AT^CURC=0",
  logger: console
};
modem.open(DEVICE_PATH, options);

modem.on("open", () => {
  modem.on("onNewMessage", handleNewMessage);
  emitter.on("process_outgoing", sendAllScheduled);
  emitter.on("partial_progress_outgoing", updateDB);
  emitter.on("error", () => console.log("not implemented"));
});

function send({ receiver, text, id }) {
  modem.sendSMS(receiver, text, false, res => {
    const progress = { ...res.data, id };

    if (res.status === "success") {
      emitter.emit("partial_progress_outgoing", progress);
    } else {
      console.error(progress);
      emitter.emit("error", progress);
    }
  });
}

function handleNewMessage(data) {
  //Event New Message: {"sender":"number","message":"🤡","index":1,"dateTimeSent":"2020-09-03T12:47:44.000Z","header":{"encoding":"16bit","smsc":"4917
  //  22270333","smscType":"INTERNATIONAL","smscPlan":"ISDN"}}
  // TODO: Store received message in backend
}

module.exports = { getEventEmitter, send, handleNewMessage };
