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
