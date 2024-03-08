import net from "net";

import { Connection } from "./Connection";
import { CYCLE_RATE, DEFAULT_PORT } from "./constants/game";
import { Player } from "./player/Player";
import { PlayerSession } from "./net/PlayerSession";
import { World } from "./World";

export interface SocketWithPlayerSession extends net.Socket {
  session?: PlayerSession;
  player?: Player;
}

const server = net.createServer();

server.on("connection", handleConnection);
// TODO: Add error listeners and remove player from player list

// TODO:
// Not sure how I feel about this, but it works for now...
function handleConnection(conn: net.Socket) {
  new Connection(conn);
}

const world = new World();

setInterval(async () => {
  world.process();
}, CYCLE_RATE);

server.listen(DEFAULT_PORT, () => {
  console.log(`Server listening on port ${DEFAULT_PORT}`);
});
