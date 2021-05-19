import { PlatformAccessory } from 'homebridge';
import { IDeviceConfig } from './deviceConfig';

export enum CoffeeType {
    Ristretto = 0,
    Espresso = 1,
    Lungo = 2,
    Water = 4,
    Americano = 5
  }

export enum TemperatureType {
    Medium = 0,
    Low = 1,
    High = 2
}

export class AccessoryUtils {
  public static toUDID(accessory: PlatformAccessory, suffix: string) {
    const uuid = accessory.UUID;
    return uuid.slice(0, suffix.length) + suffix;
  }
}

export class TemperatureUtils {
  public static ofString(value: string) : TemperatureType {
    switch(value) {
      case 'Low':
        return TemperatureType.Low;
      case 'High':
        return TemperatureType.High;
      default:
        return TemperatureType.Medium;
    }
  }

  public static toString(type: TemperatureType) : string {
    switch(type) {
      case TemperatureType.Low:
        return 'Low';
      case TemperatureType.High:
        return 'High';
      default:
        return 'Medium';
    }
  }
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