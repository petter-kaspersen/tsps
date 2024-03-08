import { Packet } from "../net/packet/Packet";

export class IncomingPacket {
  public opcode: number;
  public packet: Packet;

  constructor(packet: Packet) {
    this.packet = packet;
  }

  handle() {}
}
