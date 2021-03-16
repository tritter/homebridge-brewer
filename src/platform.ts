import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { on, Peripheral, startScanningAsync, stopScanning } from 'noble';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { ExpertPlatformAccessory } from './platformAccessory';
import MachineUDID from './models/machineUDIDs';

export class NespressoPlatform implements DynamicPlatformPlugin {

  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('Finished initializing platform:', this.config.name);

    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      // run the method to discover / register your devices as accessories
      this.discoverDevices();
    });

    this.api.on('shutdown', () => {
      log.debug('Shutting down discovery');
      stopScanning();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.push(accessory);
  }

  discoverDevices() {
    const configuredDevices: [DeviceConfig] = this.config['devices'];
    const devicesMap = configuredDevices.reduce((a, x) => ({...a, [x.name]: x.token}), {});
    this.log.debug(`"Configured devices: ${configuredDevices.length}"`);
    this.log.debug('Start discovery');
    startScanningAsync([MachineUDID.services.auth, MachineUDID.services.command], false);
    on('discover', (peripheral: Peripheral) => {
      if (!devicesMap[peripheral.advertisement.localName]) {
        this.log.info(`Found new device, please add configuration for: "${peripheral.advertisement.localName}"`);
      }
    });

    for (const configuredDevice of configuredDevices) {
      const uuid = this.api.hap.uuid.generate(configuredDevice.name);
      const accessory = this.accessories.find(a => a.UUID === uuid);
      if (accessory) {
        this.log.info('Restoring existing accessory from cache:', accessory.displayName);
        accessory.context.device = configuredDevice;
        new ExpertPlatformAccessory(this, accessory);
        this.api.updatePlatformAccessories([accessory]);
      } else {
        this.log.info('Adding new accessory:', configuredDevice.name);
        const newAccessory = new this.api.platformAccessory(configuredDevice.name, uuid);
        newAccessory.context.device = configuredDevice;
        new ExpertPlatformAccessory(this, newAccessory);
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [newAccessory]);
      }
    }

    // Delete previously configured devices that don't exist anymore
    for (const existingAccessory of this.accessories) {
      if (!devicesMap[existingAccessory.context.device.name]) {
        this.log.debug('Removing unconfigured device');
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
        this.log.info('Removing existing accessory from cache:', existingAccessory.displayName);
      }
    }
  }
}
