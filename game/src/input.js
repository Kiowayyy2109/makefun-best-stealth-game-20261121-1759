// Nightshade — keyboard input. One job: turn keys into a stable input state.
export class Input {
  constructor() {
    this.up = false; this.down = false; this.left = false; this.right = false;
    this.sneak = false;
    this._pressed = new Set();
    this._onKey = (e) => {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      if (k === 'w' || k === 'arrowup') this.up = true;
      if (k === 's' || k === 'arrowdown') this.down = true;
      if (k === 'a' || k === 'arrowleft') this.left = true;
      if (k === 'd' || k === 'arrowright') this.right = true;
      if (k === 'shift') this.sneak = true;
      if (!e.repeat) this._pressed.add(k);
    };
    this._onUp = (e) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') this.up = false;
      if (k === 's' || k === 'arrowdown') this.down = false;
      if (k === 'a' || k === 'arrowleft') this.left = false;
      if (k === 'd' || k === 'arrowright') this.right = false;
      if (k === 'shift') this.sneak = false;
    };
    window.addEventListener('keydown', this._onKey);
    window.addEventListener('keyup', this._onUp);
  }

  // True once for a key pressed since the last call (menu keys, restart, mute).
  pressed(key) {
    const k = key.toLowerCase();
    if (this._pressed.has(k)) { this._pressed.delete(k); return true; }
    return false;
  }

  clearPressed() { this._pressed.clear(); }
}
