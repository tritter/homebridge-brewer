import { PlatformAccessory } from 'homebridge';

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
  public static command(type: CoffeeType, temperature: TemperatureType) {
    const zeroPad = (num: number) => String(num).padStart(2, '0');
    const commandValue = '0305070400000000';
    const temperatureValue = zeroPad(temperature);
    const coffeValue = zeroPad(type);
    return commandValue + temperatureValue + coffeValue;
  }

  public static toUDID(accessory: PlatformAccessory, type: CoffeeType) {
    const uuid = accessory.UUID;
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
    return uuid.slice(0, suffix.length) + suffix;
  }

  public static humanReadable(type: CoffeeType) {
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
}