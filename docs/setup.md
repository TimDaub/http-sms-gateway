# Hardware

http-sms-gateway is written to run on a Raspberry Pi 4. The following
document outlines a setup for such device in combination with a Huawei
E3531i-2 mobile network dongle.

## Hardware

- Raspberry Pi 4 2 GB RAM
- 16GB SD card
- Huawei E3531i-2 mobile network dongle
- German prepaid SIM from a grocery shop

## Motivation

My motivation for this project was very simple. It's nearly impossible to
buy a German mobile phone number to send and receive SMS from any of the
*amazing* cloud providers. From what I was able to gather, signing up is
mainly permitted for registered businesses. Before deciding to build
http-sms-gateway, in fact I tried signing up with AWS SNS, Twilio and
Vonage. From none, I was able to receive a working German mobile phone
number. In fact, Vonage refuses to transfer back my credits that ended up
being useless because they didn't allow me to use a number. Avoid them.

Anyways, that's why I decided to build this low-cost solution.

## Connecting via SSH and Wifi

- Download and install Raspberry Pi Imager
- Select the latest Ubuntu Server OS to install on your SD card
- When done, find the mounted SD card in your file system and do

```bash
$ touch ssh
# to allow you later to login via
# username: ubuntu
# pw: ubuntu

$ vim network-config
```

and add the following for the Raspberry Pi to connect to your local Wifi:

```
wifis:
  wlan0:
  dhcp4: true
  optional: true
  access-points:
    "home network":
      password: "123456789"
```

Now insert the SD card and boot it. Note that even according to the official
Ubuntu guide, your Raspberry Pi will **NOT** automatically connect to your
Wifi network [1]. I found that the following works:

- Connect it via Ethernet cable to your router and login with ssh
- `sudo reboot`

From now on, it will automatically connect to your Wifi. Don't ask me why...

### Copying your identity and securing SSH

To copy your ssh key, use ssh-copy-id:

```bash
ssh-copy-id -i $HOME/.ssh/id_rsa.pub user@12.34.56.78
```

Subsequently, disable password-based authentication in `/etc/ssh/sshd_config`

```bash
PasswordAuthentication yes

#to

PasswordAuthentication no
```

And restart

```bash
$ sudo service ssh restart
```

## Setting up the mobile network dongle

- Follow [this tutorial](https://github.com/EMnify/doc/wiki/How-to-use-a-Huawei-E3531-in-Modem-Mode/630650f7d32a8a001aacff86634920b12638e1a8).

## Installing dependencies

```bash
$ apt install build-essential 
```

and follow the instructions
[here](https://github.com/nodesource/distributions/blob/master/README.md#installation-instructions)
to install Nodejs on Ubuntu.

### Testing the mobile network dongle

```bash
$ npm install serialport-gsm && \
node -e "require('serialport-gsm').list(console.log)"
```

should yield something along the following lines:

```bash
... npm install logs...

+ serialport-gsm@3.3.1
added 66 packages from 45 contributors and audited 82 packages in 19.853s

2 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities

null [
  {
    manufacturer: 'HUAWEI',
    serialNumber: undefined,
    pnpId: 'usb-HUAWEI_HUAWEI_Mobile-if00-port0',
    locationId: undefined,
    vendorId: '12d1',
    productId: '1001',
    path: '/dev/ttyUSB0'
  },
  {
    manufacturer: 'HUAWEI',
    serialNumber: undefined,
    pnpId: 'usb-HUAWEI_HUAWEI_Mobile-if01-port0',
    locationId: undefined,
    vendorId: '12d1',
    productId: '1001',
    path: '/dev/ttyUSB1'
  },
  {
    manufacturer: 'HUAWEI',
    serialNumber: undefined,
    pnpId: 'usb-HUAWEI_HUAWEI_Mobile-if02-port0',
    locationId: undefined,
    vendorId: '12d1',
    productId: '1001',
    path: '/dev/ttyUSB2'
  },
  {
    manufacturer: undefined,
    serialNumber: undefined,
    pnpId: undefined,
    locationId: undefined,
    vendorId: undefined,
    productId: undefined,
    path: '/dev/ttyAMA0'
  },
  {
    manufacturer: undefined,
    serialNumber: undefined,
    pnpId: undefined,
    locationId: undefined,
    vendorId: undefined,
    productId: undefined,
    path: '/dev/ttyS0'
  }

```

## Installing http-sms-gateway

```bash
$ git clone git@github.com:TimDaub/http-sms-gateway.git
$ cd http-sms-gateway
$ npm i
```

### Creating a local copy of `.env`


The following fields must be configured:

```
SERVER_PORT=5000
DB_PATH=http-sms-gateway.db
SQLITE_SCHEMA_PATH=src/sql/schema.sql
BEARER_TOKEN=abc
DEVICE_PATH=/dev/ttyUSB0
SIM_PIN=1234
```

### Running http-sms-gateway

```bash
$ npm run init
# to initialize the database 
$ npm run dev
# and to send an sms
$ curl -d '{"receiver":"<your number>", "text":"posted from curl"}' \
-H "Content-Type: application/json" -H "Authorization: Bearer abc" \
-X POST http://localhost:5000/api/v1/sms
```

## References

- 1: https://ubuntu.com/tutorials/how-to-install-ubuntu-on-your-raspberry-pi#3-wifi-or-ethernet
