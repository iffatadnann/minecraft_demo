import * as THREE from 'three';
import { BLOCK, BLOCK_COLORS, BLOCK_SIDE_COLORS } from './blocks.js';
import { SIZE_X, SIZE_Z, HEIGHT } from './terrain.js';

// The six faces of a cube: direction to the neighbor, and the 4 corners.
const FACES = [
  { dir: [-1, 0, 0], corners: [[0, 1, 0], [0, 0, 0], [0, 1, 1], [0, 0, 1]] }, // left
  { dir: [1, 0, 0], corners: [[1, 1, 1], [1, 0, 1], [1, 1, 0], [1, 0, 0]] }, // right
  { dir: [0, -1, 0], corners: [[1, 0, 1], [0, 0, 1], [1, 0, 0], [0, 0, 0]] }, // bottom
  { dir: [0, 1, 0], corners: [[0, 1, 1], [1, 1, 1], [0, 1, 0], [1, 1, 0]] }, // top
  { dir: [0, 0, -1], corners: [[1, 0, 0], [0, 0, 0], [1, 1, 0], [0, 1, 0]] }, // back
  { dir: [0, 0, 1], corners: [[0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]] }, // front
];

// Convert each color once (not once per face)
function toRgb(hex) {
  const c = new THREE.Color(hex);
  return [c.r, c.g, c.b];
}

const TOP_COLORS = {};
const SIDE_COLORS = {};
for (const [id, hex] of Object.entries(BLOCK_COLORS)) {
  TOP_COLORS[id] = toRgb(hex);
  SIDE_COLORS[id] = toRgb(BLOCK_SIDE_COLORS[id] ?? hex);
}

// One material is shared by the whole world.
export function createBlockMaterial() {
  return new THREE.MeshLambertMaterial({ vertexColors: true });
}

// Builds ONE mesh for the whole world. A face is only added when the block
// next to it is air, so hidden faces cost nothing.
export function buildWorldMesh(world, material) {
  const positions = [];
  const normals = [];
  const colors = [];
  const indices = [];

  for (let y = 0; y < HEIGHT; y++) {
    for (let z = 0; z < SIZE_Z; z++) {
      for (let x = 0; x < SIZE_X; x++) {
        const id = world.getBlock(x, y, z);
        if (id === BLOCK.AIR) continue;

        // Tiny deterministic brightness change so flat colors look less dull
        const tint = 0.92 + ((x * 7 + y * 13 + z * 17) % 5) * 0.02;

        for (const { dir, corners } of FACES) {
          const ny = y + dir[1];
          if (ny < 0) continue; // never see the underside of the world
          if (world.getBlock(x + dir[0], ny, z + dir[2]) !== BLOCK.AIR) continue;

          // Top faces use the main color, other faces use the side color
          const base = dir[1] === 1 ? TOP_COLORS[id] : SIDE_COLORS[id];

          const start = positions.length / 3;
          for (const corner of corners) {
            positions.push(x + corner[0], y + corner[1], z + corner[2]);
            normals.push(dir[0], dir[1], dir[2]);
            colors.push(base[0] * tint, base[1] * tint, base[2] * tint);
          }
          indices.push(start, start + 1, start + 2, start + 2, start + 1, start + 3);
        }
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();

  return new THREE.Mesh(geometry, material);
}