import { v4 as uuid } from "uuid";
import { CustomBuffer } from "../../helper/CustomBuffer";

export class Packet {
  private opcode: number;
  private buffer: CustomBuffer;
  public id: string = uuid();

  constructor(opcode: number, buffer: CustomBuffer) {
    this.opcode = opcode;
    this.buffer = buffer;
    this.id;
  }

  getOpcode(): number {
    return this.opcode;
  }

  getPayload(): CustomBuffer {
    return this.buffer;
  }

  getLength(): number {
    return this.buffer.buffer.length;
  }
}
