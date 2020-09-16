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

## Copyright notice

© 2020, Tim Daubenschütz. All rights reserved.
