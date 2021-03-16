export enum BrewStatus {
  Unknown,
  Ready,
  Busy,
  Error
}

export class MachineStatus {
    public readonly status: BrewStatus;
    public readonly statusMessage: string;
    public readonly errorMessage: string;

    constructor(buffer: Buffer) {
      this.status = BrewStatus.Ready;
      let message = '';
      let error = '';


      if ( buffer[0] & 0x01 ) {
        // Water empty
        error += 'no water ';
      }

      switch ( buffer[0] & 0x11 ) {
        case 0x01:						 // Water empty
          error += 'water empty';
          break;
        case 0x10:						// It seems that these correpsonds with water empty
          error += 'Capsule mechanism jammed';
          break;
        case 0x11:
          error += 'water empty + jammed';
          break;
      }
      if ( 0x04 & buffer[0] ) {	// tray open
        error += 'Tray open';
      }
      if ( 0x84 === (buffer[1] & 0x84) ) {	// capsule engage + water pump engaged
        message += 'Brewing...';
        this.status = BrewStatus.Busy;
      }
      if ( 0x04 === (buffer[1] & 0x84) ) {	// water pump engaged
        message += 'Pumping...';
        this.status = BrewStatus.Busy;
      }
      if ( 0x40 & buffer[1] ) {	// tray open
        error += 'Tray open/sensor full';
      }
      if ( 0x09 === (buffer[1] & 0x09 ) ) {
        message += 'Device is sleeping';
      }
      if ( 0x01 === (buffer[1] & 0x09 ) ) {
        error += 'Low water';
      }
      if ( 0x02 & buffer[1]) {
        message += 'Ok';
      }

      this.errorMessage = error;
      this.statusMessage = message;
      if (error.length > 0) {
        this.status = BrewStatus.Error;
      }
    }

    public toString() : string {
      return `${this.status}: ${this.statusMessage} ${this.errorMessage}`;
    }
}