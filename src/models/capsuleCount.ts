export class CapsuleCount {
    public readonly enabled: boolean;
    public readonly capsulesLeft: number;

    constructor(buffer: Buffer) {
      const count = buffer[0];
      this.enabled = (count !== 0xffff);
      if (this.enabled) {
        this.capsulesLeft = buffer.readInt16BE(0);
      } else {
        this.capsulesLeft = 0;
      }
    }

    public toString() : string {
      return `Capsule counter:${(this.enabled ? 'enabled' : 'disabled')} capsules left:${this.capsulesLeft}`;
    }
}
