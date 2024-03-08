import { Location } from "../Location";
import { World } from "../World";
import { DEFAULT_LOCATION } from "../constants/game";
import { FlagHandler, Flags } from "../handlers/FlagHandler";
import { Logger } from "../util/logger";
import { Endian, OutgoingPacket } from "../net/packet/OutgoingPacket";
import { AccessType, PacketBuilder } from "../net/packet/PacketBuilder";
import { PlayerSession } from "../net/PlayerSession";
import { Packet } from "../net/packet/Packet";
import { SocketWithPlayerSession } from "../server";
import { SkillHandler } from "../skills/SkillHandler";

export class Player {
  public connection: SocketWithPlayerSession;
  private logger = new Logger("PLAYER");

  public skillHandler: SkillHandler = new SkillHandler(this);

  private runEnergy: number = 100;
  private specialAttack: number = 100;

  private location: Location = new Location(
    DEFAULT_LOCATION.x,
    DEFAULT_LOCATION.y,
    0
  );

  public updateFlags: FlagHandler = new FlagHandler();
  private needsPlacement: boolean = true;

  constructor(conn: SocketWithPlayerSession) {
    this.connection = conn;
  }

  messageFromServer(message: string) {
    new OutgoingPacket(this.connection, 253, message.length + 2)
      .writeByte(message.length + 1)
      .writeString(message)
      .writeByte(10)
      .send();
  }

  sendRunEnergy() {
    new OutgoingPacket(this.connection, 110, 1)
      .writeByte(this.runEnergy)
      .send();
  }

  sendSpecialAttack() {
    new OutgoingPacket(this.connection, 137, 1)
      .writeByte(this.specialAttack)
      .send();
  }

  setRunEnergy(energy: number) {
    this.runEnergy = energy;
  }

  process() {
    if (!this.connection.session) {
      return;
    }

    this.update();

    this.sendRunEnergy();
    this.sendSpecialAttack();
    this.writeInventory();
  }

  logout() {
    new PacketBuilder(109).send(this.connection);
    this.connection.destroy();
    World.players = World.players.filter((p) => p !== this.connection);
  }

  sendMusicTab() {
    new OutgoingPacket(this.connection, 71, 3)
      .writeShort(962) // 42500
      .writeByte(11 + 128)
      .send();
  }

  playSong(songId: number) {
    new OutgoingPacket(this.connection, 121, 4)
      .writeShort(songId)
      .writeShort(0)
      .send();
  }

  openWorldMap() {
    new OutgoingPacket(this.connection, 97, 2).writeShort(54000).send();
  }

  closeInterfaces() {
    new OutgoingPacket(this.connection, 219, 0).send();
  }

  writeInventory() {
    // The size of the buffer is 8 + 6 * numItems
    // The size of the varSize is 6 + 6 * numItems
    const inventoryPacket = new OutgoingPacket(this.connection, 53, 8 + 6 * 28)
      .writeShort(6 + 6 * 28)
      .writeInt(3214)
      .writeShort(28);

    for (let i = 0; i < 28; i++) {
      inventoryPacket.writeInt(1);
      inventoryPacket.writeShort(11803);
    }

    inventoryPacket.send();
  }

  update() {
    const packet = new PacketBuilder(81).initializeAccess(AccessType.BIT);

    this.appendPlacement(packet);

    packet
      .writeBits(8, 0)
      .writeBits(11, 2047)
      .initializeAccess(AccessType.BYTE);

    if (this.updateFlags.updateRequired()) {
      let mask = 0;

      /*       if (this.updateFlags.flagged(Flags.FORCED_CHAT)) {
        mask |= 0x4;
      } */
      if (this.updateFlags.flagged(Flags.APPEARANCE)) {
        mask |= 0x10;
      }

      /*       if (mask >= 0x100) {
        mask |= 0x40;
        packet.writeShort(mask, Endian.Little);
      } */

      packet.writeByte(mask);
    }

    /*     if (this.updateFlags.flagged(Flags.FORCED_CHAT)) {
      packet.writeString("Hello, world!");
    }
 */
    if (this.updateFlags.flagged(Flags.APPEARANCE)) {
      this.appendAppearance(packet);
    }

    packet.send(this.connection);
  }

  appendPlacement(builder: PacketBuilder) {
    if (this.needsPlacement) {
      return builder
        .writeBits(1, 1)
        .writeBits(2, 3)
        .writeBits(2, 0) // z
        .writeBits(1, 1) // Discard movement queue
        .writeBits(1, this.updateFlags.updateRequired() ? 1 : 0)
        .writeBits(7, 52)
        .writeBits(7, 52);
    } else {
      return builder.writeBits(1, 0); // No update required
    }

    // Run in a direction... forever
    /*     return builder
      .writeBits(1, 1)
      .writeBits(2, 2)
      .writeBits(3, 2)
      .writeBits(3, 2)
      .writeBits(1, 0); */
  }

  appendAppearance(builder: PacketBuilder) {
    builder
      .writeByteSizePlaceholder()

      // Gender
      .writeByte(0)

      // Prayer icon, -1 no prayer
      .writeByte(-1)

      // Skull icon, -1 no skull
      .writeByte(-1)

      // Some overhead
      .writeByte(0)

      .writeByte(0)
      .writeByte(0)
      .writeByte(0)
      .writeByte(0)

      // Body
      .writeShort(0x100 | 18)

      .writeByte(0) // 17

      .writeShort(0x100 | 26)
      .writeShort(0x100 | 36)
      .writeShort(0x100 | 0) // HEAD
      .writeShort(0x100 | 33) // ARMS?
      .writeShort(0x100 | 42) // FEET
      .writeShort(0x200 + 11802) // WEAPON

      .writeByte(0) // Color 1
      .writeByte(1) // Color 2
      .writeByte(2) // Color 3
      .writeByte(3) // Color 4
      .writeByte(4) // Color 5

      .writeShort(7053) // Stand anim
      .writeShort(823) // Anim 2
      .writeShort(820) // Anim 3
      .writeShort(821) // Anim 4
      .writeShort(822) // Anim 5
      .writeShort(823) // Anim 6
      .writeShort(824) // Anim 7

      // Username
      .writeLong(0x03)

      // Combat level
      .writeByte(3)

      // Player rights
      .writeByte(3);
  }

  resetUpdate() {
    this.updateFlags.reset();
    this.needsPlacement = false;
  }

  handleMovement(packet: Packet) {
    const payload = packet.getPayload();
    /* 
    int absoluteX = packet.readShort();
    int absoluteY = packet.readShort();
    int plane = packet.readUnsignedByte(); */

    const absoluteX = payload.readShort();
    const absoluteY = payload.readShort();
    const plane = payload.readUnsignedByte();

    console.log(absoluteX, absoluteY, plane);
  }

  /*   PacketBuilder out = new PacketBuilder(113);
		out.put(player.isRunning() ? 1 : 0); */

  sendRunStatus() {
    new OutgoingPacket(this.connection, 113, 1).writeByte(1).send();
  }
}
