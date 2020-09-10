// @format
const { SIM_PIN } = process.env;
module.exports = {
  baudRate: 19200,
  dataBits: 8,
  parity: "none",
  stopBits: 1,
  xon: false,
  rtscts: false,
  xoff: false,
  xany: false,
  autoDeleteOnReceive: false,
  enableConcatenation: true,
  incomingCallIndication: false,
  incomingSMSIndication: false,
  pin: SIM_PIN,
  customInitCommand: "AT^CURC=0",
  logger: console
};
