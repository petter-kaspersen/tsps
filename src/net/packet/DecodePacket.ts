import { CustomBuffer } from "../../helper/CustomBuffer";
import { PACKET_SIZES } from "../../constants/packet";
import { Packet } from "./Packet";
import { Isaac } from "isaac-prng";

export class DecodePacket {
  private buffer: CustomBuffer;
  private decoder: Isaac;
  private packets: Packet[] = [];

  constructor(buffer: CustomBuffer, decoder: Isaac) {
    this.buffer = buffer;
    this.decoder = decoder;

    this.decodePackets();
  }

  decodePackets() {
    let hasMorePackets = true;

    let buffer = this.buffer;

    while (hasMorePackets) {
      const result = this.decodePacket(buffer);

      if (result) {
        this.packets.push(result.packet);

        if (result.remaining > 0) {
          buffer = new CustomBuffer(buffer.getRemainingBuffer());
        } else {
          hasMorePackets = false;
        }
      } else {
        hasMorePackets = false;
      }
    }
  }

  decodePacket(buffer: CustomBuffer) {
    let opcode = -1;
    let size = -1;

    if (opcode === -1) {
      opcode = buffer.readByte();
      const nextInt = this.decoder.nextInt();

      opcode = (opcode - Number(nextInt)) & 0xff;

      size = PACKET_SIZES[opcode];
    }

    if (size === -1) {
      if (buffer.isReadable(1)) {
        size = buffer.readUnsignedByte() & 0xff;
      } else {
        return;
      }
    }

    if (!buffer.isReadable(size)) return;

    const payload = buffer.readBytes(size);

    const remaining = buffer.getRemainingLength();

    return {
      packet: new Packet(opcode, new CustomBuffer(payload)),
      remaining,
    };
  }

  getPackets() {
    return this.packets;
  }
}
