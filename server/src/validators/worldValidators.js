import { z } from 'zod';
import {
  SIZE_X, SIZE_Z, HEIGHT, CHUNK_SIZE, CHUNKS_X, CHUNKS_Z, MAX_EDITS_PER_CHUNK,
  MAX_BLOCK_ID, INVENTORY_SIZE, MAX_STACK, WORLD_DATA_VERSION, MAX_COUNTER,
} from '../constants/world.js';

const int = z.number().int();
const counter = int.min(0).max(MAX_COUNTER);
const range = (min, max) => z.number().min(min).max(max); // also rejects NaN and Infinity

// 1-40 characters, no control characters. The client shows it with textContent.
const name = z.string().trim().min(1, 'Name is required').max(40).regex(/^[^\p{C}]+$/u, 'Name has invalid characters');

export const createWorldSchema = z.strictObject({
  name,
  seed: int.min(0).max(2_147_483_647).optional(),
});

export const renameWorldSchema = z.strictObject({ name });

// One edit: [x, y, z, blockId] in world coordinates
const edit = z.tuple([int, int, int, int.min(0).max(MAX_BLOCK_ID)]);

const chunkSchema = z
  .strictObject({
    chunkX: int.min(0).max(CHUNKS_X - 1),
    chunkZ: int.min(0).max(CHUNKS_Z - 1),
    edits: z.array(edit).max(MAX_EDITS_PER_CHUNK),
  })
  .superRefine((chunk, ctx) => {
    const x0 = chunk.chunkX * CHUNK_SIZE;
    const z0 = chunk.chunkZ * CHUNK_SIZE;
    const seen = new Set();
    for (const [x, y, z] of chunk.edits) {
      const inside =
        x >= x0 && x < x0 + CHUNK_SIZE && z >= z0 && z < z0 + CHUNK_SIZE && y >= 0 && y < HEIGHT;
      const key = `${x},${y},${z}`;
      if (!inside || seen.has(key)) {
        ctx.addIssue({
          code: 'custom',
          path: ['edits'],
          message: inside ? 'Duplicate block edit' : 'Edit is outside its chunk',
        });
        return;
      }
      seen.add(key);
    }
  });

const inventorySlot = z.strictObject({
  slot: int.min(0).max(INVENTORY_SIZE - 1),
  blockId: int.min(1).max(MAX_BLOCK_ID),
  count: int.min(1).max(MAX_STACK),
});

export const saveWorldSchema = z
  .strictObject({
    version: z.literal(WORLD_DATA_VERSION),
    player: z.strictObject({
      x: range(0, SIZE_X),
      y: range(0, HEIGHT + 64),
      z: range(0, SIZE_Z),
      yaw: range(-100000, 100000),
      pitch: range(-1.6, 1.6),
    }),
    stats: z.strictObject({
      playTimeSeconds: range(0, MAX_COUNTER),
      blocksMined: counter,
      blocksPlaced: counter,
    }),
    inventory: z.array(inventorySlot).max(INVENTORY_SIZE),
    chunks: z.array(chunkSchema).max(CHUNKS_X * CHUNKS_Z),
  })
  .superRefine((data, ctx) => {
    const slots = new Set(data.inventory.map((s) => s.slot));
    if (slots.size !== data.inventory.length) {
      ctx.addIssue({ code: 'custom', path: ['inventory'], message: 'Duplicate inventory slot' });
    }
    const chunks = new Set(data.chunks.map((c) => `${c.chunkX},${c.chunkZ}`));
    if (chunks.size !== data.chunks.length) {
      ctx.addIssue({ code: 'custom', path: ['chunks'], message: 'Duplicate chunk' });
    }
  });