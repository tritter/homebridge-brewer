import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { CoffeeType, CoffeeTypeUtils } from './models/cofeeTypes';

import { NespressoPlatform } from './platform';
import { IMachineController, MachineController } from './controllers/machineController';
import { BrewStatus } from './models/machineStatus';

export class ExpertPlatformAccessory {
  private readonly _controller: IMachineController;

  constructor(
    private readonly platform: NespressoPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this._controller = new MachineController(platform.log, accessory);
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Nespresso')
      .setCharacteristic(this.platform.Characteristic.Model, 'Default-Model')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'Default-Serial');
    this.initCoffeType(CoffeeType.Ristretto);
    this.initCoffeType(CoffeeType.Espresso);
    this.initCoffeType(CoffeeType.Lungo);
    this.initCoffeType(CoffeeType.Americano);
    this.initCoffeType(CoffeeType.Water);
  }

  initCoffeType(type: CoffeeType) {
    const accessory = this.accessory.getService(CoffeeTypeUtils.toUDID(type))
    || this.accessory.addService(this.platform.Service.Switch, CoffeeTypeUtils.humanReadable(type), CoffeeTypeUtils.toUDID(type));
    accessory.getCharacteristic(this.platform.Characteristic.On)
      .onSet((value) => this.setOn(value, type))
      .onGet(() => this.getOn(type));
  }


  async setOn(value: CharacteristicValue, type: CoffeeType) {
    this.platform.log.debug('Set Characteristic On ->', value);
    const response = value ? await this._controller.brew(type) : await this._controller.cancel();
    this.platform.log.info(`Received response ${response?.reason} ${response?.success}`);
    if (value && response && !response.success) {
      this.platform.log.error(response.reason);
      const accessory = this.accessory.getService(CoffeeTypeUtils.toUDID(type));
      accessory?.setCharacteristic(this.platform.Characteristic.On, false);
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.NOT_ALLOWED_IN_CURRENT_STATE);
    }
  }

  async getOn(type: CoffeeType): Promise<CharacteristicValue> {
    const isOn = this._controller.isBrewing(type);

    this.platform.log.debug('Get Characteristic On ->', isOn);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return isOn;
  }
}
