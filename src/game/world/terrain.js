import { BLOCK, isSolid } from './blocks.js';

export const SIZE_X = 32;
export const SIZE_Z = 32;
export const HEIGHT = 24;

// Stores every block in one flat array (fast and memory-friendly).
export class World {
  constructor() {
    this.blocks = new Uint8Array(SIZE_X * SIZE_Z * HEIGHT);
  }

  index(x, y, z) {
    return x + z * SIZE_X + y * SIZE_X * SIZE_Z;
  }

  inBounds(x, y, z) {
    return x >= 0 && x < SIZE_X && y >= 0 && y < HEIGHT && z >= 0 && z < SIZE_Z;
  }

  // Outside the world counts as air (used for hiding faces in the mesher)
  getBlock(x, y, z) {
    if (!this.inBounds(x, y, z)) return BLOCK.AIR;
    return this.blocks[this.index(x, y, z)];
  }

  setBlock(x, y, z, id) {
    if (this.inBounds(x, y, z)) this.blocks[this.index(x, y, z)] = id;
  }

  // Used by collision. The floor and the four sides act as solid walls,
  // so the player cannot fall out of the small world.
  isSolidAt(x, y, z) {
    if (y < 0) return true;
    if (y >= HEIGHT) return false;
    if (x < 0 || x >= SIZE_X || z < 0 || z >= SIZE_Z) return true;
    return isSolid(this.blocks[this.index(x, y, z)]);
  }

  // Y just above the highest solid block in a column (for spawning)
  getSurfaceY(x, z) {
    for (let y = HEIGHT - 1; y >= 0; y--) {
      if (isSolid(this.getBlock(x, y, z))) return y + 1;
    }
    return 0;
  }
}

const ROCKY_HEIGHT = 14; // columns this tall get a gray stone peak

// Fills the world with hills: grass on top, dirt below, stone peaks and core.
// Uses simple sine waves, so no extra library is needed.
export function generateTerrain(world) {
  for (let z = 0; z < SIZE_Z; z++) {
    for (let x = 0; x < SIZE_X; x++) {
      let height = Math.round(
        10 + 3 * Math.sin(x * 0.2) + 3 * Math.cos(z * 0.17) + 1.5 * Math.sin((x + z) * 0.11)
      );
      height = Math.max(2, Math.min(HEIGHT - 2, height));
      const rocky = height >= ROCKY_HEIGHT;

      for (let y = 0; y <= height; y++) {
        let id = BLOCK.STONE;
        if (rocky && y >= height - 2) id = BLOCK.STONE; // gray peak
        else if (y === height) id = BLOCK.GRASS;
        else if (y >= height - 3) id = BLOCK.DIRT;
        world.setBlock(x, y, z, id);
      }
    }
  }
}