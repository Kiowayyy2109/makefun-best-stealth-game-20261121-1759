// Nightshade — The Ember Vault: game orchestration. One job: states, loop, rules.
// A top-down stealth game: steal every ember core, then reach the exit unseen.
// Guards patrol with vision cones; being seen raises suspicion, being caught ends the run.
import { TILE, VIEW_W, VIEW_H } from './config.js';
import { LEVELS } from './levels.js';
import { World } from './world.js';
import { Player } from './player.js';
import { Guard } from './guards.js';
import { Input } from './input.js';
import { AudioEngine } from './audio.js';
import { Renderer } from './render.js';
import { applyShot } from './shots.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.input = new Input();
    this.audio = new AudioEngine();
    this.renderer = new Renderer(canvas);
    this.footprints = [];
    this.levelIndex = 0;
    this.state = 'title'; // title | briefing | playing | leveldone | won | lost
    this.time = 0;
    this.playTime = 0;
    this.timesSpotted = 0;
    this.coresGot = 0;
    this.coresTotal = 3;
    this.grabGrace = 0; // seconds left to break away once a warden grabs you
    this.levelName = LEVELS[0].name;
    this.levelBriefing = LEVELS[0].briefing;
    this.lastTs = 0;
    this.shotMode = new URLSearchParams(location.search).get('shot');
  }

  loadLevel(index) {
    this.levelIndex = index;
    const def = LEVELS[index];
    this.levelName = def.name;
    this.levelBriefing = def.briefing;
    this.world = new World(def.map);
    this.player = new Player(this.world.playerStart);
    this.guards = def.guards.map((g, i) => new Guard(this.world.guardSpawns[i], g.waypoints, g.pause));
    this.coresGot = 0;
    this.coresTotal = this.world.cores.length;
    this.footprints = [];
    this.state = 'briefing';
  }

  start() {
    this.playTime = 0;
    this.timesSpotted = 0;
    this.loadLevel(0);
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
    if (this.shotMode) {
      // Staged screenshot state, built from the game's own objects.
      applyShot(this, Number(this.shotMode));
    }
  }

  loop(ts) {
    const dt = Math.min(0.05, (ts - this.lastTs) / 1000 || 0.016);
    this.lastTs = ts;
    this.time += dt;
    this.update(dt);
    this.renderer.draw(this);
    requestAnimationFrame(this.loop);
  }

  update(dt) {
    // Menu keys.
    if (this.input.pressed('enter')) {
      this.audio.ensure();
      this.audio.click();
      if (this.state === 'title') { this.playTime = 0; this.timesSpotted = 0; this.loadLevel(0); }
      else if (this.state === 'briefing') this.state = 'playing';
      else if (this.state === 'leveldone') this.loadLevel(this.levelIndex + 1);
    }
    if (this.input.pressed('r')) {
      if (this.state === 'lost' || this.state === 'won') { this.playTime = 0; this.timesSpotted = 0; this.loadLevel(0); }
      else if (this.state === 'playing' || this.state === 'briefing') this.loadLevel(this.levelIndex);
    }
    if (this.input.pressed('m')) {
      this.audio.ensure();
      this.audio.toggleMute();
    }
    if (this.state !== 'playing') return;
    this.playTime += dt;

    // Player movement; a footstep ticks the audio and may alert nearby guards.
    const stepped = this.player.update(dt, this.input, this.world);
    if (stepped) {
      this.audio.ensure();
      this.audio.footstep(this.player.sneaking);
      const radius = this.player.noiseRadius();
      if (radius > 0) {
        for (const g of this.guards) g.hearNoise(this.player.x, this.player.y, radius);
      }
    }
    if (this.player.noisePulse > 0) this.player.noisePulse = Math.max(0, this.player.noisePulse - dt * 2.2);

    // Guards see, suspect, chase. Footsteps hint at where a patrol just walked.
    let touching = null;
    for (const g of this.guards) {
      g.update(dt, this.player, this.world, (guard) => {
        this.timesSpotted += 1;
        this.audio.ensure();
        this.audio.alert();
      });
      if (g.stepTick) this.audio.guardStep();
      if (g.state === 'chase' && g.suspicion >= 100 && Math.random() < dt * 0.5) this.audio.spotted();
      if (g.caught(this.player)) touching = g;
    }
    // A warden laying hands on you is not an instant loss: a patrolling guard
    // who bumps into you is startled into a chase (you are spotted), and any
    // grab gives you a short window to break away — you run faster than they do.
    if (touching) {
      if (touching.state !== 'chase') {
        touching.suspicion = 100;
        touching.state = 'chase';
        touching.lastSeen = { x: this.player.x, y: this.player.y };
        this.timesSpotted += 1;
        this.audio.ensure();
        this.audio.alert();
      }
      if (this.grabGrace <= 0) this.grabGrace = 0.8;
      this.grabGrace -= dt;
      if (this.grabGrace <= 0) {
        this.state = 'lost';
        this.audio.lose();
        return;
      }
    } else {
      this.grabGrace = 0;
    }
    for (const f of this.footprints) f.life -= dt * 0.5;
    this.footprints = this.footprints.filter((f) => f.life > 0);

    // Pick up a core by walking over it; the exit opens once all are taken.
    for (const core of this.world.cores) {
      if (!core.taken && Math.hypot(core.x - this.player.x, core.y - this.player.y) < 26) {
        core.taken = true;
        this.coresGot += 1;
        this.audio.pickup();
      }
    }
    const ex = this.world.exit;
    if (this.coresGot >= this.coresTotal && Math.hypot(ex.x - this.player.x, ex.y - this.player.y) < 30) {
      this.audio.win();
      if (this.levelIndex + 1 >= LEVELS.length) this.state = 'won';
      else this.state = 'leveldone';
    }
  }

  timerText() {
    const s = Math.floor(this.playTime);
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  // Debug handle for the maker's own play-tests (read-only status).
  status() {
    return JSON.stringify({
      state: this.state,
      level: this.levelIndex + 1,
      cores: `${this.coresGot}/${this.coresTotal}`,
      time: this.timerText(),
      spotted: this.timesSpotted,
      grabGrace: Math.round(this.grabGrace * 100) / 100,
      player: [Math.round(this.player.x), Math.round(this.player.y)],
      guards: this.guards.map((g) => ({ state: g.state, suspicion: Math.round(g.suspicion) })),
    });
  }
}

const canvas = document.getElementById('game');
const game = new Game(canvas);
window.__nightshade = game;
game.start();
