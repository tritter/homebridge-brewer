# homebridge-brewer
<!-- [![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins) -->
[![npm](https://img.shields.io/npm/v/homebridge-brewer.svg)](https://www.npmjs.com/package/homebridge-brewer) [![npm](https://img.shields.io/npm/dt/homebridge-brewer.svg)](https://www.npmjs.com/package/homebridge-brewer)

<img src="https://github.com/tritter/homebridge-brewer/blob/master/.img/homekit.jpeg?raw=true" height=250 >


[Homebridge](https://github.com/nfarina/homebridge) plugin for brewing coffee with your Nespresso machines using [HomeKit](https://www.apple.com/ios/home/) accessories.

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
[<img src="https://github.com/tritter/homebridge-brewer/blob/master/.img/coffee-button.png?raw=true" height=50 >](https://www.buymeacoffee.com/tritter)
