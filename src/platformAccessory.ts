import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { CoffeeType, CoffeeTypeUtils, TemperatureUtils } from './models/cofeeTypes';
import { NespressoPlatform } from './platform';
import { IDeviceConfig } from './models/deviceConfig';
import { SliderStatus } from './models/SliderStatus';
import { IServiceController, ServiceController } from './controllers/serviceController';
import { CapsuleCount } from './models/capsuleCount';
import { MachineStatus } from './models/machineStatus';

export class ExpertPlatformAccessory {
  private static WATCHDOG_INTERVAL = 1; //in minutes
  private readonly _controller: MachineController;
  private readonly _services: IServiceController;
  private readonly _config: IDeviceConfig;

  constructor(
    private readonly platform: NespressoPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this._config = accessory.context.device;
    this._controller = new MachineController(platform.log, accessory);
    this._services = new ServiceController(platform.log, accessory, platform);
    this.subscribeServices();
    this.subscribeController();
    this.connect();
  }

  async connect() {
    await this._controller.assertBluetooth();
    this._controller.connect();
    this.startConnectionDog();
  }

  async controlMachine(value: CharacteristicValue, type: CoffeeType) {
    const temperature = TemperatureUtils.ofString(this._config.temperature);
    this.platform.log.debug(`Temperature is ${temperature}`);
    const response = value ? await this._controller.brew(type, temperature) : await this._controller.cancel();
    const accessory = this.accessory.getService(CoffeeTypeUtils.toUDID(this.accessory, type));
    if (!response) {
      accessory?.setCharacteristic(this.platform.Characteristic.On, false);
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.NOT_ALLOWED_IN_CURRENT_STATE);
    } else {
      this.platform.log.debug(`Received response ${response?.reason} ${response?.success}`);
      if (value && !response.success) {
        this.platform.log.error(response.reason);
        accessory?.setCharacteristic(this.platform.Characteristic.On, false);
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
    if (!this._controller.isConnected()) {
      this.platform.log.debug('Device not connected!');
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
    const isOn = this._controller.isBrewing(type);
    this.platform.log.debug('Get Characteristic On ->', isOn);
    return isOn;
  }

  startConnectionDog() {
    this.platform.log.debug('Start connection watchdog');
    const interval = 1000 * 60 * ExpertPlatformAccessory.WATCHDOG_INTERVAL;
    setInterval(() => {
      this.watch();
    }, interval);
  }

  watch() {
    if (this._controller.isConnected()) {
      this.platform.log.debug('Watchdog: connected');
    } else {
      this.platform.log.debug(`Watchdog: Machine ${this._config.name} unreachable`);
      this.platform.log.info('Machine disconnected, this seems unintended try to move your hombridge server closer to the machine!');
      this._controller.connect();
    }
  }

  subscribeServices() {
    CoffeeTypeUtils.all().forEach((type) => {
      const service = this._services.coffeeService(type);
      service?.getCharacteristic(this.platform.Characteristic.On)
        ?.onGet(() => this.getOn(type))
        .onSet((value) => this.setOn(value, type));
    });
  }

  subscribeController() {
    this._controller.on('status', (status) => {
      this.platform.log.debug(status.toString());
      this.updateNoWaterService(status);
      this.updateTrayErrorService(status);
      this.updateBrewingService(status);
      this.updateDescealingService(status);
    });
    this._controller.on('slider', (status) => {
      this.platform.log.debug(status.toString());
      this.updateSliderService(status);
    });
    this._controller.on('capsule', (count) => {
      this.platform.log.debug(count.toString());
      this.updateCapsuleService(count);
    });
  }

  updateSliderService(status: SliderStatus) {
    const service = this._services.sliderService();
    const value = this.boolToContactState(!status.closed);
    service?.updateCharacteristic(this.platform.Characteristic.ContactSensorState, value);
  }

  updateBrewingService(status: MachineStatus) {
    const service = this._services.brewingService();
    const value = this.boolToContactState(status.isBrewing());
    service?.updateCharacteristic(this.platform.Characteristic.ContactSensorState, value);
  }

  updateNoWaterService(status: MachineStatus) {
    const service = this._services.noWaterService();
    const value = this.boolToContactState(status.noWater());
    service?.updateCharacteristic(this.platform.Characteristic.ContactSensorState, value);
  }

  updateTrayErrorService(status: MachineStatus) {
    const service = this._services.trayErrorService();
    const value = this.boolToContactState(status.trayError());
    service?.updateCharacteristic(this.platform.Characteristic.ContactSensorState, value);
  }

  updateDescealingService(status: MachineStatus) {
    const service = this._services.descealingService();
    const value = this.boolToContactState(status.needsDescealing());
    service?.updateCharacteristic(this.platform.Characteristic.ContactSensorState, value);
  }

  updateCapsuleService(capsuleCount: CapsuleCount) {
    const service = this._services.capsuleService();
    const value = this.boolToContactState(capsuleCount.capsulesLeft === 0);
    service?.updateCharacteristic(this.platform.Characteristic.ContactSensorState, value);
    const batteryService = this._services.batteryService();
    const maxCount = this.normalizedMaxCapsuleCount();
    const capsulesLeft = capsuleCount.capsulesLeft;
    const percentage = Math.floor((capsulesLeft / Math.max(maxCount, capsulesLeft)) * 100);
    this.platform.log.debug(`Percentage ${percentage}`);
    batteryService?.updateCharacteristic(this.platform.Characteristic.BatteryLevel, percentage);
    const level = percentage < 10 ? this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW
      : this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
    batteryService?.updateCharacteristic(this.platform.Characteristic.StatusLowBattery, level);
  }

  normalizedMaxCapsuleCount(): number {
    const configuredCount = this._config.max_capsule_count;
    if (isNaN(configuredCount)) {
      this.platform.log.debug('max_capsule_count not configured using 1000');
      return 1000;
    }
    if (configuredCount< 0) {
      this.platform.log.error('max_capsule_count below 0 does not make any sense!');
      return 1;
    } else if (configuredCount > 1000) {
      this.platform.log.error('max_capsule_count above 1000 is not possible!');
      return 1000;
    }
    return configuredCount;
  }

  boolToContactState(value: boolean): number {
    return value ?
      this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED
      : this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
  }
}
