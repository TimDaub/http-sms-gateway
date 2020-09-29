// @format
const fetch = require("cross-fetch");

class SMSClient {
  constructor(host, bearer) {
    this.host = host;
    this.bearer = bearer;

    this.subscribe = this.subscribe.bind(this);
  }

  async subscribe(url, event, secret) {
    return await fetch(`${this.host}/api/v1/webhooks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.bearer}`
      },
      body: JSON.stringify({
        secret,
        event,
        url
      })
    });
  }

  async unsubscribe(id) {
    return await fetch(`${this.host}/api/v1/webhooks/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.bearer}`
      }
    });
  }
}

module.exports = SMSClient;
