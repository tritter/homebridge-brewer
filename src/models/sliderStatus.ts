export class SliderStatus {
    public readonly closed: boolean;

    constructor(buffer: Buffer) {
      this.closed = (buffer[0] === 0x02);
    }

    public toString() : string {
      return `Slider:${(this.closed ? 'closed' : 'open')}`;
    }
}
