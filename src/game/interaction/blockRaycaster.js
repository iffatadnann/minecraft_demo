import { BLOCK } from '../world/blocks.js';

// Creates a reusable result object (so we don't allocate a new one every frame).
export function createHit() {
  return { x: 0, y: 0, z: 0, nx: 0, ny: 0, nz: 0 };
}

// Walks a ray through the block grid, one cell at a time (a "voxel traversal").
// origin and dir are {x, y, z}; dir must be normalized.
// On a hit, fills `out` with the block position (x, y, z) and the normal of the
// face that was hit (nx, ny, nz), which points toward the empty neighbor cell.
// Returns true if a block was hit within maxDistance.
export function raycastBlocks(world, origin, dir, maxDistance, out) {
  let x = Math.floor(origin.x);
  let y = Math.floor(origin.y);
  let z = Math.floor(origin.z);

  const stepX = dir.x > 0 ? 1 : -1;
  const stepY = dir.y > 0 ? 1 : -1;
  const stepZ = dir.z > 0 ? 1 : -1;

  // Distance along the ray needed to cross one whole cell on each axis
  const tDeltaX = dir.x !== 0 ? Math.abs(1 / dir.x) : Infinity;
  const tDeltaY = dir.y !== 0 ? Math.abs(1 / dir.y) : Infinity;
  const tDeltaZ = dir.z !== 0 ? Math.abs(1 / dir.z) : Infinity;

  // Distance along the ray to the first cell boundary on each axis
  let tMaxX = dir.x !== 0 ? (dir.x > 0 ? x + 1 - origin.x : origin.x - x) * tDeltaX : Infinity;
  let tMaxY = dir.y !== 0 ? (dir.y > 0 ? y + 1 - origin.y : origin.y - y) * tDeltaY : Infinity;
  let tMaxZ = dir.z !== 0 ? (dir.z > 0 ? z + 1 - origin.z : origin.z - z) * tDeltaZ : Infinity;

  let nx = 0;
  let ny = 0;
  let nz = 0;
  let t = 0;

  while (t <= maxDistance) {
    // getBlock treats everything outside the world as air, so rays can pass through
    if (world.getBlock(x, y, z) !== BLOCK.AIR) {
      out.x = x;
      out.y = y;
      out.z = z;
      out.nx = nx;
      out.ny = ny;
      out.nz = nz;
      return true;
    }

    // Step into the neighbor cell whose boundary is closest
    if (tMaxX < tMaxY && tMaxX < tMaxZ) {
      x += stepX;
      t = tMaxX;
      tMaxX += tDeltaX;
      nx = -stepX;
      ny = 0;
      nz = 0;
    } else if (tMaxY < tMaxZ) {
      y += stepY;
      t = tMaxY;
      tMaxY += tDeltaY;
      nx = 0;
      ny = -stepY;
      nz = 0;
    } else {
      z += stepZ;
      t = tMaxZ;
      tMaxZ += tDeltaZ;
      nx = 0;
      ny = 0;
      nz = -stepZ;
    }
  }
  return false;
}