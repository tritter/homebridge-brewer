import { on, state } from '@abandonware/noble';
import EventEmitter from 'events';
import { Logger } from 'homebridge';

export const assertBluetooth = (log: Logger): Promise<void> => {
  return new Promise((resolve, rejects) => {
    log.debug(`Bluetooth state:${state}`);
    if (state !== 'unknown') {
      resolve();
    } else {
      let emitter: EventEmitter | undefined = undefined;
      const changedHandler = (state: string) => {
        emitter?.removeListener('stateChange', changedHandler);
        if (state !== 'poweredOn') {
          log.error(`Bluetooth not available! ${state}`);
          rejects();
        } else {
          log.debug('Bluetooth is available');
          resolve();
        }
      };
      emitter = on('stateChange', changedHandler);
    }
  });
};