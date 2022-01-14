export class ResponseStatus {
  public readonly success: boolean;
  public readonly reason: string;

  constructor(response: Buffer, sent: Buffer) {
    this.success = false;
    this.reason = '';

    if ((sent[0] !== (response[0] & 0x3F)) || (sent[1] !== response[1])) {
      this.reason = 'Received wrong response packet';
      return;
    }

    let code = 0;

    // Extract response code
    switch (response[0] & 0xC0) {
      case 0xC0:
        // error
        this.success = false;
        break;
      case 0x80:
        // ok
        this.success = true;
        break;
      default:
        this.success = false;
        break;
    }

    // Extract response code, either 1B or 2B response
    switch (response[2]) {
      case 1:
        code = response[3];
        break;
      case 2:
        code = (response[3]<<8) | (response[4]);
        break;
      default:
        this.reason = 'Unknown command';
    }

    // Check response code (assuming they have same global meaning)
    switch (code) {
      case 0x20:
        // ok - no extra logging
        this.success = true;
        break;
      case 0x21:
        this.reason = 'Brew cancelled';
        break;
      case 0x2412:
        this.reason = 'No capsule inserted';
        break;
      case 0x2408:
        this.reason = 'Tray open';
        break;
      case 0x3603:
        this.reason = 'Command error';
        break;
      default:
        this.reason = 'Unknown error';
        break;
    }
  }
}
