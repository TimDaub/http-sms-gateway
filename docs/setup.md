# Setup

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

## Setting up the Huawei E3531 mobile network dongle

A warning: Setting up a Huawei mobile network dongle can be quite painful and
time intensive. Conceptionally, these dongles exist in Ubuntu as different
devices depending if they're launched as "Mass Storage Device" or as "Modem".

This is reflected in a value representing the "product" and another one
representing the "vendor". In my case, I'm using a Huawei E3531i-2. When
pluggin it in, it's `vendorID:productID` is `12d1:1f01` (Mass Storage Mode).

```bash
$ lsusb
Bus 002 Device 001: ID 1d6b:0003 Linux Foundation 3.0 root hub
Bus 001 Device 003: ID 12d1:1f01 Huawei Technologies Co., Ltd. E353/E3131 (Mass storage mode)
Bus 001 Device 002: ID 2109:3431 VIA Labs, Inc. Hub
Bus 001 Device 001: ID 1d6b:0002 Linux Foundation 2.0 root hub
```

There's a tool called USB-modeswitch, that allows you to switch the device from
mass storage to modem mode. For Huawei devices, according to the developer, 
there's three modes [5]:

```
1. MessageContent="55534243123456780600000080000601000000000000000000000000000000"
2. MessageContent="55534243123456780000000000000011062000000100010100000000000000"
3. MessageContent="55534243123456780000000000000011063000000100010000000000000000"
```

Where:

1. is the "Windows" mode
2. is the "Linux" mode, which is not always serial/PPP but also ethernet-like or "qmi".
3. is the "Fallback" mode which provides serial/PPP ports - only on not-so-current models though.

To switch a device, you need to invoke `usb_modeswitch` like this:

```bash
# Install usb-modeswitch
$ apt-get install ppp usb-modeswitch usb-modeswitch-data
# switch the dongle
$ sudo usb_modeswitch -W -I -v <vendorId> -p <productId> -M <MessageContent>
```

Note that in the above command, `productId` refers to the dongle's id in mass
storage mode. Once the device is switched over to another mode, its productId
changes. In the case of my Huawei E3531i-2, it goes from `12d1:1f01` to
`12d1:155e` when I'm switching to (3.) fallback mode.

```bash
$ sudo usb_modeswitch -W -I -v 12d1 -p 1f01 -M 55534243123456780000000000000011063000000100010000000000000000
```

I'm interested in fallback mode, as it allows us to communicate using serial
ports, which is what we want.

Unfortunately, this process will have to be repeated continously now every time
the USB dongle is re-plugged or the RPI reboots. We'll try to automate it. I
was lazy so I've come up with something very simple. Add a cron job with `sudo
crontab -e` and paste (make sure to edit crontab with sudo!):

```
*/1 * * * * sudo usb_modeswitch -W -I -v 12d1 -p 1f01 -M 55534243123456780000000000000011063000000100010000000000000000
```

Lastly, this is how your device should now show up:

```bash
$ lsusb
Bus 002 Device 001: ID 1d6b:0003 Linux Foundation 3.0 root hub
Bus 001 Device 004: ID 12d1:155e Huawei Technologies Co., Ltd.
Bus 001 Device 002: ID 2109:3431 VIA Labs, Inc. Hub
Bus 001 Device 001: ID 1d6b:0002 Linux Foundation 2.0 root hub
```

Note that for some reason, the official usb_modeswitch discussion board is
hosted under https://www.draisberghof.de. Just a note so you don't get confused
when searching online! Additional references can be found in [2, 3, 4].

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
ENABLED_COUNTRIES="de-DE,de-AT"
```

**NOTE:** `ENABLED_COUNTRIES` refers to the mobile phone numbers we allow the
gsm module to send SMS to. All this variable allows us to do is check the
number's structure. We use
[`validator.js`](https://github.com/validatorjs/validator.js#validators), which
means only values listed in the definition of the `isMobilePhone` function are
allowed. They have to be separated by commas with no spaces in-between.  [This
site](https://www.fakephonenumber.org) can be helpful to generate mobile phone
numbers for testing.

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

### Keeping your Raspberry Pi connected to the Wifi

I've had situations where my RPi would disconnect from my home network every
day. I've checked the syslogs and so on but couldn't find a solution. For now,
I've configured it to repeatedly turn of [Wifi Power
Management](https://unix.stackexchange.com/a/299092) in the hope to resolve the
issue. I'll update this section when new information becomes available.

Update:

10/09/20: Pi is still reachable after one day.

## References

- 1: https://ubuntu.com/tutorials/how-to-install-ubuntu-on-your-raspberry-pi#3-wifi-or-ethernet
- 2: https://www.draisberghof.de/usb_modeswitch/bb/viewtopic.php?f=4&t=1999&sid=629d04aa2d16358e40dd05779342478b&start=15
- 3: https://github.com/EMnify/doc/wiki/How-to-use-a-Huawei-E3531-in-Modem-Mode/630650f7d32a8a001aacff86634920b12638e1a8
- 4: https://gist.github.com/elacheche/aa5a5e42b11e8deb6187
- 5: https://www.draisberghof.de/usb_modeswitch/bb/viewtopic.php?f=4&t=1999&p=16551&hilit=E3531i+2#p16551
