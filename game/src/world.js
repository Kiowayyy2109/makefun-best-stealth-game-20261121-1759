// Nightshade — world geometry. One job: the tile grid, collision and line of sight.
import { TILE, COLS, ROWS } from './config.js';

export class World {
  constructor(mapRows) {
    this.rows = mapRows;
    this.cores = [];
    this.exit = null;
    this.playerStart = { x: TILE * 1.5, y: TILE * 1.5 };
    this.guardSpawns = [];
    for (let r = 0; r < mapRows.length; r++) {
      for (let c = 0; c < mapRows[r].length; c++) {
        const ch = mapRows[r][c];
        const cx = c * TILE + TILE / 2;
        const cy = r * TILE + TILE / 2;
        if (ch === 'P') this.playerStart = { x: cx, y: cy };
        else if (ch === 'G') this.guardSpawns.push({ x: cx, y: cy });
        else if (ch === 'o') this.cores.push({ x: cx, y: cy, taken: false });
        else if (ch === 'E') this.exit = { x: cx, y: cy };
      }
    }
  }

  tileAt(col, row) {
    if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return '#';
    return this.rows[row][col];
  }

  solidAt(col, row) {
    const t = this.tileAt(col, row);
    return t === '#' || t === 'C';
  }

  isShadow(x, y) {
    const col = Math.floor(x / TILE);
    const row = Math.floor(y / TILE);
    return this.tileAt(col, row) === 'S';
  }

  // Circle-vs-solid-tiles collision: slide along walls, never tunnel through.
  moveCircle(pos, dx, dy, radius) {
    const tryAxis = (nx, ny) => {
      const minC = Math.floor((nx - radius) / TILE);
      const maxC = Math.floor((nx + radius) / TILE);
      const minR = Math.floor((ny - radius) / TILE);
      const maxR = Math.floor((ny + radius) / TILE);
      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          if (!this.solidAt(c, r)) continue;
          const bx = c * TILE, by = r * TILE;
          const nearX = Math.max(bx, Math.min(nx, bx + TILE));
          const nearY = Math.max(by, Math.min(ny, by + TILE));
          const ddx = nx - nearX, ddy = ny - nearY;
          if (ddx * ddx + ddy * ddy < radius * radius) return false;
        }
      }
      return true;
    };
    if (tryAxis(pos.x + dx, pos.y)) pos.x += dx;
    if (tryAxis(pos.x, pos.y + dy)) pos.y += dy;
  }

  // True when no wall/crate blocks the straight segment (sampled densely).
  lineOfSight(x0, y0, x1, y1) {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(1, Math.ceil(dist / 8));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      if (this.solidAt(Math.floor(x / TILE), Math.floor(y / TILE))) return false;
    }
    return true;
  }
}
