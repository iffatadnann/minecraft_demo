// World limits. These must match the client (terrain.js and Inventory.js).
export const SIZE_X = 32;
export const SIZE_Z = 32;
export const HEIGHT = 24;
export const CHUNK_SIZE = 16;
export const CHUNKS_X = SIZE_X / CHUNK_SIZE;
export const CHUNKS_Z = SIZE_Z / CHUNK_SIZE;

export const MAX_EDITS_PER_CHUNK = CHUNK_SIZE * CHUNK_SIZE * HEIGHT;
export const MAX_BLOCK_ID = 3; // 0 = air (a removed block), 1-3 = grass, dirt, stone
export const INVENTORY_SIZE = 36;
export const MAX_STACK = 64;

export const MAX_WORLDS_PER_USER = 10;
export const WORLD_DATA_VERSION = 1;
export const MAX_COUNTER = 1_000_000_000; // sanity limit for counters