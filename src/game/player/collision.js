// Player is a box: 0.6 wide and 1.8 tall. pos is the center of the feet.
export const PLAYER_HALF_WIDTH = 0.3;
export const PLAYER_HEIGHT = 1.8;

const EPS = 1e-4; // avoids touching a neighboring block by a rounding error
const MAX_STEP = 0.25; // never move more than this at once, so we can't skip through blocks

// Does the player box overlap any solid block at this position?
export function collides(world, pos) {
  const minX = Math.floor(pos.x - PLAYER_HALF_WIDTH);
  const maxX = Math.floor(pos.x + PLAYER_HALF_WIDTH - EPS);
  const minY = Math.floor(pos.y);
  const maxY = Math.floor(pos.y + PLAYER_HEIGHT - EPS);
  const minZ = Math.floor(pos.z - PLAYER_HALF_WIDTH);
  const maxZ = Math.floor(pos.z + PLAYER_HALF_WIDTH - EPS);

  for (let y = minY; y <= maxY; y++) {
    for (let z = minZ; z <= maxZ; z++) {
      for (let x = minX; x <= maxX; x++) {
        if (world.isSolidAt(x, y, z)) return true;
      }
    }
  }
  return false;
}

// Moves pos along ONE axis ('x', 'y' or 'z'), stopping at the first solid block.
// Returns true if something blocked the movement.
export function moveAxis(world, pos, axis, amount) {
  let remaining = amount;

  while (remaining !== 0) {
    const step = Math.max(-MAX_STEP, Math.min(MAX_STEP, remaining));
    pos[axis] += step;

    if (collides(world, pos)) {
      // Undo, then binary-search how far we CAN move so we end up flush with the block
      pos[axis] -= step;
      const sign = Math.sign(step);
      let safe = 0;
      let blocked = Math.abs(step);
      for (let i = 0; i < 8; i++) {
        const mid = (safe + blocked) / 2;
        pos[axis] += sign * mid;
        if (collides(world, pos)) blocked = mid;
        else safe = mid;
        pos[axis] -= sign * mid;
      }
      pos[axis] += sign * safe;
      return true;
    }
    remaining -= step;
  }
  return false;
}