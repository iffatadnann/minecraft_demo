import { World, generateTerrain, SIZE_X, SIZE_Z } from '../world/terrain.js';
import { GameState } from '../state/GameState.js';
import { INVENTORY_SIZE } from '../state/Inventory.js';

export const CHUNK_SIZE = 16;
export const SAVE_VERSION = 1; // must match the server's WORLD_DATA_VERSION
const CHUNKS_X = SIZE_X / CHUNK_SIZE;
const CHUNKS_Z = SIZE_Z / CHUNK_SIZE;

export const chunkKey = (chunkX, chunkZ) => `${chunkX},${chunkZ}`;

// The untouched terrain, built once. Changed blocks are found by comparing to it.
let baseline = null;
function getBaseline() {
  if (!baseline) {
    baseline = new World();
    generateTerrain(baseline);
  }
  return baseline;
}

// Lists the changed blocks of EVERY chunk: [{ chunkX, chunkZ, edits: [[x,y,z,id], ...] }]
export function collectChunkEdits(world) {
  const base = getBaseline();
  const chunks = new Map();
  for (let cz = 0; cz < CHUNKS_Z; cz++) {
    for (let cx = 0; cx < CHUNKS_X; cx++) {
      chunks.set(chunkKey(cx, cz), { chunkX: cx, chunkZ: cz, edits: [] });
    }
  }
  for (let i = 0; i < world.blocks.length; i++) {
    if (world.blocks[i] === base.blocks[i]) continue;
    const x = i % SIZE_X;
    const z = Math.floor(i / SIZE_X) % SIZE_Z;
    const y = Math.floor(i / (SIZE_X * SIZE_Z));
    chunks
      .get(chunkKey(Math.floor(x / CHUNK_SIZE), Math.floor(z / CHUNK_SIZE)))
      .edits.push([x, y, z, world.blocks[i]]);
  }
  return [...chunks.values()];
}

// Checks the server's saved data and turns it into things the game can apply.
// Throws an Error with a readable message if anything is wrong.
export function prepareSaved(saved) {
  const { world, inventory, chunks } = saved ?? {};
  if (!world || world.dataVersion !== SAVE_VERSION) throw new Error('This world uses an unsupported save version.');
  if (!Array.isArray(chunks) || !Array.isArray(inventory)) throw new Error('Saved world data is damaged.');

  const edits = [];
  for (const chunk of chunks) {
    if (!Array.isArray(chunk.edits)) throw new Error('Saved world data is damaged.');
    for (const e of chunk.edits) {
      if (!Array.isArray(e) || e.length !== 4 || !e.every(Number.isInteger)) {
        throw new Error('Saved world data is damaged.');
      }
      edits.push(e);
    }
  }

  // A world that was never saved keeps the starter items
  let snapshot = null;
  if (world.player !== null || inventory.length > 0) {
    const slots = Array.from({ length: INVENTORY_SIZE }, () => null);
    for (const s of inventory) {
      if (Number.isInteger(s.slot) && s.slot >= 0 && s.slot < INVENTORY_SIZE) {
        slots[s.slot] = { id: s.blockId, count: s.count };
      }
    }
    snapshot = { stats: world.stats, inventory: { selected: 0, slots } };
    const error = GameState.validate(snapshot);
    if (error) throw new Error(`Saved world data is invalid: ${error}`);
  }

  return { edits, snapshot, player: world.player };
}

// Puts the saved block changes on top of the generated terrain
export function applyEdits(world, edits) {
  for (const [x, y, z, id] of edits) world.setBlock(x, y, z, id); // ignores out-of-bounds
}