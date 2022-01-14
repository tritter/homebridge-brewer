import { PlatformAccessory } from 'homebridge';

export class AccessoryUtils {
  public static toUDID(accessory: PlatformAccessory, suffix: string) {
    const uuid = accessory.UUID;
    return uuid.slice(0, suffix.length) + suffix;
  }
}
