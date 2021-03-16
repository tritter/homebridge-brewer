
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

export class CoffeeTypeUtils {
  public static command(type: CoffeeType, temperature: TemperatureType) {
    const zeroPad = (num) => String(num).padStart(2, '0');
    const commandValue = '0305070400000000';
    const temperatureValue = zeroPad(temperature);
    const coffeValue = zeroPad(type);
    return commandValue + temperatureValue + coffeValue;
  }

  public static toUDID(type: CoffeeType) {
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