import { BLOCK } from '../world/blocks.js';
import { World, generateTerrain, SIZE_X, SIZE_Z, HEIGHT } from '../world/terrain.js';
import { collides } from '../player/collision.js';
import { GameState } from './GameState.js';
import { isObject } from './Inventory.js';

export const WORLD_DATA_VERSION = 1;

const CELL_COUNT = SIZE_X * SIZE_Z * HEIGHT;
const VALID_BLOCK_IDS = new Set(Object.values(BLOCK)); // includes air (for removed blocks)
const fail = (error) => ({ ok: false, error });

// Builds the untouched terrain, used to find which blocks the player changed
function createBaseline() {
  const baseline = new World();
  generateTerrain(baseline);
  return baseline;
}

// Makes a plain, JSON-safe object. Only CHANGED blocks are stored, so it stays small.
export function exportWorldData({ world, state, player }) {
  const baseline = createBaseline();
  const edits = [];

  for (let i = 0; i < CELL_COUNT; i++) {
    if (world.blocks[i] !== baseline.blocks[i]) {
      const x = i % SIZE_X;
      const z = Math.floor(i / SIZE_X) % SIZE_Z;
      const y = Math.floor(i / (SIZE_X * SIZE_Z));
      edits.push([x, y, z, world.blocks[i]]);
    }
  }

  return {
    version: WORLD_DATA_VERSION,
    world: { sizeX: SIZE_X, sizeZ: SIZE_Z, height: HEIGHT, edits },
    player: { x: player.pos.x, y: player.pos.y, z: player.pos.z, yaw: player.yaw, pitch: player.pitch },
    state: state.serialize(),
  };
}

// Checks everything BEFORE changing anything, so bad data never half-applies.
// Returns { ok: true } or { ok: false, error }.
export function importWorldData(data, { world, state, player }) {
  if (!isObject(data)) return fail('Data must be an object');
  if (data.version !== WORLD_DATA_VERSION) return fail(`Unsupported version: ${data.version}`);

  const w = data.world;
  if (!isObject(w) || w.sizeX !== SIZE_X || w.sizeZ !== SIZE_Z || w.height !== HEIGHT) {
    return fail('World size does not match');
  }
  if (!Array.isArray(w.edits) || w.edits.length > CELL_COUNT) return fail('Invalid edit list');

  // Rebuild into a temporary world first
  const candidate = createBaseline();
  for (const edit of w.edits) {
    if (!Array.isArray(edit) || edit.length !== 4) return fail('Invalid edit');
    const [x, y, z, id] = edit;
    if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(z)) {
      return fail('Invalid edit position');
    }
    if (!candidate.inBounds(x, y, z)) return fail('Edit is outside the world');
    if (!VALID_BLOCK_IDS.has(id)) return fail('Unknown block id');
    candidate.setBlock(x, y, z, id);
  }

  const p = data.player;
  if (!isObject(p) || ![p.x, p.y, p.z, p.yaw, p.pitch].every(Number.isFinite)) {
    return fail('Invalid player data');
  }
  if (Math.abs(p.pitch) > Math.PI / 2) return fail('Invalid player pitch');
  // Also rejects positions outside the world (those count as solid)
  if (collides(candidate, { x: p.x, y: p.y, z: p.z })) return fail('Player position is blocked');

  const stateError = GameState.validate(data.state);
  if (stateError) return fail(stateError);

  // Everything is valid: apply
  world.blocks.set(candidate.blocks);
  state.applySnapshot(data.state);
  player.yaw = p.yaw;
  player.pitch = p.pitch;
  player.spawn(p.x, p.y, p.z);
  return { ok: true };
}