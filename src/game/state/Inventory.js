import { BLOCK } from '../world/blocks.js';

export const HOTBAR_SIZE = 9; // slots 0-8 are the hotbar
export const INVENTORY_SIZE = 36; // 9 hotbar + 27 main slots
export const MAX_STACK = 64;

// Display names (used by the on-screen label)
export const BLOCK_NAMES = {
  [BLOCK.GRASS]: 'Grass',
  [BLOCK.DIRT]: 'Dirt',
  [BLOCK.STONE]: 'Stone',
};

// Items must be real, non-air blocks
const ITEM_IDS = new Set(Object.values(BLOCK).filter((id) => id !== BLOCK.AIR));

export const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Slots hold { id, count } or null (empty).
export class Inventory {
  constructor() {
    this.slots = Array.from({ length: INVENTORY_SIZE }, () => null);
    this.selected = 0;
  }

  getSelected() {
    return this.slots[this.selected];
  }

  // Returns true if the slot number was valid
  select(index) {
    if (!Number.isInteger(index) || index < 0 || index >= HOTBAR_SIZE) return false;
    this.selected = index;
    return true;
  }

  // Fills existing stacks first, then empty slots. Returns how many did NOT fit.
  add(id, count = 1) {
    let left = count;
    for (const slot of this.slots) {
      if (left === 0) break;
      if (slot && slot.id === id && slot.count < MAX_STACK) {
        const n = Math.min(MAX_STACK - slot.count, left);
        slot.count += n;
        left -= n;
      }
    }
    for (let i = 0; i < this.slots.length && left > 0; i++) {
      if (!this.slots[i]) {
        const n = Math.min(MAX_STACK, left);
        this.slots[i] = { id, count: n };
        left -= n;
      }
    }
    return left;
  }

  removeFromSelected(count = 1) {
    const slot = this.slots[this.selected];
    if (!slot || slot.count < count) return false;
    slot.count -= count;
    if (slot.count === 0) this.slots[this.selected] = null;
    return true;
  }

  // Plain copy, safe to JSON.stringify
  serialize() {
    return {
      selected: this.selected,
      slots: this.slots.map((s) => (s ? { id: s.id, count: s.count } : null)),
    };
  }

  // Returns an error message, or null if the data is valid
  static validate(data) {
    if (!isObject(data)) return 'Inventory must be an object';
    if (!Number.isInteger(data.selected) || data.selected < 0 || data.selected >= HOTBAR_SIZE) {
      return 'Invalid selected slot';
    }
    if (!Array.isArray(data.slots) || data.slots.length !== INVENTORY_SIZE) {
      return `Inventory must have ${INVENTORY_SIZE} slots`;
    }
    for (const slot of data.slots) {
      if (slot === null) continue;
      if (!isObject(slot) || !ITEM_IDS.has(slot.id)) return 'Invalid item in inventory';
      if (!Number.isInteger(slot.count) || slot.count < 1 || slot.count > MAX_STACK) {
        return 'Invalid item count';
      }
    }
    return null;
  }

  // Only call after validate() returned null
  load(data) {
    this.selected = data.selected;
    this.slots = data.slots.map((s) => (s ? { id: s.id, count: s.count } : null));
  }
}