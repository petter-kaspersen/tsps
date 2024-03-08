export class CustomBuffer {
  buffer: Buffer;

  public offset: number = 0;
  private bitOffset: number = 0;

  constructor(buffer: Buffer) {
    this.buffer = buffer;
  }

  readByte(): number {
    return this.buffer.readInt8(this.offset++);
  }

  writeByte(byte: number): void {
    this.buffer.writeInt8(byte, this.offset++);
  }

  writeUByte(byte: number) {
    this.buffer.writeUInt8(byte, this.offset++);
  }

  writeString(string: string): void {
    this.buffer.write(string, this.offset, string.length, "ascii");
    this.offset += string.length;
  }

  writeShort(short: number): void {
    this.buffer.writeInt16BE(short, this.offset);
    this.offset += 2;
  }

  writeShortLE(short: number): void {
    this.buffer.writeInt16LE(short, this.offset);
    this.offset += 2;
  }

  readUnsignedByte(): number {
    return this.buffer.readUInt8(this.offset++);
  }

  readLong(): bigint {
    const low = this.buffer.readInt32BE(this.offset) >>> 0; // Convert to unsigned
    const high = this.buffer.readInt32BE(this.offset + 4) >>> 0; // Convert to unsigned
    this.offset += 8;
    return (BigInt(high) << BigInt(32)) | BigInt(low);
  }

  readShort() {
    return this.buffer.readInt16BE(this.offset);
  }

  readInt(): number {
    const value = this.buffer.readInt32BE(this.offset);
    this.offset += 4; // Move offset by 4 bytes (size of int32)
    return value;
  }

  writeInt(value: number): void {
    this.buffer.writeInt32BE(value, this.offset);
    this.offset += 4;
  }

  readBytes(length: number): Buffer {
    const bytes = this.buffer.slice(this.offset, this.offset + length);
    this.offset += length;
    return bytes;
  }

  readString() {
    let temp = 0;
    let builder = "";
    while (
      this.offset < this.buffer.length &&
      (temp = this.buffer.readUInt8(this.offset++)) !== 10
    ) {
      builder += String.fromCharCode(temp);
    }
    return builder;
  }

  getLength(): number {
    return this.buffer.length;
  }

  getRemainingLength(): number {
    return this.buffer.length - this.offset;
  }

  getRemainingBuffer(): Buffer {
    return this.buffer.slice(this.offset);
  }

  toString(): string {
    return this.buffer.slice(this.offset).toString();
  }

  isReadable(bytes: number): boolean {
    return this.buffer.length - this.offset >= bytes;
  }

  static toBigInt(buffer: Buffer): bigint {
    const bufferAsHexString = buffer.toString("hex");
    return BigInt(`0x${bufferAsHexString}`);
  }

  writeBits(bits: number, value: number): void {
    while (bits > 0) {
      const remainingBitsInCurrentByte = 8 - this.bitOffset;
      const bitsToWrite = Math.min(bits, remainingBitsInCurrentByte);
      const bitMask = (1 << bitsToWrite) - 1;

      // Write the bits to the current byte
      const shiftedValue =
        (value & bitMask) << (remainingBitsInCurrentByte - bitsToWrite);
      this.buffer[this.offset] |= shiftedValue;

      // Update offsets and remaining bits
      bits -= bitsToWrite;
      this.bitOffset += bitsToWrite;

      if (this.bitOffset >= 8) {
        this.offset++;
        this.bitOffset = 0;
      }

      // Shift the value to get rid of the bits that have been written
      value >>= bitsToWrite;
    }
  }

  writeLong(longValue: bigint): void {
    const low = Number(longValue & BigInt(0xffffffff));
    const high = Number((longValue >> BigInt(32)) & BigInt(0xffffffff));

    this.writeInt(high);
    this.writeInt(low);
  }

  writeWordA(i: number): void {
    this.writeByte((i >> 8) & 0xff);
    this.writeByte((i + 128) & 0xff);
  }

  writeWord(i: number): void {
    this.writeByte((i >> 8) & 0xff);
    this.writeByte(i & 0xff);
  }
}
