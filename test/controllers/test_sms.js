// @format
const test = require("ava").serial;
const sinon = require("sinon");
const { once } = require("events");

const SMSHandler = require("../../src/controllers/sms.js");
const { init, outgoing, dump } = require("../../src/controllers/db.js");

const teardown = () => {
  dump();
};

test("if sms is sent and output is returned", async t => {
  init();

  const smsHandler = new SMSHandler({});
  smsHandler.modem.sendSMS = (receiver, text, alert, cb) =>
    cb({ status: "success" });
  smsHandler.modem.emit("open");
  const promise = new Promise(resolve => {
    smsHandler.on("progress", res => {
      resolve(true);
    });
  });

  smsHandler.send({
    receiver: "0152901820",
    text: "this is a text",
    id: "abc"
  });

  t.assert(await promise);
  t.teardown(teardown);
});

test("if sms errors, error is sent", async t => {
  init();

  const smsHandler = new SMSHandler({});
  smsHandler.modem.sendSMS = (receiver, text, alert, cb) =>
    cb({ status: "fail" });
  const promise = new Promise(resolve => {
    smsHandler.on("error", res => {
      resolve(true);
    });
  });

  smsHandler.send({
    receiver: "0152901820",
    text: "this is a text",
    id: "abc"
  });

  t.assert(await promise);
  t.teardown(teardown);
});

test("if messages from db get sent", async t => {
  init();

  outgoing.store({
    id: "abc",
    receiver: "123",
    text: "ein test",
    status: "SCHEDULED"
  });
  outgoing.store({
    id: "cba",
    receiver: "321",
    text: "tset nie",
    status: "SCHEDULED"
  });

  const smsHandler = new SMSHandler({});
  smsHandler.modem.sendSMS = (receiver, text, alert, cb) =>
    cb({ status: "success", data: { response: "message sent successfully" } });
  const promise = new Promise(resolve => {
    let count = 0;
    smsHandler.on("progress", res => {
      count++;
      if (count > 1) {
        resolve(true);
      }
    });
  });
  smsHandler.sendAll();

  t.assert(await promise);
  t.teardown(teardown);
});

test("if incoming message is stored in db and deleted from sim", async t => {
  init();
  const expected = {
    sender: "0123456789",
    message: "this is an sms",
    index: 0,
    dateTimeSent: new Date().toISOString()
  };
  // NOTE: message from serialport-gsm:
  //  {
  //    sender: '<number>',
  //    message: 'sbabha',
  //    index: 0,
  //    dateTimeSent: 2020-09-09T15:52:59.000Z,
  //  }
  //
  const smsHandler = new SMSHandler({});
  smsHandler.modem.getSimInbox = cb => cb({ data: [expected] });
  smsHandler.modem.deleteMessage = (msg, cb) => {
    t.deepEqual(expected, msg);
    t.teardown(teardown);
  };
  smsHandler.receiveAll();
});

test("if currently processed messages are locked to avoid duplicate processing", async t => {
  init();
  let smsHandler;

  try {
    smsHandler = new SMSHandler({});
  } catch (err) {
    // NOTE: We assume a throw here as tests shouldn't require a live device.
  }
  const expected = [
    {
      id: "abc",
      receiver: "123",
      text: "ein test",
      status: "SCHEDULED"
    },
    {
      id: "cba",
      receiver: "321",
      text: "tset nie",
      status: "SCHEDULED"
    }
  ];

  outgoing.store(expected[0]);
  outgoing.store(expected[1]);

  const sendSMS = sinon.fake(async (receiver, text, alert, cb) => {
    // NOTE: Sending SMS takes 2 seconds
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log("resolving 2 second delayed sendSMS call.");
    cb({ status: "success", data: { response: "message sent successfully" } });
  });
  smsHandler.modem.sendSMS = sendSMS;

  // NOTE: We only wait 1 second between both `sendAll`
  const interval = setInterval(smsHandler.sendAll, 1000);
  // NOTE: First interval should take 2 secs to complete
  //       Second interval, sms from first shouldn't appear anymore
  //       We should wait at least a total of 4 seconds for everything to
  //       complete
  await new Promise(resolve => setTimeout(resolve, 4000));
  clearInterval(interval);
  t.assert(sendSMS.getCall(0).args[0] === expected[0].receiver);
  t.assert(sendSMS.getCall(1).args[0] === expected[1].receiver);
  t.assert(sendSMS.callCount === 2);

  t.teardown(teardown);
});
