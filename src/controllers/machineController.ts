import { PlatformAccessory, Logger } from 'homebridge';
import { CoffeeType, CoffeeTypeUtils, TemperatureType, TemperatureUtils } from '../models/cofeeTypes';
import { on, Peripheral, startScanningAsync, stopScanningAsync, Characteristic, removeAllListeners } from 'noble';
import MachineUDID from '../models/machineUDIDs';
import { BrewStatus, MachineStatus } from '../models/machineStatus';
import { ResponseStatus } from '../models/responseStatus';
import { IDeviceConfig } from '../models/deviceConfig';


export interface IMachineController {
  brew(type: CoffeeType, temperature: TemperatureType): Promise<ResponseStatus | undefined>;
  isBrewing(type: CoffeeType): Promise<boolean>;
  cancel(): Promise<ResponseStatus | undefined>;
}

export class MachineController implements IMachineController {
  private readonly _config: IDeviceConfig;
  private _periphial: Peripheral | undefined;
  private _lastBrew: CoffeeType | undefined;

  constructor(
    public readonly log: Logger,
    public readonly accessory: PlatformAccessory) {
    this._config = accessory.context.device;
  }

  async brew(type: CoffeeType, temperature: TemperatureType): Promise<ResponseStatus | undefined> {
    const characteristics = await this.connect();
    const machineStatus = await this.readStatus(characteristics);
    this.log.debug(machineStatus.toString());
    if (machineStatus.status === BrewStatus.Ready) {
      this.log.debug('Machine seems to be ready');
      const response = await this.sendBrewCommand(characteristics, type, temperature);
      this.log.debug('Received response!');
      this._lastBrew = response.success ? type : undefined;
      return response;
    }
    this._lastBrew = undefined;
    return undefined;
  }

  async cancel(): Promise<ResponseStatus | undefined> {
    const characteristics = await this.connect();
    const machineStatus = await this.readStatus(characteristics);
    this.log.debug(machineStatus.toString());
    return this.sendCancelCommand(characteristics);
  }

  async isBrewing(type: CoffeeType): Promise<boolean> {
    return type === this._lastBrew;
  }

  async connect(): Promise<Characteristic[]> {
    if (this._periphial && this._periphial.state === 'connected') {
      //Make sure to disconnect first, bug on some systems like raspberry pi.
      await this.disconnect();
    }
    this._periphial = await this.find();
    this._periphial.on('disconnect', (error: string) => {
      this._lastBrew = undefined;
      if (error) {
        this.log.error(error);
      }
      this.log.info('Machine disconnected');
    });
    const characteristics = await this.findCharacteristics(this._periphial);
    await this.authenticate(characteristics);
    await this.subscribeStatus(characteristics);
    await this.subscribeResponse(characteristics);
    return characteristics;
  }

  async disconnect() {
    this._periphial?.removeAllListeners('disconnect');
    await this._periphial?.disconnectAsync();
    this._periphial = undefined;
    this._lastBrew = undefined;
  }

  find(): Promise<Peripheral> {
    removeAllListeners('discover');
    return new Promise((resolve, rejects) => {
      this.log.info('Start scan...');
      startScanningAsync([MachineUDID.services.auth, MachineUDID.services.command], false);
      on('discover', (peripheral: Peripheral) => {
        if (peripheral.advertisement.localName === this._config.name) {
          peripheral.connect((error) => {
            if (error) {
              rejects('Error connecting to periphial');
            } else {
              this.log.info(`Connected to ${peripheral.advertisement.localName}`);
              resolve(peripheral);
            }
          });
          stopScanningAsync();
        }
      });
    });
  }

  findCharacteristics(peripheral: Peripheral) : Promise<Characteristic[]> {
    return new Promise((resolve) => {
      peripheral.discoverAllServicesAndCharacteristics((error, services, characteristics) => {
        resolve(characteristics);
      });
    });
  }

  authenticate(characteristics: Characteristic[]) : Promise<void> {
    return new Promise((resolve, rejects) => {
      this.log.debug('Start Authentication');
      const data = this.generateKey();
      const authCharacteristic = characteristics.find(char => char.uuid === MachineUDID.characteristics.auth)!;
      authCharacteristic!.write(data, true, (error) => {
        if (error) {
          rejects(new Error('Error writing auth key!'));
        } else {
          resolve();
        }
      });
    });
  }

  private generateKey(): Buffer{
    const token = this._config.token?.replace(/-/g, '') ?? '';
    this.log.debug(`Token: ${token}`);
    return this.generateBuffer(token);
  }

  private generateBuffer(hex: string): Buffer {
    if (typeof hex !== 'string') {
      throw new TypeError('Expected input to be a string');
    }
    if ((hex.length % 2) !== 0) {
      throw new RangeError('Expected string to be an even number of characters');
    }
    const view = new Uint8Array(hex.length * 0.5);
    for (let i = 0; i < hex.length; i += 2) {
      view[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return Buffer.from(view);
  }

  subscribeStatus(characteristics: Characteristic[]) : Promise<void> {
    return new Promise((resolve, rejects) => {
      this.log.debug('Start subscribe status');
      const statusCharacteristic = characteristics.find(char => char.uuid === MachineUDID.characteristics.status)!;
      this.log.debug(`Found notify status characteristic ${statusCharacteristic}`);
      statusCharacteristic.on('notify', (state: string) => {
        this.log.debug(`New notify ${state}`);
        state ? resolve() : rejects('Couldn\'t enable status notify');
      });
      statusCharacteristic.notify(true, (error) => {
        if (error) {
          rejects(`Error enabling notify ${error}`);
        }
      });
    });
  }

  readStatus(characteristics: Characteristic[]) : Promise<MachineStatus> {
    return new Promise((resolve, rejects) => {
      const statusCharacteristic = characteristics.find(char => char.uuid === MachineUDID.characteristics.status)!;
      statusCharacteristic.read((error, buffer) => {
        this.log.debug(`Received status: ${error}`);
        if (error) {
          rejects('Error reading status');
        } else {
          resolve(new MachineStatus(buffer));
        }
      });
    });
  }

  subscribeResponse(characteristics: Characteristic[]) : Promise<void> {
    return new Promise((resolve, rejects) => {
      this.log.debug('Start subscribe status');
      const responseCharacteristic = characteristics.find(char => char.uuid === MachineUDID.characteristics.response)!;
      this.log.debug(`Found response status characteristic ${responseCharacteristic}`);
      responseCharacteristic.on('notify', (state: string) => {
        this.log.debug(`New notify ${state}`);
        state ? resolve() : rejects('Couldn\'t enable status notify');
      });
      responseCharacteristic.notify(true, (error) => {
        if (error) {
          rejects(`Error enabling notify ${error}`);
        }
      });
    });
  }

  private sendBrewCommand(characteristics: Characteristic[],
    coffeeType: CoffeeType,
    temperature: TemperatureType) : Promise<ResponseStatus> {
    const command = CoffeeTypeUtils.command(coffeeType, temperature);
    this.log.info(`Did write brew ${CoffeeTypeUtils.humanReadable(coffeeType)} - ${TemperatureUtils.toString(temperature)} command`);
    return this.sendCommand(characteristics, this.generateBuffer(command));
  }

  private sendCancelCommand(characteristics: Characteristic[]) : Promise<ResponseStatus> {
    const command = new Uint8Array([ 0x03, 0x06, 0x01, 0x02]);
    this.log.info('Did write cancel command');
    return this.sendCommand(characteristics, Buffer.from(command));
  }

  private async sendCommand(characteristics: Characteristic[], buffer: Buffer) : Promise<ResponseStatus> {
    return new Promise((resolve, rejects) => {
      const receiveChar = characteristics.find(char => char.uuid === MachineUDID.characteristics.response)!;
      const sendChar = characteristics.find(char => char.uuid === MachineUDID.characteristics.request)!;
      this.log.debug(`Write characteristics:${sendChar}`);
      receiveChar.on('read', async (data: Buffer, isNotification: boolean) => {
        this.log.debug(`Received response: ${data.toString('hex')} ${isNotification}`);
        if (isNotification) {
          const response = new ResponseStatus(data, buffer);
          this.log.debug(`Response ${response}`);
          resolve(response);
        }
      });
      this.log.debug(`Sending buffer: ${buffer.toString('hex')}`);
      sendChar!.write(buffer, true, (error) => {
        if (error) {
          this.log.error('Error writing command');
          rejects(error);
        }
      });
    });
  }
}