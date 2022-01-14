import { PlatformAccessory } from 'homebridge';
import { AccessoryUtils } from './accessory';
import { IDeviceConfig } from './deviceConfig';
import { TemperatureType } from './temperatureType';

export enum CoffeeType {
    Ristretto = 0,
    Espresso = 1,
    Lungo = 2,
    Water = 4,
    Americano = 5
  }

export class CoffeeTypeUtils {
  public static all() : CoffeeType[] {
    return [CoffeeType.Ristretto, CoffeeType.Espresso, CoffeeType.Lungo, CoffeeType.Americano, CoffeeType.Water];
  }

  public static command(type: CoffeeType, temperature: TemperatureType) {
    const zeroPad = (num: number) => String(num).padStart(2, '0');
    const commandValue = '0305070400000000';
    const temperatureValue = zeroPad(temperature);
    const coffeValue = zeroPad(type);
    return commandValue + temperatureValue + coffeValue;
  }

  public static toUDID(accessory: PlatformAccessory, type: CoffeeType) : string {
    let suffix: string;
    switch(type) {
      case CoffeeType.Ristretto:
        suffix = 'ris';
        break;
      case CoffeeType.Espresso:
        suffix = 'esp';
        break;
      case CoffeeType.Lungo:
        suffix = 'lun';
        break;
      case CoffeeType.Americano:
        suffix = 'ame';
        break;
      case CoffeeType.Water:
        suffix = 'wat';
        break;
    }
    return AccessoryUtils.toUDID(accessory, suffix);
  }

  public static humanReadable(type: CoffeeType) : string {
    switch(type) {
      case CoffeeType.Ristretto:
        return 'Ristretto';
      case CoffeeType.Espresso:
        return 'Espresso';
      case CoffeeType.Lungo:
        return 'Lungo';
      case CoffeeType.Americano:
        return 'Americano';
      case CoffeeType.Water:
        return 'Water';
    }
  }

  public static isEnabled(type: CoffeeType, config: IDeviceConfig) : boolean {
    if (config && config.disabled_beverages) {
      return !config.disabled_beverages.some(b => b.toLowerCase() === this.humanReadable(type).toLowerCase());
    }
    return true;
  }
}
