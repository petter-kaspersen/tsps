import { Packet } from "../net/packet/Packet";

export class IncomingPacketHandler {
  private packet: Packet;

  constructor(packet: Packet) {
    this.packet = packet;
  }
}
