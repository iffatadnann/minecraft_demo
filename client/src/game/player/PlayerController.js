import { moveAxis } from './collision.js';

const EYE_HEIGHT = 1.62;
const WALK_SPEED = 4.5; // blocks per second
const SPRINT_SPEED = 8;
const GRAVITY = 25;
const JUMP_SPEED = 8.2; // about 1.3 blocks high
const MAX_FALL_SPEED = 40;
const MOUSE_SENSITIVITY = 0.002;
const MAX_PITCH = Math.PI / 2 - 0.01; // stop just short of looking straight up/down

// First-person controls: mouse look, WASD, jump, gravity, collision.
export class PlayerController {
  constructor({ camera, domElement, world, onLockChange }) {
    this.camera = camera;
    this.domElement = domElement;
    this.world = world;
    this.onLockChange = onLockChange;

    this.pos = { x: 0, y: 0, z: 0 }; // feet position
    this.vy = 0; // vertical speed
    this.grounded = false;
    this.yaw = 0;
    this.pitch = 0;
    this.locked = false;
    this.keys = new Set();
    this.sprint = false;

    camera.rotation.order = 'YXZ'; // turn left/right first, then up/down

    // Bound once so the same function can be removed later
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleLockChange = this.handleLockChange.bind(this);
    this.clearKeys = () => this.keys.clear();

    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
    document.addEventListener('pointerlockchange', this.handleLockChange);
    window.addEventListener('blur', this.clearKeys);
  }

  spawn(x, y, z) {
    this.pos.x = x;
    this.pos.y = y;
    this.pos.z = z;
    this.vy = 0;
    this.syncCamera();
  }

  // Must be called from a click (browsers require a user gesture)
  lock() {
    const request = this.domElement.requestPointerLock();
    // Some browsers reject if you re-lock right after pressing Esc: ignore that
    if (request && request.catch) request.catch(() => {});
  }

  handleLockChange() {
    this.locked = document.pointerLockElement === this.domElement;
    if (!this.locked) {
      this.keys.clear();
      this.sprint = false;
    }
    this.onLockChange?.(this.locked);
  }

  handleMouseMove(event) {
    if (!this.locked) return;
    this.yaw -= event.movementX * MOUSE_SENSITIVITY;
    this.pitch -= event.movementY * MOUSE_SENSITIVITY;
    this.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, this.pitch));
  }

    handleKeyDown(event) {
    if (!this.locked) return;
    this.sprint = event.shiftKey; // works for left and right Shift
    this.keys.add(event.code);
    if (event.code === 'Space') event.preventDefault(); // don't scroll the page
  }

  handleKeyUp(event) {
    this.sprint = event.shiftKey;
    this.keys.delete(event.code);
  }

  update(delta) {
    if (!this.locked) return; // the game is paused while the mouse is released

    // --- Horizontal movement from WASD ---
    const forward = (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0);
    const strafe = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0);
    const length = Math.hypot(forward, strafe) || 1; // so diagonals aren't faster
    const speed = this.sprint ? SPRINT_SPEED : WALK_SPEED;

    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    const vx = ((strafe * cos - forward * sin) / length) * speed;
    const vz = ((-strafe * sin - forward * cos) / length) * speed;

    // --- Jumping and gravity ---
    if (this.keys.has('Space') && this.grounded) {
      this.vy = JUMP_SPEED;
      this.grounded = false;
    }
    this.vy = Math.max(this.vy - GRAVITY * delta, -MAX_FALL_SPEED);

    // --- Move one axis at a time so the player slides along walls ---
    moveAxis(this.world, this.pos, 'x', vx * delta);
    moveAxis(this.world, this.pos, 'z', vz * delta);
    const hitY = moveAxis(this.world, this.pos, 'y', this.vy * delta);
    if (hitY) {
      this.grounded = this.vy < 0; // landed on something (not bumped a ceiling)
      this.vy = 0;
    } else {
      this.grounded = false;
    }

    this.syncCamera();
  }

  syncCamera() {
    this.camera.position.set(this.pos.x, this.pos.y + EYE_HEIGHT, this.pos.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  dispose() {
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    document.removeEventListener('pointerlockchange', this.handleLockChange);
    window.removeEventListener('blur', this.clearKeys);
    if (document.pointerLockElement === this.domElement) document.exitPointerLock();
  }
}