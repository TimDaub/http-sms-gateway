# http-sms-gateway

> A server for sending and receiving SMS via HTTP.

## Prerequisites and Installation

See [setup.md](./docs/setup.md).

## Usage

I'm developing a **[dedicated JavaScript client](./client)**. Alternatively,
you can use the endpoints listed below.

### Messages

Messages come in two types. "Outgoing" messages that _you_, the operator, send
to the gateway via HTTP and that the gateway forwards to the SMS network. And
"Incoming", so all SMS that the gateway is receiving.

#### `POST /outgoing`

```bash
$ curl -d '{"receiver":"<number>", "text":"this is a message"}' \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -X POST http://localhost:5000/api/v1/outgoing
{"id":"276ee5da-ae18-40f4-a04c-60d98e05591c","status":"SCHEDULED"}
```

#### `GET /incoming`

```bash
$ curl -H "Authorization: Bearer <token>" \
  --data-urlencode "sender=<number>" \
  -G http://localhost:5000/api/v1/incoming
[]
```

### Webhooks to Listen for Incoming Messages

In case you want to react to incoming messages, the gateway allows you to
create an authenticated webhook. There's currently only one event that can be
listened for, called `incomingMessage`. It's fired exactly when a new SMS is
received.  Using the `secret` parameter, you can make sure that you're truly
receiving messages from the gateway. It's using a
[HMAC](https://en.wikipedia.org/wiki/HMAC). Check the HMAC's
[implementation](https://github.com/TimDaub/http-sms-gateway/blob/d7070f4ad6e56a60a7265f1db0461d747f76022d/src/controllers/webhooks.js#L49-L52)
to copy it on your server. It may make sense comparing the HMACs with node's
[`crypto.timingSafeEqual`](https://nodejs.org/api/crypto.html#crypto_crypto_timingsafeequal_a_b).

Lastly, a word on an event's delivery: The gateway will try to deliver an event
as fast as possible. In cases your server is down or doesn't respond with a
`200 OK` status code, another try is started in `1^trys` minutes for [12
times](https://github.com/TimDaub/http-sms-gateway/blob/d7070f4ad6e56a60a7265f1db0461d747f76022d/src/controllers/db.js#L169-L187).

#### `POST /webhooks`

```bash
$ curl -d '{"url": "https://example.com", "secret": "aaaaaaaaaa", "event": "incomingMessage"}' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -X POST http://localhost:5000/api/v1/webhooks
{"id":"f4850f75-5080-48a8-a81a-2d8f7cf6a57a","url":"https://example.com","secret":"aaaaaaaaaa","event":"incomingMessage"}
```

#### `DELETE /webhooks/:id`

```bash
$ curl -X DELETE -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/v1/webhooks/f4850f75-5080-48a8-a81a-2d8f7cf6a57a
```

**NOTES:** 

- `secret`'s length needs to be between 10 and 64 characters.
- `event` can currently only be the string `incomingMessage`, being the event a
  new SMS is received.

## References

- I was inspired by [GitHub's webhook
  implementation](https://developer.github.com/v3/repos/hooks/).

## Copyright notice

© 2020, Tim Daubenschütz. All rights reserved.
