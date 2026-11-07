import * as THREE from 'three';
import { BLOCK } from '../world/blocks.js';
import { PLAYER_HALF_WIDTH, PLAYER_HEIGHT } from '../player/collision.js';
import { createHit, raycastBlocks } from './blockRaycaster.js';
import { BlockHighlight } from './blockHighlight.js';

const REACH = 6; // how far (in blocks) the player can break or place

// Targeting, highlighting, left-click break and right-click place.
// What can be placed comes from the inventory (GameState), not from here.
export class BlockEditor {
  constructor({ world, scene, camera, player, state, onWorldChanged }) {
    this.world = world;
    this.camera = camera;
    this.player = player;
    this.state = state;
    this.onWorldChanged = onWorldChanged;

    this.highlight = new BlockHighlight(scene);
    this.hit = createHit(); // reused every frame
    this.hasTarget = false;
    this.direction = new THREE.Vector3(); // reused every frame

    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleContextMenu = (event) => {
      if (this.player.locked) event.preventDefault(); // no browser menu on right-click
    };

    document.addEventListener('mousedown', this.handleMouseDown);
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('contextmenu', this.handleContextMenu);
  }

  // Finds the block under the crosshair and moves the outline to it
  retarget() {
    this.camera.getWorldDirection(this.direction);
    this.hasTarget = raycastBlocks(
      this.world,
      this.camera.position,
      this.direction,
      REACH,
      this.hit
    );

    if (this.hasTarget) this.highlight.show(this.hit.x, this.hit.y, this.hit.z);
    else this.highlight.hide();
  }

  // Call once per frame, after the player has moved
  update() {
    if (!this.player.locked) {
      this.hasTarget = false;
      this.highlight.hide();
      return;
    }
    this.retarget();
  }

  // Keys 1-9 pick a hotbar slot
  handleKeyDown(event) {
    if (!this.player.locked) return;
    if (!event.code.startsWith('Digit')) return;
    this.state.selectSlot(Number(event.code.slice(5)) - 1); // invalid numbers are ignored
  }

  handleMouseDown(event) {
    if (!this.player.locked) return; // clicks only count while playing
    event.preventDefault();

    this.retarget(); // use the freshest target
    if (!this.hasTarget) return;

    if (event.button === 0) this.breakBlock();
    else if (event.button === 2) this.placeBlock();
  }

  breakBlock() {
    const { x, y, z } = this.hit;
    const id = this.world.getBlock(x, y, z);
    this.world.setBlock(x, y, z, BLOCK.AIR);
    this.state.recordMined(id);
    this.onWorldChanged?.();
    this.retarget();
  }

  placeBlock() {
    const blockId = this.state.getSelectedBlockId();
    if (blockId === null) return; // selected slot is empty

    const { x, y, z, nx, ny, nz } = this.hit;
    if (nx === 0 && ny === 0 && nz === 0) return; // camera is inside the block: no face

    // The new block goes in the empty cell next to the face we are looking at
    const px = x + nx;
    const py = y + ny;
    const pz = z + nz;

    if (!this.world.inBounds(px, py, pz)) return; // outside the world
    if (this.world.getBlock(px, py, pz) !== BLOCK.AIR) return; // cell already used
    if (this.overlapsPlayer(px, py, pz)) return; // would trap the player

    this.world.setBlock(px, py, pz, blockId);
    this.state.recordPlaced(); // uses up one item
    this.onWorldChanged?.();
    this.retarget();
  }

  // Does the block cell (bx, by, bz) overlap the player's box?
  overlapsPlayer(bx, by, bz) {
    const p = this.player.pos; // feet position
    return (
      p.x - PLAYER_HALF_WIDTH < bx + 1 &&
      p.x + PLAYER_HALF_WIDTH > bx &&
      p.y < by + 1 &&
      p.y + PLAYER_HEIGHT > by &&
      p.z - PLAYER_HALF_WIDTH < bz + 1 &&
      p.z + PLAYER_HALF_WIDTH > bz
    );
  }

  dispose() {
    document.removeEventListener('mousedown', this.handleMouseDown);
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('contextmenu', this.handleContextMenu);
    this.highlight.dispose();
  }
}