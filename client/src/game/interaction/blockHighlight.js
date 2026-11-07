import * as THREE from 'three';

// One outline box that is created once and moved to the targeted block.
export class BlockHighlight {
  constructor(scene) {
    this.scene = scene;

    // Slightly larger than 1 so the lines don't flicker against the block faces
    const box = new THREE.BoxGeometry(1.004, 1.004, 1.004);
    this.geometry = new THREE.EdgesGeometry(box);
    box.dispose(); // only the edges are needed

    this.material = new THREE.LineBasicMaterial({ color: 0x24143c, fog: false });
    this.lines = new THREE.LineSegments(this.geometry, this.material);
    this.lines.visible = false;
    scene.add(this.lines);
  }

  show(x, y, z) {
    this.lines.position.set(x + 0.5, y + 0.5, z + 0.5);
    this.lines.visible = true;
  }

  hide() {
    this.lines.visible = false;
  }

  dispose() {
    this.scene.remove(this.lines);
    this.geometry.dispose();
    this.material.dispose();
  }
}