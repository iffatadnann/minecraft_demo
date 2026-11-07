import * as THREE from 'three';
import { SIZE_X, SIZE_Z } from '../world/terrain.js';

const COUNT = 80; // lower this if you ever see slowdowns
const MAX_Y = 45; // lanterns fade out at this height
const SPREAD = 12; // how far past the world edges lanterns can appear
const FADE_IN = 2; // blocks of height used to fade in at the bottom
const FADE_OUT = 8; // blocks of height used to fade out at the top

const LANTERN_COLORS = [0xffd27a, 0xffb347, 0xfff0a8];

const rand = (min, max) => min + Math.random() * (max - min);

// Many glowing lanterns drawn as ONE InstancedMesh (a single draw call).
export class FloatingLanterns {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.time = 0;
    this.dummy = new THREE.Object3D(); // reused helper, avoids creating objects every frame

    // 4-sided tapered shape: a simple blocky lantern
    this.geometry = new THREE.CylinderGeometry(0.2, 0.3, 0.6, 4);
    // MeshBasicMaterial ignores lights, so lanterns always glow (fog still applies)
    this.material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, COUNT);
    this.mesh.frustumCulled = false; // instances move outside the base bounding box

    this.lanterns = [];
    for (let i = 0; i < COUNT; i++) {
      const lantern = { x: 0, y: 0, z: 0, baseY: 0, speed: 0, phase: rand(0, 6.28), spin: rand(0.3, 0.9) };
      this.respawn(lantern, true);
      this.lanterns.push(lantern);
      this.mesh.setColorAt(i, new THREE.Color(LANTERN_COLORS[i % LANTERN_COLORS.length]));
    }
    this.mesh.instanceColor.needsUpdate = true;

    scene.add(this.mesh);
  }

  // Places a lantern just above the ground at a random spot.
  // spreadOut = true gives it a random height too (used at start).
  respawn(lantern, spreadOut = false) {
    lantern.x = rand(-SPREAD, SIZE_X + SPREAD);
    lantern.z = rand(-SPREAD, SIZE_Z + SPREAD);

    // Ground height under this spot (clamped so spots outside the world still work)
    const gx = Math.max(0, Math.min(SIZE_X - 1, Math.floor(lantern.x)));
    const gz = Math.max(0, Math.min(SIZE_Z - 1, Math.floor(lantern.z)));
    lantern.baseY = this.world.getSurfaceY(gx, gz) + 1;

    lantern.y = spreadOut ? rand(lantern.baseY, MAX_Y) : lantern.baseY;
    lantern.speed = rand(0.6, 1.4); // blocks per second
  }

  update(delta) {
    this.time += delta;
    const { dummy, lanterns, mesh, time } = this;

    for (let i = 0; i < lanterns.length; i++) {
      const l = lanterns[i];
      l.y += l.speed * delta;
      if (l.y > MAX_Y) this.respawn(l);

      // Smooth fade by scaling: small near the ground and near the top
      const fade = Math.min(1, (l.y - l.baseY) / FADE_IN, (MAX_Y - l.y) / FADE_OUT);
      const pulse = 1 + 0.06 * Math.sin(time * 3 + l.phase); // gentle flicker

      dummy.position.set(
        l.x + Math.sin(time * 0.6 + l.phase) * 0.6, // slow side-to-side sway
        l.y,
        l.z + Math.cos(time * 0.5 + l.phase) * 0.6
      );
      dummy.rotation.y = time * l.spin + l.phase;
      dummy.scale.setScalar(Math.max(0.001, fade) * pulse);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  // Frees GPU memory when leaving the game page
  dispose() {
    this.scene.remove(this.mesh);
    this.mesh.dispose();
    this.geometry.dispose();
    this.material.dispose();
  }
}