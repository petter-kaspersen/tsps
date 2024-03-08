import { CustomBuffer } from "../../helper/CustomBuffer";
import { SocketWithPlayerSession } from "../../server";
import { Endian } from "./OutgoingPacket";

export enum AccessType {
  BIT,
  BYTE,
}

export class PacketBuilder {
  private opcode: number;
  private bitPosition: number;
  private buffer: CustomBuffer = new CustomBuffer(Buffer.alloc(500));
  private byteSizePlaceholderIndex: number;

  public static BIT_MASK = [
    0, 0x1, 0x3, 0x7, 0xf, 0x1f, 0x3f, 0x7f, 0xff, 0x1ff, 0x3ff, 0x7ff, 0xfff,
    0x1fff, 0x3fff, 0x7fff, 0xffff, 0x1ffff, 0x3ffff, 0x7ffff, 0xfffff,
    0x1fffff, 0x3fffff, 0x7fffff, 0xffffff, 0x1ffffff, 0x3ffffff, 0x7ffffff,
    0xfffffff, 0x1fffffff, 0x3fffffff, 0x7fffffff, -1,
  ];

  constructor(opcode: number) {
    this.opcode = opcode;
  }

  initializeAccess(type: AccessType) {
    if (type === AccessType.BIT) {
      this.bitPosition = this.buffer.offset * 8;
    } else {
      this.buffer.offset = (this.bitPosition + 7) / 8;
    }

    return this;
  }

  writeBits(numBits: number, value: number) {
    let bytePos = this.bitPosition >> 3;
    let bitOffset = 8 - (this.bitPosition & 7);
    this.bitPosition += numBits;

    for (; numBits > bitOffset; bitOffset = 8) {
      this.buffer.buffer[bytePos] &= ~PacketBuilder.BIT_MASK[bitOffset];
      this.buffer.buffer[bytePos++] |=
        (value >> (numBits - bitOffset)) & PacketBuilder.BIT_MASK[bitOffset];
      numBits -= bitOffset;
    }
    if (numBits == bitOffset) {
      this.buffer.buffer[bytePos] &= ~PacketBuilder.BIT_MASK[bitOffset];
      this.buffer.buffer[bytePos] |= value & PacketBuilder.BIT_MASK[bitOffset];
    } else {
      this.buffer.buffer[bytePos] &= ~(
        PacketBuilder.BIT_MASK[numBits] <<
        (bitOffset - numBits)
      );
      this.buffer.buffer[bytePos] |=
        (value & PacketBuilder.BIT_MASK[numBits]) << (bitOffset - numBits);
    }
    return this;
  }

  writeShort(value: number, endian: number = Endian.Big) {
    if (endian === Endian.Big) {
      this.buffer.writeShort(value);
    } else {
      this.buffer.writeShortLE(value);
    }

    return this;
  }

  writeByte(value: number) {
    this.buffer.writeByte(value);

    return this;
  }

  writeByteSizePlaceholder() {
    const flooredOffset = Math.floor(this.buffer.offset);

    this.byteSizePlaceholderIndex = flooredOffset;

    this.buffer.writeByte(0);

    return this;
  }

  writeUByte(value: number) {
    this.buffer.writeUByte(value);

    return this;
  }

  writeLong(value: number) {
    this.buffer.writeLong(BigInt(value));

    return this;
  }

  send(connection: SocketWithPlayerSession) {
    const opcode =
      (this.opcode + Number(connection.session?.isaacEncoder.nextInt())) & 0xff;

    const length = Math.floor(this.buffer.offset);
    const prefixBuffer = new CustomBuffer(Buffer.alloc(3));

    prefixBuffer.writeByte(opcode);
    prefixBuffer.writeShort(length);

    const bufferToCopy = Buffer.alloc(length);
    this.buffer.buffer.copy(bufferToCopy);

    if (this.byteSizePlaceholderIndex) {
      const placeholderIndex = Math.floor(this.byteSizePlaceholderIndex);

      const length = Buffer.from(bufferToCopy).slice(
        placeholderIndex + 1
      ).byteLength;

      bufferToCopy[placeholderIndex] = -length;
    }

    const payload = Buffer.from([...prefixBuffer.buffer, ...bufferToCopy]);

    connection.write(payload);
  }

  writeString(value: string) {
    this.buffer.writeString(value);
    this.writeByte(10);

    return this;
  }

  writeInt(value: number) {
    this.buffer.writeInt(value);

    return this;
  }
}
