# homebridge-brewer
[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)
[![npm](https://img.shields.io/npm/v/homebridge-brewer.svg)](https://www.npmjs.com/package/homebridge-brewer) [![npm](https://img.shields.io/npm/dt/homebridge-brewer.svg)](https://www.npmjs.com/package/homebridge-brewer)

<img src="https://github.com/tritter/homebridge-brewer/blob/master/.img/sample.jpg?raw=true" height=250 >
<img src="https://github.com/tritter/homebridge-brewer/blob/master/.img/homekit.jpg?raw=true" height=250 >


[Homebridge](https://github.com/nfarina/homebridge) plugin for brewing coffee with your Nespresso machines using [HomeKit](https://www.apple.com/ios/home/) accessories.

## Features
With this plugin you can brew coffee using Siri and schedule your coffee within your 'Good Morning' Scene! The plugin exposes the following switches to Homekit: Ristretto, Espresso, Lungo, Americano, Water.
Besides, there are also sensors: 

| Sensor | Description |
|----------|----------|
|Brewing| Opens whenever the brew starts, closes when the brew finishes. |
|Descealing Needed| Opens whenever descealing is needed. |
|No Capsules| Opens whenever you ran out of capsules. (Make sure to setup correctly) |
|No Water| Opens whenever there is no water in the tank. |
|Slider| Opens/Closes together with the capsule-slider on your machine. |
|Tray Error| Opens whenever a capsule jams the tray or whenever the capsule tray is full. |

### Capsule Count
The status of the capsule count is reflected using the battery level inside the Home App. By default the 'max_capsule_count' count is 0, this is the maximum number your machine can decrement. First make sure to setup the amount of capsules left inside the Nespresso App. *Whenever this plugin runs, you can't connect via the app, because the machine can only connect one device at a time!*

<img src="https://github.com/tritter/homebridge-brewer/blob/master/.img/capsules_left.jpg?raw=true" height=250 >

Let's say 500. This means that the battery percentage will be 50%; 500 capsules left of the max_capsule_count 1000. Below 10% Homekit will provide a low battery warning to remind you to order new cups.

## Installation
Make sure your system matches the prerequisites. Also when using a weaker Bluetooth Homekit-Server (especially a Raspberry Pi), make sure its *close to the machine* before taking it furhter away. The Nespresso machines require a strong connection otherwise you will see random disconnects before the brew even started. Whenever it works you can try to move the Homekit-Server further away.

[Noble](https://github.com/noble/noble) is BLE central module library for [Node.js](https://nodejs.org/) used to communicate with the coffee machines.

 These libraries and their dependencies are required by the [Noble](https://www.npmjs.com/package/noble) library and provide access to the kernel Bluetooth subsystem:

```sh
sudo apt-get install bluetooth bluez libbluetooth-dev libudev-dev
```

For more information see the [Noble documentation](https://github.com/noble/noble#readme).

### Install homebridge and this plugin
```
[sudo] npm install -g --unsafe-perm homebridge
[sudo] npm install -g --unsafe-perm homebridge-brewer
```

## Homebridge configuration
Update your Homebridge `config.json` file. See [config-sample.json](config-sample.json) for a complete example.

```json
"platforms": [
        {
            "machines": [
                {
                    "name": "Expert_AHD34DDBADCC",
                    "token": "DA-03-4B-BB-AA-CC-AA-CC",
                    "temperature": "Medium"
                }
            ],
            "platform": "Brewer"
        }
    ],
```


| Key                     | Default         | Description                                                                                                                                                                                                 |
|-------------------------|-----------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `Brewer`|"Brewer"| Mandatory. The name provided to Homebridge. Must be "Brewer".|
| `machines`|[]|Array of configured machines, is needed if you want to display one. (Multiple are supported)|
| `displayName`|"Coffee"| The name of this accessory. This will appear in your Home-app. 
| `name`|| Mandatory. The bluetooth name of the machine, can be found on your phone or pc, or any bluetooth discovery app. (see below)
| `token`||Authentication token which is required to send any commands see below ho to gather one. Make sure the format is exactly "XX-XX-XX-XX-XX-XX-XX-XX"|
| `temperature`|"Medium"| Mandatory. The temperature which is used to brew your coffees. Can be set to "Low", "Medium" and "High".
| `disabled_beverages`|[]| Optional. Disable the exposed switches, can be set to a list of items that shouldn't be exposed to the Home-app: ["ristretto", "espresso", "lungo", "americano", "water"]
| `max_capsule_count`|0| Optional. Set your maximum capsule count. The capsule count is displayed as battery percentage: 500 of 1000 (capsule_count) == 50%. Value can be between 1-1000, 0 is disabled (default)

## Name
You can find the name quite easily add the platform and check the homebridge log. If your homebridge server has bluetooth enabled and is close enough to the machine you will see something like this:
```[3/19/2021, 9:19:27 PM] [Brewer] Found new device, please add configuration for: "Expert_AHD34DDBADCC"```
The value "Expert_AHD34DDBADCC" should be used for the name in the configuration.


## Token
-----------------
In order to retrieve the [token](https://gist.github.com/farminf/94f681eaca2760212f457ac59da99f23) (you need to snoop the bluetooth packets:

* Use an Android-Phone
* Go to developer options in settings, enable [BLE HCI snoop](https://urish.medium.com/reverse-engineering-a-bluetooth-lightbulb-56580fcb7546)
* Start the Nespresso App (you need to have registered this and connected to your machine already)
* Brew a cup of coffee
* Stop BLE HCI snoop.
* Connect the mobile to USB/PC and copy or email the file (location: \\#{name}\Phone\Android\data\btsnoop_hci.log)
* Use the shell to extract find the token:
```
hexdump -v -e '/1 "%02X "' btsnoop_hci.log | grep -o '0B 00 04 00 12 14 00 \<.. .. .. .. .. .. .. ..\>'
```
This will search hexdump the log file (btsnoop_hci.log) and then grep for the sequence and 8bytes wildcards <..>, which is the authKey. Write between the bytes dashes to match the pattern which is required by this plugin. For example you will find:
```
0B 00 04 00 12 14 00 DA 03 4B BB AA CC AA CC
```
Take the last part (8 bytes) to creat the token:

`DA-03-4B-BB-AA-CC-AA-CC`


## Legal

*Nespresso* is an registered trademarks of Nestlé Nespresso S.A.

This project is in no way affiliated with, authorized, maintained, sponsored or endorsed by *Nespresso* or any of its affiliates or subsidiaries.

## Credits
These users/repositories helped making the Homekit integration possible:

[@farminf](https://gist.github.com/farminf) - https://gist.github.com/farminf/94f681eaca2760212f457ac59da99f23

[@fsalomon](https://github.com/fsalomon/nespresso-expert-ble/commits?author=fsalomon) - https://github.com/fsalomon/nespresso-expert-ble

[@petergullberg](https://github.com/petergullberg) - https://github.com/petergullberg/brewbutton

And me and yes, I like coffe ;)
<br>[<img src="https://github.com/tritter/homebridge-brewer/blob/master/.img/coffee-button.png?raw=true" height=50 >](https://www.buymeacoffee.com/tritter)
