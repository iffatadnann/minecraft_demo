// Block IDs and their colors. IDs are numbers so they are cheap to store.
export const BLOCK = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
};

// Main color of each block (used for the top face)
export const BLOCK_COLORS = {
  [BLOCK.GRASS]: 0x6fbf5b, // meadow green
  [BLOCK.DIRT]: 0x9a6b45, // warm earth
  [BLOCK.STONE]: 0x8a7fa8, // purple-gray stone
};

// Side and bottom faces. A grass block has earth-colored sides.
// Blocks not listed here use their main color.
export const BLOCK_SIDE_COLORS = {
  [BLOCK.GRASS]: 0x9a6b45,
};

export function isSolid(id) {
  return id !== BLOCK.AIR;
}