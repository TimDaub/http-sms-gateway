// @format
const { v4: uuidv4 } = require("uuid");

const SMSHandler = require("../controllers/sms.js");
const { sms: smsOptions } = require("../options.js");
const { incoming, outgoing } = require("../controllers/db.js");

function launch() {
  const sms = new SMSHandler(smsOptions);
  sms.on("open", () => {
    setInterval(sms.sendAll, 1000);
    setInterval(sms.receiveAll, 1000);
  });

  sms.on("progress", ({ id, response }) => outgoing.updateStatus(id, response));
  sms.on("error", ({ id, response }) => outgoing.updateStatus(id, response));

  sms.on("message", msg => {
    const id = uuidv4();
    incoming.store({ ...msg, id });
  });
}

module.exports = { launch };
