import crypto from "crypto";
import { Isaac } from "isaac-prng";
import net from "net";
import { modPow } from "bigint-crypto-utils";

import { bigIntToByteArray } from "./helper/bigint";
import { CustomBuffer } from "./helper/CustomBuffer";
import { DecodePacket } from "./net/packet/DecodePacket";
import { Flags } from "./handlers/FlagHandler";
import { GAME_UID } from "./constants/game";
import { Logger } from "./util/logger";
import { LOGIN_STATUS_RESPONSE_CODE } from "./constants/login";
import { Player } from "./player/Player";
import { PlayerSession } from "./net/PlayerSession";
import { RSA_EXPONENT, RSA_MODULUS } from "./constants/network";
import { SocketWithPlayerSession } from "./server";
import { TAB_INTERFACES } from "./constants/interface";
import { World } from "./World";
import { PacketBuilder } from "./net/packet/PacketBuilder";

const CONNECTION_TYPES = {
  LOGIN_REQUEST: 14,
  UPDATE: 15,
  NEW_CONNECTION_LOGIN: 16,
  RECONNECTING_LOGIN: 18,
};

export class Connection {
  private remoteAddress: string;
  private connection: SocketWithPlayerSession;
  private logger = new Logger("CONNECTION_HANDLER");

  private loginState: number = 0;

  constructor(connection: net.Socket) {
    this.remoteAddress = `${connection.remoteAddress}:${connection.remotePort}`;
    this.logger.success(`New client connection from ${this.remoteAddress}`);

    this.connection = connection as SocketWithPlayerSession;

    this.connection.on("data", (data: Buffer) => {
      this.handleData(new CustomBuffer(data));
    });
  }

  async handleData(data: CustomBuffer) {
    if (this.loginState === 0) {
      this.handleLoginRequest(data);
    } else if (this.loginState === 1) {
      this.handleLoginType(data);
    }
  }

  handleLoginRequest(buffer: CustomBuffer) {
    if (buffer.readUnsignedByte() !== CONNECTION_TYPES.LOGIN_REQUEST) {
      this.logger.error(`Invalid login request from ${this.remoteAddress}`);
      this.connection.write(Buffer.from([10]));
      return;
    }

    this.logger.log(`Received login request from ${this.remoteAddress}`);

    this.loginState = 1;
    this.connection.write(Buffer.from([0, ...crypto.randomBytes(8)]));
  }

  handleLoginType(buffer: CustomBuffer) {
    if (buffer.readUnsignedByte() !== CONNECTION_TYPES.NEW_CONNECTION_LOGIN) {
      this.logger.error(`Invalid login type from ${this.remoteAddress}`);
      this.connection.write(Buffer.from([10]));
      this.connection.destroy();
      return;
    }

    this.logger.log(`Received new connection login from ${this.remoteAddress}`);

    this.loginState = 2;

    this.handleLogin(buffer);
  }

  handleLogin(buffer: CustomBuffer) {
    this.logger.log(`Handling login for ${this.remoteAddress}`);

    const encryptedBlockSize = buffer.readUnsignedByte();

    if (encryptedBlockSize !== buffer.getRemainingLength()) {
      this.logger.error(
        `Invalid encrypted block size from ${this.remoteAddress}`
      );
      this.sendLoginResponse(LOGIN_STATUS_RESPONSE_CODE.LOGIN_REJECT_SESSION);
      return;
    }

    const magicId = buffer.readUnsignedByte();

    if (magicId !== 0xff) {
      this.logger.error(`Invalid magic id from ${this.remoteAddress}`);
      this.sendLoginResponse(LOGIN_STATUS_RESPONSE_CODE.LOGIN_REJECT_SESSION);
      return;
    }

    const memory = buffer.readByte();

    if (![0, 1].includes(memory)) {
      this.logger.error(`Invalid memory from ${this.remoteAddress}`);
      this.sendLoginResponse(LOGIN_STATUS_RESPONSE_CODE.LOGIN_REJECT_SESSION);
      return;
    }

    const rsaLength = buffer.readUnsignedByte();

    const rsaRawBuffer = buffer.readBytes(rsaLength);

    const rsaBufferAsBigInt = CustomBuffer.toBigInt(rsaRawBuffer);

    const decodedRsaBuffer = modPow(
      rsaBufferAsBigInt,
      RSA_EXPONENT,
      RSA_MODULUS
    );

    const rsaBuffer = new CustomBuffer(
      Buffer.from(bigIntToByteArray(decodedRsaBuffer))
    );

    const securityId = rsaBuffer.readByte();

    if (securityId !== 10) {
      this.logger.error(`Invalid security id from ${this.remoteAddress}`);
      this.sendLoginResponse(LOGIN_STATUS_RESPONSE_CODE.LOGIN_REJECT_SESSION);
      return;
    }

    // Client Seed
    const clientSeed = rsaBuffer.readLong();

    // Seed received
    const seedReceived = rsaBuffer.readLong();

    const MAX_INT32 = 0x7fffffff;
    const MIN_INT32 = -0x80000000;

    function toInt32(n: bigint) {
      n = BigInt(n);
      if (n > BigInt(MAX_INT32)) {
        return BigInt.asIntN(32, n - BigInt(0x100000000));
      } else if (n < BigInt(MIN_INT32)) {
        return BigInt.asIntN(32, n + BigInt(0x100000000));
      } else {
        return n;
      }
    }

    const seed = [
      toInt32(clientSeed),
      toInt32(clientSeed >> 32n),
      toInt32(seedReceived),
      toInt32(seedReceived >> 32n),
    ];

    const decoder = new Isaac([...seed.map(Number)]);

    for (let i = 0; i < seed.length; i++) {
      seed[i] += 50n;
    }

    const encoder = new Isaac([...seed.map(Number)]);

    const uid = rsaBuffer.readInt();

    if (uid !== GAME_UID) {
      this.logger.error(`Invalid uid from ${this.remoteAddress}`);
      this.sendLoginResponse(LOGIN_STATUS_RESPONSE_CODE.LOGIN_REJECT_SESSION);
      return;
    }

    const username = rsaBuffer.readString();
    const password = rsaBuffer.readString();

    this.logger.success(
      `Received successful login request from ${this.remoteAddress} with username ${username} and password ${password}`
    );

    this.loginState = -1;

    this.connection.session = new PlayerSession(decoder, encoder);
    this.connection.player = new Player(this.connection);

    this.finalizeLogin(username, password);
  }

  sendLoginResponse(opcode: number) {
    this.connection.write(Buffer.from([opcode]));
  }

  finalizeLogin(username: string, password: string) {
    this.logger.success(
      `Finalizing login for ${this.remoteAddress} with username ${username} and password ${password}`
    );

    this.connection.write(Buffer.from([2, 1]));

    this.connection.removeAllListeners("data");

    World.players.push(this.connection);

    if (!this.connection.session || !this.connection.player) {
      this.logger.error(`Invalid session or player for ${this.remoteAddress}`);
      return;
    }

    new PacketBuilder(73).writeWordA(400).writeShort(400).send(this.connection);

    // TODO: Move this, also, render magic tab.
    for (let i = 0; i < TAB_INTERFACES.length; i++) {
      if (i === 6) {
        continue;
      }

      const tab = TAB_INTERFACES[i];

      new PacketBuilder(71)
        .writeShort(tab)
        .writeByte(i + 128)
        .send(this.connection);
    }

    const player = this.connection.player;

    player.updateFlags.setFlag(Flags.APPEARANCE);
    player.updateFlags.setFlag(Flags.FORCED_CHAT);

    player.messageFromServer("Welcome to RuneScape.");

    // Write song...
    // player.playSong(35);

    this.connection.on("data", (data: Buffer) => {
      if (!this.connection.session) {
        return;
      }

      const packets = new DecodePacket(
        new CustomBuffer(data),
        this.connection.session.isaacDecoder
      ).getPackets();

      for (const packet of packets) {
        World.packetsToProcess.push({ packet, player });
      }
    });
  }
}
