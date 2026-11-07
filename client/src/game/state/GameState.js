import { BLOCK } from '../world/blocks.js';
import { Inventory, isObject } from './Inventory.js';

const MAX_COUNT = 1e9; // sanity limit for restored numbers

const isCount = (n) => Number.isInteger(n) && n >= 0 && n <= MAX_COUNT;

// Everything about the player's progress. No rendering code in here.
export class GameState {
  constructor({ onChange } = {}) {
    this.onChange = onChange; // called when something the UI shows changes
    this.inventory = new Inventory();
    this.stats = { playTimeSeconds: 0, blocksMined: 0, blocksPlaced: 0 };
    this.paused = true; // becomes false when the player starts playing

    // Starter items so placing works right away
    this.inventory.add(BLOCK.GRASS, 16);
    this.inventory.add(BLOCK.DIRT, 16);
    this.inventory.add(BLOCK.STONE, 16);
  }

  notify() {
    this.onChange?.();
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  // Call every frame. Time only counts while playing.
  tick(delta) {
    if (!this.paused) this.stats.playTimeSeconds += delta;
  }

  selectSlot(index) {
    if (this.inventory.select(index)) this.notify();
  }

  // Block id of the selected slot, or null if it is empty
  getSelectedBlockId() {
    return this.inventory.getSelected()?.id ?? null;
  }

  recordMined(blockId) {
    this.stats.blocksMined++;
    this.inventory.add(blockId, 1); // if the inventory is full the item is lost
    this.notify();
  }

  // Consumes one item from the selected slot
  recordPlaced() {
    if (!this.inventory.removeFromSelected(1)) return false;
    this.stats.blocksPlaced++;
    this.notify();
    return true;
  }

  serialize() {
    return { stats: { ...this.stats }, inventory: this.inventory.serialize() };
  }

  // Returns an error message, or null if the data is valid
  static validate(data) {
    if (!isObject(data) || !isObject(data.stats)) return 'Missing stats';
    const { playTimeSeconds, blocksMined, blocksPlaced } = data.stats;
    if (!Number.isFinite(playTimeSeconds) || playTimeSeconds < 0 || playTimeSeconds > MAX_COUNT) {
      return 'Invalid play time';
    }
    if (!isCount(blocksMined) || !isCount(blocksPlaced)) return 'Invalid block counts';
    return Inventory.validate(data.inventory);
  }

  // Validates first, then applies. Returns an error message or null.
  applySnapshot(data) {
    const error = GameState.validate(data);
    if (error) return error;
    this.stats = {
      playTimeSeconds: data.stats.playTimeSeconds,
      blocksMined: data.stats.blocksMined,
      blocksPlaced: data.stats.blocksPlaced,
    };
    this.inventory.load(data.inventory);
    this.notify();
    return null;
  }
}