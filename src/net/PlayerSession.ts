import { Isaac } from "isaac-prng";

export class PlayerSession {
  public isaacDecoder: Isaac;
  public isaacEncoder: Isaac;

  constructor(decoder: Isaac, encoder: Isaac) {
    this.isaacDecoder = decoder;
    this.isaacEncoder = encoder;
  }
}
