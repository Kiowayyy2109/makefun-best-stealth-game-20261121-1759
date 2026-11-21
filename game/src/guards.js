// Nightshade — guards. One job: patrol, see, suspect, chase, search, forget.
import { TILE, VISION_RANGE, VISION_HALF_ANGLE, GUARD_WALK, GUARD_CHASE, GUARD_SUSPECT, CATCH_DIST, SUSPICION } from './config.js';

const TAU = Math.PI * 2;

function angDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  return d;
}

export class Guard {
  constructor(spawn, waypoints, pause) {
    this.x = spawn.x;
    this.y = spawn.y;
    this.waypoints = waypoints.map(([c, r]) => ({ x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 }));
    this.wpIndex = 0;
    this.pause = pause || 1;
    this.pauseLeft = 0;
    // Face along the patrol route at spawn.
    const next = this.waypoints[1] || this.waypoints[0];
    this.angle = Math.atan2(next.y - this.y, next.x - this.x);
    this.suspicion = 0;
    this.state = 'patrol'; // patrol | wary | chase | search
    this.lastSeen = null;
    this.unseenFor = 0;
    this.searchLeft = 0;
    this.stepPhase = 0;
    this.stepTick = false; // true for one frame when a footstep lands
    this.heardAt = null;   // {x, y} noise to investigate
  }

  // Can this guard currently see the player? Fills this.sees.
  seesPlayer(player, world) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > VISION_RANGE) return false;
    if (dist < 20) return true; // point-blank: the guard is on top of you, angle aside
    const toPlayer = Math.atan2(dy, dx);
    if (Math.abs(angDiff(toPlayer, this.angle)) > VISION_HALF_ANGLE) return false;
    return world.lineOfSight(this.x, this.y, player.x, player.y);
  }

  hearNoise(x, y, radius) {
    if (radius <= 0) return;
    const d = Math.hypot(x - this.x, y - this.y);
    if (d > radius + 40) return; // ears are a little generous
    if (this.state === 'chase') return;
    this.heardAt = { x, y };
    if (this.state === 'patrol') {
      this.state = 'wary';
      this.suspicion = Math.max(this.suspicion, SUSPICION.suspiciousAt);
    }
  }

  update(dt, player, world, onSpotted) {
    this.stepTick = false;
    const sees = this.seesPlayer(player, world);
    const shadow = player.inShadow(world);
    if (sees) {
      this.lastSeen = { x: player.x, y: player.y };
      this.unseenFor = 0;
      let rate = SUSPICION.base;
      const dist = Math.hypot(player.x - this.x, player.y - this.y);
      rate += SUSPICION.closeBonus * (1 - dist / VISION_RANGE);
      if (shadow) rate *= SUSPICION.shadowFactor;
      if (player.sneaking) rate *= SUSPICION.sneakFactor;
      if (!player.sneaking && player.moving) rate *= SUSPICION.runFactor;
      const before = this.suspicion;
      this.suspicion = Math.min(100, this.suspicion + rate * dt);
      if (before < SUSPICION.alertAt && this.suspicion >= SUSPICION.alertAt) {
        this.state = 'chase';
        if (onSpotted) onSpotted(this);
      } else if (this.suspicion >= SUSPICION.suspiciousAt && this.state === 'patrol') {
        this.state = 'wary';
      }
    } else {
      this.unseenFor += dt;
      this.suspicion = Math.max(0, this.suspicion - SUSPICION.decay * dt);
      if (this.state === 'chase' && this.unseenFor > SUSPICION.loseSightFor) {
        this.state = 'search';
        this.searchLeft = 4;
      } else if (this.state === 'wary' && this.suspicion < SUSPICION.suspiciousAt) {
        this.state = 'patrol';
        this.heardAt = null;
      }
    }

    if (this.state === 'chase' && this.lastSeen) {
      this.moveToward(dt, this.lastSeen.x, this.lastSeen.y, GUARD_CHASE, world);
    } else if (this.state === 'search' && this.lastSeen) {
      this.searchLeft -= dt;
      const d = Math.hypot(this.lastSeen.x - this.x, this.lastSeen.y - this.y);
      if (d > 10) this.moveToward(dt, this.lastSeen.x, this.lastSeen.y, GUARD_SUSPECT, world);
      else this.angle += dt * 2.2; // look around the last-known spot
      if (this.searchLeft <= 0) { this.state = 'patrol'; this.lastSeen = null; }
    } else if (this.state === 'wary') {
      const target = this.heardAt || this.lastSeen;
      if (target) {
        const d = Math.hypot(target.x - this.x, target.y - this.y);
        if (d > 14) this.moveToward(dt, target.x, target.y, GUARD_SUSPECT, world);
        else { this.angle += dt * 1.6; this.heardAt = null; }
      } else if (this.lastSeen) {
        this.angle = Math.atan2(this.lastSeen.y - this.y, this.lastSeen.x - this.x);
      }
    } else {
      this.patrol(dt, world);
    }
    return sees;
  }

  moveToward(dt, tx, ty, speed, world) {
    const dx = tx - this.x, dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) return;
    this.angle = Math.atan2(dy, dx);
    world.moveCircle(this, (dx / d) * speed * dt, (dy / d) * speed * dt, 15);
    this.step(dt, speed);
  }

  patrol(dt, world) {
    if (this.pauseLeft > 0) {
      this.pauseLeft -= dt;
      return;
    }
    const target = this.waypoints[this.wpIndex];
    const dx = target.x - this.x, dy = target.y - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 6) {
      this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
      this.pauseLeft = this.pause;
      return;
    }
    this.angle = Math.atan2(dy, dx);
    world.moveCircle(this, (dx / d) * GUARD_WALK * dt, (dy / d) * GUARD_WALK * dt, 15);
    this.step(dt, GUARD_WALK);
  }

  step(dt, speed) {
    this.stepPhase += speed * dt;
    if (this.stepPhase > 40) { this.stepPhase = 0; this.stepTick = true; }
  }

  caught(player) {
    return Math.hypot(player.x - this.x, player.y - this.y) < CATCH_DIST;
  }
}
