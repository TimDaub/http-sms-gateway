// @format
const test = require("ava").serial;

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
