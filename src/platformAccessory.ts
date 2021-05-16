import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { CoffeeType, CoffeeTypeUtils, TemperatureUtils } from './models/cofeeTypes';
import { NespressoPlatform } from './platform';
import { IMachineController, MachineController } from './controllers/machineController';
import { IDeviceConfig } from './models/deviceConfig';

export class ExpertPlatformAccessory {
  private readonly _controller: IMachineController;
  private readonly _config: IDeviceConfig;

  constructor(
    private readonly platform: NespressoPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this._config = accessory.context.device;
    const splittedArticle = this._config.name.split('_');
    if (splittedArticle.length < 2) {
      this.platform.log.error(`The given name ${this._config.name},
       is not a valid device name, please enter the correct name. For example "Expert_DB1234DB12345`);
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.RESOURCE_DOES_NOT_EXIST);
    }
    const model = splittedArticle[0];
    const serial = splittedArticle[1];
    const displayName = this._config.displayName ?? 'Coffee';
    this._controller = new MachineController(platform.log, accessory);
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Nespresso')
      .setCharacteristic(this.platform.Characteristic.Model, model)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, serial)
      .setCharacteristic(this.platform.Characteristic.Name, displayName);
    this.initCoffeType(CoffeeType.Ristretto);
    this.initCoffeType(CoffeeType.Espresso);
    this.initCoffeType(CoffeeType.Lungo);
    this.initCoffeType(CoffeeType.Americano);
    this.initCoffeType(CoffeeType.Water);
  }

  initCoffeType(type: CoffeeType) {
    const uuid = CoffeeTypeUtils.toUDID(this.accessory, type);
    if (CoffeeTypeUtils.isEnabled(type, this._config)) {
      this.platform.log.debug(`Adding coffee type ${type}`);
      this.addCoffeeService(uuid, type);
    } else {
      this.platform.log.debug(`Removing coffee type ${type}`);
      this.removeCoffeeService(uuid);
    }
  }

  addCoffeeService(uuid: string, type: CoffeeType) {
    const service = this.accessory.getService(uuid)
    || this.accessory.addService(this.platform.Service.Switch, CoffeeTypeUtils.humanReadable(type), uuid);
    service.getCharacteristic(this.platform.Characteristic.On)
      .onSet((value) => this.setOn(value, type))
      .onGet(() => this.getOn(type));
  }

  removeCoffeeService(uuid: string) {
    const service = this.accessory.getService(uuid);
    if (service) {
      this.accessory.removeService(service);
      this.platform.log.info(`Did remove coffee service ${uuid}`);
    }
  }

  async controlMachine(value: CharacteristicValue, type: CoffeeType) {
    const temperature = TemperatureUtils.ofString(this._config.temperature);
    this.platform.log.debug(`Temperature is ${temperature}`);
    const response = value ? await this._controller.brew(type, temperature) : await this._controller.cancel();
    this._controller.disconnect();
    const accessory = this.accessory.getService(CoffeeTypeUtils.toUDID(this.accessory, type));
    if (!response) {
      accessory?.updateCharacteristic(this.platform.Characteristic.On, false);
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.NOT_ALLOWED_IN_CURRENT_STATE);
    } else {
      this.platform.log.debug(`Received response ${response?.reason} ${response?.success}`);
      if (value && !response.success) {
        this.platform.log.error(response.reason);
        accessory?.updateCharacteristic(this.platform.Characteristic.On, false);
        throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.NOT_ALLOWED_IN_CURRENT_STATE);
      }
    }
  }

  brewCoffee(value: CharacteristicValue, type: CoffeeType) {
    const shouldBrew = (value === true);
    const executor = async ()=> {
      try {
        await this.controlMachine(value, type);
        if (shouldBrew) {
          this.platform.log.info('Successfully brewed!');
        }
      } catch(error) {
        if (shouldBrew) {
          this.platform.log.info('Brew failed, no coffee...');
        }
      }
    };
    executor();
  }

  setOn(value: CharacteristicValue, type: CoffeeType) {
    this.platform.log.debug('Set Characteristic On ->', value);
    // Start async command, not blocking homebridge!
    this.brewCoffee(value, type);
  }

  getOn(type: CoffeeType): Promise<CharacteristicValue> {
    const isOn = this._controller.isBrewing(type);
    this.platform.log.debug('Get Characteristic On ->', isOn);
    return isOn;
  }
}
