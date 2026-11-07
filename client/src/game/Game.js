import * as THREE from 'three';
import { startGameLoop } from '../core/gameLoop.js';
import { World, generateTerrain, SIZE_X, SIZE_Z } from './world/terrain.js';
import { buildWorldMesh, createBlockMaterial } from './world/chunkMesher.js';
import { PlayerController } from './player/PlayerController.js';
import { collides } from './player/collision.js';
import { FloatingLanterns } from './effects/FloatingLanterns.js';
import { BlockEditor } from './interaction/blockEditor.js';
import { GameState } from './state/GameState.js';
import { BLOCK_NAMES } from './state/Inventory.js';
import { exportWorldData, importWorldData } from './state/worldData.js';
import { SaveManager } from './save/saveManager.js';
import { SAVE_VERSION, chunkKey, collectChunkEdits, prepareSaved, applyEdits } from './save/worldSync.js';

const SKY_COLOR = 0xc9b6f0;

// Wires the world, camera, lights, player, state and saving together for one play session.
// saved: the server's world data (or undefined for a fresh world)
// saveWorld(payload, { keepalive }): sends a save (provided by the screen)
// onSaveStatus('saving' | 'saved' | 'error', error)
export class Game {
  constructor(container, { onLockChange, saved, saveWorld, onSaveStatus } = {}) {
    this.container = container;

    // Check saved data first, so bad data fails before anything is created
    const loaded = saved ? prepareSaved(saved) : null;

    // --- Renderer (cap pixel ratio so high-DPI screens stay fast) ---
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    // --- Scene, sky and fog ---
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(SKY_COLOR);
    this.scene.fog = new THREE.Fog(SKY_COLOR, 12, 50);

    this.camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      200
    );

    // --- Lighting (no shadows, to keep it fast) ---
    this.scene.add(new THREE.HemisphereLight(0xffe9c4, 0x7a5a8a, 1.1));
    const sun = new THREE.DirectionalLight(0xffd9a0, 1.5);
    sun.position.set(30, 50, 20);
    this.scene.add(sun);

    // --- World: generated terrain, then the player's saved changes on top ---
    this.world = new World();
    generateTerrain(this.world);
    if (loaded) applyEdits(this.world, loaded.edits);
    this.material = createBlockMaterial();
    this.worldMesh = buildWorldMesh(this.world, this.material);
    this.scene.add(this.worldMesh);
    this.lanterns = new FloatingLanterns(this.scene, this.world);

    // --- Game state (inventory, stats, pause) ---
    this.state = new GameState({ onChange: () => this.updateLabel() });
    if (loaded?.snapshot) this.state.applySnapshot(loaded.snapshot); // already validated

    // --- Player: saved position if it is valid, otherwise the middle of the world ---
    this.player = new PlayerController({
      camera: this.camera,
      domElement: this.renderer.domElement,
      world: this.world,
      onLockChange: (locked) => {
        if (locked) {
          this.state.resume();
        } else {
          this.state.pause();
          this.saveManager?.saveNow(); // pressing Esc saves
        }
        onLockChange?.(locked);
      },
    });
    const p = loaded?.player;
    if (p && !collides(this.world, p)) {
      this.player.yaw = p.yaw;
      this.player.pitch = p.pitch;
      this.player.spawn(p.x, p.y, p.z);
    } else {
      const spawnX = Math.floor(SIZE_X / 2);
      const spawnZ = Math.floor(SIZE_Z / 2);
      this.player.spawn(spawnX + 0.5, this.world.getSurfaceY(spawnX, spawnZ) + 0.01, spawnZ + 0.5);
    }

    // --- Label with the selected item and stats (text only, no HTML) ---
    this.blockLabel = document.createElement('div');
    this.blockLabel.className = 'block-label';
    container.appendChild(this.blockLabel);
    this.updateLabel();

    // --- Targeting, highlight, break and place ---
    this.editor = new BlockEditor({
      world: this.world,
      scene: this.scene,
      camera: this.camera,
      player: this.player,
      state: this.state,
      onWorldChanged: () => this.rebuildWorldMesh(),
    });

    // --- Saving: remember what is already on the server ---
    this.savedChunks = new Map(
      collectChunkEdits(this.world).map((c) => [chunkKey(c.chunkX, c.chunkZ), JSON.stringify(c.edits)])
    );
    this.savedMeta = this.getMeta();
    this.saveManager = saveWorld
      ? new SaveManager({
          buildPayload: () => this.buildSavePayload(),
          send: saveWorld,
          onStatus: onSaveStatus,
        })
      : null;

    // Switching tabs or minimizing saves too
    this.handleVisibility = () => {
      if (document.hidden) this.saveManager?.saveNow({ keepalive: true });
    };
    document.addEventListener('visibilitychange', this.handleVisibility);

    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);

    this.stopLoop = startGameLoop(
      (delta) => {
        this.player.update(delta);
        this.state.tick(delta); // only counts while not paused
        this.lanterns.update(delta); // keeps animating even while paused
        this.editor.update();
      },
      () => this.renderer.render(this.scene, this.camera)
    );

    // Development only: lets you test export/import from the browser console
    if (import.meta.env.DEV) window.__game = this;
  }

  // A short text that changes whenever inventory, counters or play time change
  getMeta() {
    const { inventory, stats } = this.state;
    return JSON.stringify([
      inventory.serialize().slots,
      stats.blocksMined,
      stats.blocksPlaced,
      Math.floor(stats.playTimeSeconds),
    ]);
  }

  // Builds the save request containing ONLY the chunks that changed since the last save.
  buildSavePayload() {
    const changed = collectChunkEdits(this.world).filter(
      (c) => this.savedChunks.get(chunkKey(c.chunkX, c.chunkZ)) !== JSON.stringify(c.edits)
    );
    const meta = this.getMeta();
    const { stats, inventory } = this.state;

    const slots = [];
    inventory.serialize().slots.forEach((slot, index) => {
      if (slot) slots.push({ slot: index, blockId: slot.id, count: slot.count });
    });

    return {
      hasChanges: changed.length > 0 || meta !== this.savedMeta,
      payload: {
        version: SAVE_VERSION,
        player: {
          x: this.player.pos.x,
          y: this.player.pos.y,
          z: this.player.pos.z,
          yaw: this.player.yaw,
          pitch: this.player.pitch,
        },
        stats: {
          playTimeSeconds: stats.playTimeSeconds,
          blocksMined: stats.blocksMined,
          blocksPlaced: stats.blocksPlaced,
        },
        inventory: slots,
        chunks: changed,
      },
      // Called only after the server accepted the save
      commit: () => {
        for (const c of changed) this.savedChunks.set(chunkKey(c.chunkX, c.chunkZ), JSON.stringify(c.edits));
        this.savedMeta = meta;
      },
    };
  }

  updateLabel() {
    if (!this.blockLabel) return;
    const { inventory, stats } = this.state;
    const slot = inventory.getSelected();
    const item = slot ? `${BLOCK_NAMES[slot.id]} x${slot.count}` : 'empty';
    this.blockLabel.textContent =
      `Slot ${inventory.selected + 1}: ${item} | Mined ${stats.blocksMined} | Placed ${stats.blocksPlaced}`;
  }

  // Rebuilds the world mesh after a block changes and frees the old geometry.
  rebuildWorldMesh() {
    const next = buildWorldMesh(this.world, this.material);
    this.scene.remove(this.worldMesh);
    this.worldMesh.geometry.dispose();
    this.worldMesh = next;
    this.scene.add(next);
  }

  // Returns a plain object (versioned) you can JSON.stringify
  exportWorld() {
    return exportWorldData({ world: this.world, state: this.state, player: this.player });
  }

  // Returns { ok: true } or { ok: false, error }. Bad data changes nothing.
  importWorld(data) {
    const result = importWorldData(data, {
      world: this.world,
      state: this.state,
      player: this.player,
    });
    if (result.ok) this.rebuildWorldMesh();
    return result;
  }

  requestLock() {
    this.player.lock(); // also resumes the game via the lock-change callback
  }

  // Releasing the mouse pauses the game
  pause() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  handleResize() {
    const { clientWidth: width, clientHeight: height } = this.container;
    if (!width || !height) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  // Saves one last time, then frees everything so leaving the page doesn't leak memory
  dispose() {
    this.saveManager?.saveNow({ keepalive: true }); // the payload is built right now
    this.saveManager?.dispose();
    this.stopLoop();
    if (window.__game === this) delete window.__game;
    document.removeEventListener('visibilitychange', this.handleVisibility);
    window.removeEventListener('resize', this.handleResize);
    this.editor.dispose();
    this.blockLabel.remove();
    this.player.dispose();
    this.worldMesh.geometry.dispose();
    this.material.dispose();
    this.lanterns.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}