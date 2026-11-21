// Nightshade — the player. One job: movement, stance and noise.
import { TILE, PLAYER_R, PLAYER_WALK, PLAYER_SNEAK, NOISE_RADIUS_RUN } from './config.js';

export class Player {
  constructor(start) {
    this.x = start.x;
    this.y = start.y;
    this.r = PLAYER_R;
    this.dirX = 1;
    this.dirY = 0;
    this.sneaking = false;
    this.moving = false;
    this.stepPhase = 0;
    this.noisePulse = 0; // 0..1, drawn as an expanding ring when running
  }

  update(dt, input, world) {
    let ix = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let iy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    this.sneaking = !!input.sneak;
    this.moving = ix !== 0 || iy !== 0;
    if (!this.moving) return;
    const len = Math.hypot(ix, iy);
    ix /= len; iy /= len;
    this.dirX = ix; this.dirY = iy;
    const speed = this.sneaking ? PLAYER_SNEAK : PLAYER_WALK;
    world.moveCircle(this, ix * speed * dt, iy * speed * dt, this.r);
    // Footsteps: a soft tick each half-stride; running is loud enough to be heard.
    this.stepPhase += speed * dt;
    if (this.stepPhase > 34) {
      this.stepPhase = 0;
      if (!this.sneaking) this.noisePulse = 1;
      return true; // a footstep happened
    }
    return false;
  }

  // How far away a guard can hear this step (0 = silent).
  noiseRadius() {
    if (!this.moving || this.sneaking) return 0;
    return NOISE_RADIUS_RUN;
  }

  inShadow(world) {
    return world.isShadow(this.x, this.y);
  }

  tile() {
    return { col: Math.floor(this.x / TILE), row: Math.floor(this.y / TILE) };
  }
}
