import { Logger, PlatformAccessory, Service } from 'homebridge';
import { AccessoryUtils } from '../models/accessory';
import { CoffeeType, CoffeeTypeUtils } from '../models/cofeeTypes';
import { IDeviceConfig } from '../models/deviceConfig';
import { NespressoPlatform } from '../platform';

export interface IServiceController {
    infoService(): Service;
    sliderService(): Service | undefined;
    noWaterService(): Service | undefined;
    trayErrorService(): Service | undefined;
    descealingService(): Service | undefined;
    capsuleService(): Service | undefined;
    batteryService(): Service | undefined;
    brewingService(): Service | undefined;
    coffeeService(type: CoffeeType) : Service | undefined;
}

export class ServiceController implements IServiceController {
    private readonly _sliderServiceUuid: string;
    private readonly _brewingServiceUuid: string;
    private readonly _noWaterServiceUuid: string;
    private readonly _trayErrorServiceUuid: string;
    private readonly _descealingServiceUuid: string;
    private readonly _capsuleServiceUuid: string;
    private readonly _capsuleBatteryServiceUuid: string;

    private readonly _config: IDeviceConfig;

    constructor(
        public readonly log: Logger,
        public readonly accessory: PlatformAccessory,
        private readonly platform: NespressoPlatform) {
      this._config = accessory.context.device;
      this._sliderServiceUuid = AccessoryUtils.toUDID(this.accessory, 'slider');
      this._brewingServiceUuid = AccessoryUtils.toUDID(this.accessory, 'brewing');
      this._noWaterServiceUuid = AccessoryUtils.toUDID(this.accessory, 'water');
      this._trayErrorServiceUuid = AccessoryUtils.toUDID(this.accessory, 'tray');
      this._descealingServiceUuid = AccessoryUtils.toUDID(this.accessory, 'descealing');
      this._capsuleServiceUuid = AccessoryUtils.toUDID(this.accessory, 'capsules');
      this._capsuleBatteryServiceUuid = AccessoryUtils.toUDID(this.accessory, 'battery');

      this.initServices();
    }

    initServices() {
      const splittedArticle = this._config.name.split('_');
      if (splittedArticle.length < 2) {
        this.platform.log.error(`The given name ${this._config.name},
       is not a valid device name, please enter the correct name. For example "Expert_DB1234DB12345`);
        throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.RESOURCE_DOES_NOT_EXIST);
      }
      const model = splittedArticle[0];
      const serial = splittedArticle[1];
      const displayName = this._config.displayName ?? 'Coffee';
      this.accessory.getService(this.platform.Service.AccessoryInformation)!
        .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Nespresso')
        .setCharacteristic(this.platform.Characteristic.Model, model)
        .setCharacteristic(this.platform.Characteristic.SerialNumber, serial)
        .setCharacteristic(this.platform.Characteristic.Name, displayName);

      this.initContactService('Slider', this._sliderServiceUuid);
      this.initContactService('Brewing', this._brewingServiceUuid);
      this.initContactService('No Water', this._noWaterServiceUuid);
      this.initContactService('Tray Error', this._trayErrorServiceUuid);
      this.initContactService('Descealing Needed', this._descealingServiceUuid);
      this.initContactService('No Capsules', this._capsuleServiceUuid);

      const batteryService = this.accessory.getService(this._capsuleBatteryServiceUuid)
      || this.accessory.addService(this.platform.Service.Battery, 'Cups Left', this._capsuleBatteryServiceUuid);
      batteryService.getCharacteristic(this.platform.Characteristic.ChargingState)
        .setValue(this.platform.Characteristic.ChargingState.NOT_CHARGEABLE);

      CoffeeTypeUtils.all().forEach((type) => {
        this.initCoffeType(type);
      });
    }

    initContactService(name: string, uuid: string) {
      this.accessory.getService(uuid)
        || this.accessory.addService(this.platform.Service.ContactSensor, name, uuid);
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

    infoService() {
      return this.accessory.getService(this.platform.Service.AccessoryInformation)!;
    }

    addCoffeeService(uuid: string, type: CoffeeType) {
      this.accessory.getService(uuid)
        || this.accessory.addService(this.platform.Service.Switch, CoffeeTypeUtils.humanReadable(type), uuid);
    }

    removeCoffeeService(uuid: string) {
      const service = this.accessory.getService(uuid);
      if (service) {
        this.accessory.removeService(service);
        this.platform.log.info(`Did remove coffee service ${uuid}`);
      }
    }

    coffeeService(type: CoffeeType) : Service | undefined {
      const uuid = CoffeeTypeUtils.toUDID(this.accessory, type);
      return this.accessory.getService(uuid);
    }

    sliderService() : Service | undefined {
      return this.accessory.getService(this._sliderServiceUuid)!;
    }

    brewingService() : Service | undefined {
      return this.accessory.getService(this._brewingServiceUuid)!;
    }

    noWaterService() : Service | undefined {
      return this.accessory.getService(this._noWaterServiceUuid)!;
    }

    trayErrorService() : Service | undefined {
      return this.accessory.getService(this._trayErrorServiceUuid)!;
    }

    capsuleService() : Service {
      return this.accessory.getService(this._capsuleServiceUuid)!;
    }

    batteryService() : Service {
      return this.accessory.getService(this._capsuleBatteryServiceUuid)!;
    }

    descealingService() : Service | undefined {
      return this.accessory.getService(this._descealingServiceUuid)!;
    }
}
