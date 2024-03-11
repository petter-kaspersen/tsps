import { Packet } from "./net/packet/Packet";
import { Player } from "./player/Player";
import { SocketWithPlayerSession } from "./server";

import musicTracks from "../data/music.json";
import { Logger } from "./util/logger";

interface PacketToProcess {
  packet: Packet;
  player: Player;
}

export class World {
  static players: SocketWithPlayerSession[] = [];
  static packetsToProcess: PacketToProcess[] = [];

  private logger: Logger = new Logger("WORLD_HANDLER");

  process() {
    // console.log(`Processing ${World.packetsToProcess.length} packets...`);
    for (const { packet, player } of World.packetsToProcess) {
      World.packetsToProcess = World.packetsToProcess.filter(
        (p) => p.packet.id !== packet.id
      );

      if (packet.getOpcode() === 0) {
        continue;
      }

      this.logger.log(
        `Processing packet ${packet.id}, opcode: ${packet.getOpcode()}`
      );

      // Read the buffer

      if (packet.getOpcode() === 185) {
        const payload = packet.getPayload();

        const buttonId = payload.readInt();

        switch (buttonId) {
          case 1050:
            player.toggleRunState();
            break;
          case 2458:
            player.logout();
            break;
          case 42538:
            player.sendMusicTab();

            break;
          case 156:
            player.openWorldMap();

            break;
          case 166:
            player.performAnimation(866)
            break;
          default:
            const isMusicTrack = musicTracks.find(
              (track) => track.buttonId === buttonId
            );

            if (isMusicTrack) {
              player.playSong(isMusicTrack.songId);

              continue;
            }

            console.log("Unhandled button", buttonId);
            continue;
        }
      } else if (packet.getOpcode() === 130) {
        player.closeInterfaces();
      } else if (packet.getOpcode() === 164) {
        //  player.handleMovement(packet);
      } else if (packet.getOpcode() === 103) {
        const payload = packet.getPayload();

        const string = payload.buffer.toString();

        console.log(string);
      }
    }

    for (const session of World.players) {
      if (!session.remoteAddress) {
        session.destroy();
        return;
      }

      if (!session.session) {
        console.log(`Player ${session.remoteAddress} has no session`);
        continue;
      }
    }

    for (const session of World.players) {
      if (!session.session) {
        console.log(`Player ${session.remoteAddress} has no session`);
        continue;
      }

      const player = session.player as Player;

      if (player) {
        player.process();

        player.resetUpdate();
      }
    }
  }
}
