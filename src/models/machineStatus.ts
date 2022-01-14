export enum MachineState {
  Unknown = 0,
  NoWater = 1,
  NeedsDescealing = 4,
  TrayJammed = 16,
  Error = 32,
  Ok = 64
}

export enum BrewState {
  Unknown = 0,
  LowTemperature = 1,
  Ready = 2,
  Pumping = 4,
  Sleeping = 8,
  TrayJammed = 16,
  TrayOpen = 64,
  CapsuleEngaged = 128
}

export class MachineStatus {
    public readonly machineState: MachineState;
    public readonly brewState: BrewState;

    constructor(buffer: Buffer) {
      this.machineState = buffer[0];
      this.brewState = buffer[1];

      const machineStateBuffer = buffer[0];
      if (this.containsFlag(machineStateBuffer, MachineState.Ok)) {
        this.machineState |= MachineState.Ok;
      }
      if (this.containsFlag(machineStateBuffer, MachineState.NoWater)) {
        this.machineState |= MachineState.NoWater;
      }
      if (this.containsFlag(machineStateBuffer, MachineState.NeedsDescealing)) {
        this.machineState |= MachineState.NeedsDescealing;
      }
      if (this.containsFlag(machineStateBuffer, MachineState.TrayJammed)) {
        this.machineState |= MachineState.TrayJammed;
      }
      if (this.containsFlag(machineStateBuffer, MachineState.Error)) {
        this.machineState |= MachineState.Error;
      }

      const brewStateBuffer = buffer[1];
      if (this.containsFlag(brewStateBuffer, BrewState.Unknown)) {
        this.brewState |= BrewState.Unknown;
      }
      if (this.containsFlag(brewStateBuffer, BrewState.LowTemperature)) {
        this.brewState |= BrewState.LowTemperature;
      }
      if (this.containsFlag(brewStateBuffer, BrewState.Ready)) {
        this.brewState |= BrewState.Ready;
      }
      if (this.containsFlag(brewStateBuffer, BrewState.Sleeping)) {
        this.brewState |= BrewState.Sleeping;
      }
      if (this.containsFlag(brewStateBuffer, BrewState.TrayJammed)) {
        this.brewState |= BrewState.TrayJammed;
      }
      if (this.containsFlag(brewStateBuffer, BrewState.TrayOpen)) {
        this.brewState |= BrewState.TrayOpen;
      }
      if (this.containsFlag(brewStateBuffer, BrewState.CapsuleEngaged)) {
        this.brewState |= BrewState.CapsuleEngaged;
      }
    }

    containsFlag(number: number, flag: number) {
      return (number & flag) === flag;
    }

    public readyToBrew(): boolean {
      return this.containsFlag(this.machineState, MachineState.Ok)
      && !this.trayError() && !this.isBrewing();
    }

    public isBrewing(): boolean {
      return this.containsFlag(this.brewState, BrewState.Pumping);
    }

    public noWater(): boolean {
      return this.containsFlag(this.machineState, MachineState.NoWater);
    }

    public trayError(): boolean {
      return this.containsFlag(this.machineState, MachineState.TrayJammed)
      || this.containsFlag(this.brewState, BrewState.TrayJammed)
      || this.containsFlag(this.brewState, BrewState.TrayOpen);
    }

    public needsDescealing(): boolean {
      return this.containsFlag(this.machineState, MachineState.NeedsDescealing);
    }

    public toString() : string {
      return `Ready:${this.readyToBrew()}, brewing:${this.isBrewing()}, no water:${this.noWater()}, tray error:${this.trayError()}`;
    }
}
