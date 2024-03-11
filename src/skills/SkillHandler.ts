import { PacketBuilder } from "../net/packet/PacketBuilder";
import { Player } from "../player/Player";

export class SkillHandler {
  private player: Player;

  constructor(player: Player) {
    this.player = player;
  }

  sendSkill(skill: number) {
    new PacketBuilder(134)
      .writeByte(skill)
      .writeInt(99)
      .writeInt(99)
      .writeInt(15_000_000)
      .send(this.player.connection);
  }

  sendSkills() {
    for (let i = 0; i < 23; i++) {
      this.sendSkill(i);
    }
  }
}
