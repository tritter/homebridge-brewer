import { PlatformAccessory, Logger } from 'homebridge';
import { CoffeeType, CoffeeTypeUtils, TemperatureType, TemperatureUtils } from '../models/cofeeTypes';
import { on, Peripheral, startScanningAsync, stopScanningAsync, Characteristic, removeAllListeners, state } from 'noble';
import MachineUDID from '../models/machineUDIDs';
import { MachineStatus } from '../models/machineStatus';
import { ResponseStatus } from '../models/responseStatus';
import { IDeviceConfig } from '../models/deviceConfig';
import { SliderStatus } from '../models/sliderStatus';
import { CapsuleCount } from '../models/capsuleCount';
import EventEmitter from 'events';

export interface IMachineController {
  isConnected(): boolean;
  isBrewing(type: CoffeeType): Promise<boolean>;
  brew(type: CoffeeType, temperature: TemperatureType): Promise<ResponseStatus | undefined>;
  cancel(): Promise<ResponseStatus | undefined>;
  reconnect(): Promise<void>;
  disconnect(): Promise<void>;
  assertBluetooth(): Promise<void>;
}

export interface IMachineControllerEvents {
  on(event: 'status', listener: (status: MachineStatus) => void): this;
  on(event: 'slider', listener: (status: SliderStatus) => void): this;
  on(event: 'capsule', listener: (count: CapsuleCount) => void): this;
}

export class MachineController extends EventEmitter implements IMachineController, IMachineControllerEvents {
  private readonly _config: IDeviceConfig;
  private _periphial: Peripheral | undefined;
  private _lastBrew: CoffeeType | undefined;
  private _lastStatus: MachineStatus | undefined;

  constructor(
    public readonly log: Logger,
    public readonly accessory: PlatformAccessory) {
    super();
    this._config = accessory.context.device;
    this.subscribeBluetoothState();
  }

  private subscribeBluetoothState() {
    on('stateChange', () => {
      if (state !== 'poweredOn') {
        this.log.error(`Bluetooth unavailable:${state}`);
        this.disconnect();
      }
    });
  }

  isConnected(): boolean {
    return this._periphial?.state === 'connected';
  }

  async isBrewing(type: CoffeeType): Promise<boolean> {
    return type === this._lastBrew && (this._lastStatus?.isBrewing() || true);
  }

  async brew(type: CoffeeType, temperature: TemperatureType): Promise<ResponseStatus | undefined> {
    const characteristics = await this.connect();
    this.log.info(this._lastStatus?.toString() ?? 'No status');
    if (this._lastStatus?.readyToBrew()) {
      this.log.debug('Machine seems to be ready');
      const response = await this.sendBrewCommand(characteristics, type, temperature);
      this._lastBrew = response.success ? type : undefined;
      this.log.debug('Received response!');
      this.reconnect();
      return response;
    }
    this._lastBrew = undefined;
    return undefined;
  }

  async cancel(): Promise<ResponseStatus | undefined> {
    this.log.info('Cancel command');
    const characteristics = await this.connect();
    const response = await this.sendCancelCommand(characteristics);
    this.reconnect();
    return response;
  }

  async reconnect(): Promise<void> {
    await this.disconnect();
    await this.connect();
  }

  async connect(): Promise<Characteristic[]> {
    const sessionRunning = this.isConnected();
    if (sessionRunning) {
      return await this.findCharacteristics(this._periphial!);
    }
    await this.disconnect();
    this._periphial = await this.find();
    const characteristics = await this.findCharacteristics(this._periphial!);
    this._periphial.on('disconnect', (error: string) => {
      this.log.debug('Machine did disconnect!');
      this._lastBrew = undefined;
      if (error) {
        this.log.error(error);
      }
      this.reconnect();
    });
    await this.authenticate(characteristics);
    await this.subscribe(characteristics);
    this.updateStates(characteristics);
    return characteristics;
  }

  async subscribe(characteristics: Characteristic[]) {
    await this.subscribeStatus(characteristics);
    await this.subscribeSliderStatus(characteristics);
    await this.subscribeCapsuleCount(characteristics);
    await this.subscribeResponse(characteristics);
  }

  async disconnect(): Promise<void> {
    this._periphial?.removeAllListeners('disconnect');
    if (this._periphial?.state === 'connected') {
      this.log.debug('Disconnecting...');
      await this._periphial?.disconnectAsync();
    }
    this._periphial = undefined;
    this._lastBrew = undefined;
  }

  async assertBluetooth(): Promise<void> {
    return new Promise((resolve, rejects) => {
      this.log.debug(`Bluetooth state:${state}`);
      if (state !== 'unknown') {
        resolve();
      } else {
        let emitter: EventEmitter | undefined = undefined;
        const changedHandler = (state: string) => {
          emitter?.removeListener('stateChange', changedHandler);
          if (state !== 'poweredOn') {
            this.log.error(`Bluetooth not available! ${state}`);
            rejects();
          } else {
            this.log.debug('Bluetooth is available');
            resolve();
          }
        };
        emitter = on('stateChange', changedHandler);
      }
    });
  }

  private find(): Promise<Peripheral> {
    removeAllListeners('discover');
    return new Promise((resolve, rejects) => {
      this.assertBluetooth().then(() => {
        this.log.debug('Start scan...');
        startScanningAsync([MachineUDID.services.auth, MachineUDID.services.command], false);
        on('discover', (peripheral: Peripheral) => {
          if (peripheral.advertisement.localName === this._config.name) {
            removeAllListeners('discover');
            peripheral.connect((error) => {
              if (error) {
                rejects('Error connecting to periphial');
              } else {
                this.log.debug(`Connected to ${peripheral.advertisement.localName}`);
                resolve(peripheral);
              }
            });
            stopScanningAsync();
          }
        });

      }).catch();
    });
  }

  private findCharacteristics(peripheral: Peripheral) : Promise<Characteristic[]> {
    return new Promise((resolve) => {
      peripheral.discoverAllServicesAndCharacteristics((error, services, characteristics) => {
        resolve(characteristics);
      });
    });
  }

  private authenticate(characteristics: Characteristic[]) : Promise<void> {
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

  private subscribeStatus(characteristics: Characteristic[]) : Promise<void> {
    return new Promise((resolve, rejects) => {
      this.log.debug('Start subscribe status');
      const statusCharacteristic = characteristics.find(char => char.uuid === MachineUDID.characteristics.status)!;
      this.log.debug(`Found notify status characteristic ${statusCharacteristic}`);
      statusCharacteristic.on('notify', (state: string) => {
        this.log.debug(`New notify ${state}`);
        state ? resolve() : rejects('Couldn\'t enable status notify');
      });
      statusCharacteristic.on('read', async (data: Buffer) => {
        this.log.debug('Received machine status change!');
        this._lastStatus = new MachineStatus(data);
        this.emit('status', this._lastStatus);
      });
      statusCharacteristic.notify(true, (error) => {
        if (error) {
          rejects(`Error enabling notify ${error}`);
        }
      });
    });
  }

  private subscribeSliderStatus(characteristics: Characteristic[]) : Promise<void> {
    return new Promise((resolve, rejects) => {
      this.log.debug('Start subscribe status');
      const statusCharacteristic = characteristics.find(char => char.uuid === MachineUDID.characteristics.slider)!;
      this.log.debug(`Found notify slider characteristic ${statusCharacteristic}`);
      statusCharacteristic.on('notify', (state: string) => {
        this.log.debug(`New notify ${state}`);
        state ? resolve() : rejects('Couldn\'t enable status notify');
      });
      statusCharacteristic.on('read', async (data: Buffer) => {
        this.log.debug('Received slider status change!');
        this.emit('slider', new SliderStatus(data));
      });
      statusCharacteristic.notify(true, (error) => {
        if (error) {
          rejects(`Error enabling notify ${error}`);
        }
      });
    });
  }

  private subscribeCapsuleCount(characteristics: Characteristic[]) : Promise<void> {
    return new Promise((resolve, rejects) => {
      this.log.debug('Start subscribe capsule counter');
      const capsuleCharacteristic = characteristics.find(char => char.uuid === MachineUDID.characteristics.capsules)!;
      this.log.debug(`Found capsule count characteristic ${capsuleCharacteristic}`);
      capsuleCharacteristic.on('notify', (state: string) => {
        this.log.debug(`New notify ${state}`);
        state ? resolve() : rejects('Couldn\'t enable status notify');
      });
      capsuleCharacteristic.on('read', async (data: Buffer) => {
        this.log.debug('Received capsule count change!');
        this.emit('capsule', new CapsuleCount(data));
      });
      capsuleCharacteristic.notify(true, (error) => {
        if (error) {
          rejects(`Error enabling notify ${error}`);
        }
      });
    });
  }

  private subscribeResponse(characteristics: Characteristic[]) : Promise<void> {
    return new Promise((resolve, rejects) => {
      this.log.debug('Start subscribe response');
      const responseCharacteristic = characteristics.find(char => char.uuid === MachineUDID.characteristics.response)!;
      this.log.debug(`Found response characteristic ${responseCharacteristic}`);
      responseCharacteristic.on('notify', (state: string) => {
        this.log.debug(`New notify ${state}`);
        state ? resolve() : rejects('Couldn\'t enable response notify');
      });
      responseCharacteristic.notify(true, (error) => {
        if (error) {
          rejects(`Error enabling notify ${error}`);
        }
      });
    });
  }

  private updateStates(characteristics: Characteristic[]) {
    this.log.debug('Request reading states');
    const statusCharacteristic = characteristics.find(char => char.uuid === MachineUDID.characteristics.status)!;
    const capsulesCharacteristic = characteristics.find(char => char.uuid === MachineUDID.characteristics.capsules)!;
    const sliderCharacteristic = characteristics.find(char => char.uuid === MachineUDID.characteristics.slider)!;
    statusCharacteristic.read();
    capsulesCharacteristic.read();
    sliderCharacteristic.read();
  }

  private sendBrewCommand(characteristics: Characteristic[],
    coffeeType: CoffeeType,
    temperature: TemperatureType) : Promise<ResponseStatus> {
    const command = CoffeeTypeUtils.command(coffeeType, temperature);
    this.log.info(`Writing brew ${CoffeeTypeUtils.humanReadable(coffeeType)} - ${TemperatureUtils.toString(temperature)} command`);
    return this.sendCommand(characteristics, this.generateBuffer(command));
  }

  private sendCancelCommand(characteristics: Characteristic[]) : Promise<ResponseStatus> {
    const command = new Uint8Array([ 0x03, 0x06, 0x01, 0x02]);
    this.log.info('Writing cancel command');
    return this.sendCommand(characteristics, Buffer.from(command));
  }

  private async sendCommand(characteristics: Characteristic[], buffer: Buffer) : Promise<ResponseStatus> {
    return new Promise((resolve, rejects) => {
      const receiveChar = characteristics.find(char => char.uuid === MachineUDID.characteristics.response)!;
      const sendChar = characteristics.find(char => char.uuid === MachineUDID.characteristics.request)!;
      this.log.debug(`Write characteristics:${sendChar}`);
      let emitter: EventEmitter | undefined = undefined;
      const readHandler = async (data: Buffer, isNotification: boolean) => {
        this.log.debug(`Received response: ${data.toString('hex')}`);
        if (isNotification) {
          this.updateStates(characteristics);
          const response = new ResponseStatus(data, buffer);
          this.log.debug(`Response ${response}`);
          emitter?.removeListener('read', readHandler);
          resolve(response);
        }
      };
      emitter = receiveChar.on('read', readHandler);
      this.log.debug(`Sending buffer: ${buffer.toString('hex')}`);
      this._lastStatus = undefined;
      sendChar!.write(buffer, true, (error) => {
        if (error) {
          this.log.error('Error writing command');
          rejects(error);
        }
      });
    });
  }
}