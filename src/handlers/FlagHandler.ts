export class FlagHandler {
  private flags = new Set();

  flagged(flag: Flags) {
    return this.flags.has(flag);
  }

  setFlag(flag: Flags) {
    this.flags.add(flag);
  }

  reset() {
    this.flags.clear();
  }

  updateRequired() {
    return this.flags.size > 0;
  }
}

export enum Flags {
  APPEARANCE,
  FORCED_CHAT
}
