export class Location {
  x: number;
  y: number;
  z: number;

  constructor(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = 0;
  }

  getRegionX() {
    return (this.x >> 3) - 6;
  }

  getRegionY() {
    return (this.y >> 3) - 6;
  }
}
