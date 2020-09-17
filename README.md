# http-sms-gateway

> A server for sending and receiving SMS via HTTP.

## Prerequisites and Installation

See [setup.md](./docs/setup.md).

## Usage

### `POST /outgoing`

```bash
$ curl -d '{"receiver":"<number>", "text":"this is a message"}' \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -X POST http://localhost:5000/api/v1/outgoing
{"id":"276ee5da-ae18-40f4-a04c-60d98e05591c","status":"SCHEDULED"}
```

### `GET /incoming`

```bash
$ curl -H "Authorization: Bearer <token>" \
  --data-urlencode "sender=<number>" \
  -G http://localhost:5000/api/v1/incoming
[]
```

### `POST /webhooks`

```bash
$ curl -d '{"url": "https://example.com", "secret": "aaaaaaaaaa", "event": "incomingMessage"}' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -X POST http://localhost:5000/api/v1/webhooks
{"id":"f4850f75-5080-48a8-a81a-2d8f7cf6a57a","url":"https://example.com","secret":"aaaaaaaaaa","event":"incomingMessage"}
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
