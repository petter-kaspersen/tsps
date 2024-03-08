/**
 * The outgoing packet type creates an encoded packet to be sent to the client.
 */

import { Isaac } from "isaac-prng";
import { CustomBuffer } from "../../helper/CustomBuffer";
import { SocketWithPlayerSession } from "../../server";

export const Endian = {
  Big: 0,
  Little: 1,
};

export class OutgoingPacket {
  private opcode: number;
  private connection: SocketWithPlayerSession;
  private bitPos: number = 0;

  private outgoingBuffer: CustomBuffer;

  static crctable: Int32Array = new Int32Array(256);
  static CRC32_POLYNOMIAL: number = 0xedb8832;
  static bitmask: Uint32Array = new Uint32Array(33);

  static {
    for (let i: number = 0; i < 32; i++) {
      OutgoingPacket.bitmask[i] = (1 << i) - 1;
    }
    OutgoingPacket.bitmask[32] = 0xffffffff;

    for (let i: number = 0; i < 256; i++) {
      let remainder: number = i;

      for (let bit: number = 0; bit < 8; bit++) {
        if ((remainder & 1) == 1) {
          remainder = (remainder >>> 1) ^ OutgoingPacket.CRC32_POLYNOMIAL;
        } else {
          remainder >>>= 1;
        }
      }

      OutgoingPacket.crctable[i] = remainder;
    }
  }

  constructor(
    connection: SocketWithPlayerSession,
    opcode: number,
    size: number
  ) {
    this.connection = connection;
    this.opcode = opcode;
    this.outgoingBuffer = new CustomBuffer(
      size === -1 ? Buffer.allocUnsafe(0) : Buffer.alloc(size).fill(0x01)
    );
  }

  send() {
    const opcode =
      (this.opcode + Number(this.connection.session?.isaacEncoder.nextInt())) &
      0xff;

    const payload = Buffer.from([opcode, ...this.outgoingBuffer.buffer]);

    this.connection.write(payload);
  }

  writeShort(value: number, endian: number = Endian.Big) {
    if (endian === Endian.Big) {
      this.outgoingBuffer.writeShort(value);
    } else {
      this.outgoingBuffer.writeShortLE(value);
    }

    return this;
  }

  writeByte(value: number) {
    this.outgoingBuffer.writeByte(value);

    return this;
  }

  writeBytes(value: Buffer) {
    for (let i = 0; i < value.length; i++) {
      this.outgoingBuffer.writeByte(value[i]);
    }

    return this;
  }

  writeString(value: string) {
    this.outgoingBuffer.writeString(value);

    return this;
  }

  writeInt(value: number) {
    this.outgoingBuffer.writeInt(value);

    return this;
  }

  getBuffer() {
    return this.outgoingBuffer.buffer;
  }

  writeBits(numBits: number, value: number) {
    const buffer = this.outgoingBuffer.buffer;

    let bytePos = this.bitPos >> 3;
    let bitPosWithinByte = 7 - (this.bitPos & 7);

    for (let i = 0; i < numBits; i++) {
      const bitOffset = 7 - (bitPosWithinByte % 8);
      const byteIndex = bytePos + (bitPosWithinByte >> 3);

      buffer[byteIndex] &= ~(1 << bitOffset);
      buffer[byteIndex] |= ((value >>> (numBits - i - 1)) & 1) << bitOffset;

      bitPosWithinByte++;
    }

    this.bitPos += numBits;
    this.outgoingBuffer.buffer = buffer;
    return this;
  }

  writeLong(value: bigint) {
    this.outgoingBuffer.writeLong(value);
    return this;
  }

  sendSound(id: number, volume: number, delay: number) {
    const newPacket = new OutgoingPacket(this.connection, 175, 5);

    newPacket.writeShort(id, Endian.Little);
    this.writeByte(volume);
    this.writeShort(delay);
    this.send();
  }

  writeWord(value: number) {
    this.outgoingBuffer.writeWord(value);
    return this;
  }

  writeWordA(value: number) {
    this.outgoingBuffer.writeWordA(value);
    return this;
  }

  getOffset() {
    return this.outgoingBuffer.offset;
  }

  setOffset(offset: number) {
    this.outgoingBuffer.offset = offset;
    return this;
  }

  psize2(size: number) {
    this.outgoingBuffer.buffer[this.getOffset() - size - 2] = size >>> 8;
    this.outgoingBuffer.buffer[this.getOffset() - size - 1] = size;

    return this;
  }
}
