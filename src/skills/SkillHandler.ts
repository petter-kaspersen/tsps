import { OutgoingPacket } from "../net/packet/OutgoingPacket";
import { Player } from "../player/Player";

export class SkillHandler {
  private player: Player;

  constructor(player: Player) {
    this.player = player;
  }

  sendSkill(skill: number) {
    new OutgoingPacket(this.player.connection, 134, 13)
      .writeByte(skill)
      .writeInt(99)
      .writeInt(99)
      .writeInt(15_000_000)
      .send();
  }

  sendSkills() {
    for (let i = 0; i < 23; i++) {
      this.sendSkill(i);
    }
  }
}
