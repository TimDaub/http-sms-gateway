//@format
const { EventEmitter } = require("events");
const serialportgsm = require("serialport-gsm");

const { getAllMessages } = require("./db.js");

const { DEVICE_PATH } = process.env;

class SMSHandler extends EventEmitter {
  constructor(options) {
    super();

    this.modem = serialportgsm.Modem();
    this.modem.open(DEVICE_PATH, options);
    this.modem.on("open", () => this.emit("open"));

    this.sendAll = this.sendAll.bind(this);
    this.send = this.send.bind(this);
    this.receiveAll = this.receiveAll.bind(this);
  }

  sendAll() {
    getAllMessages("SCHEDULED").forEach(this.send);
  }

  receiveAll() {
    this.modem.getSimInbox((inbox, err) => {
      if (err) {
        console.error(err);
        this.emit("error", err);
      }
      if (inbox && inbox.data && inbox.data.length === 0) {
        // no new messages
        return;
      }

      const messages = inbox.data.map(
        ({ sender, message, index, dateTimeSent }) => ({
          sender,
          message,
          index,
          dateTimeSent
        })
      );
      messages.forEach(message => this.emit("message", message));
    });
  }

  send({ receiver, text, id }) {
    this.modem.sendSMS(receiver, text, false, res => {
      const progress = { ...res.data, id };

      if (res.status === "success") {
        this.emit("progress", progress);
      } else {
        console.error(progress);
        this.emit("error", progress);
      }
    });
  }
}
// TODO: Allow receiving
//Event New Message: {"sender":"<number>","message":"🤡","index":1,"dateTimeSent":"2020-09-03T12:47:44.000Z","header":{"encoding":"16bit","smsc":"4917
//  22270333","smscType":"INTERNATIONAL","smscPlan":"ISDN"}}
// TODO: Store received message in backend

module.exports = SMSHandler;
