// Nightshade — The Ember Vault: shared tuning constants.
// One small file, one job: every number the rest of the game tunes against.
export const TILE = 64;
export const COLS = 20;
export const ROWS = 11;
export const VIEW_W = 1280;
export const VIEW_H = 720;

export const PLAYER_R = 15;
export const PLAYER_WALK = 168;   // px/s, running (loud)
export const PLAYER_SNEAK = 92;   // px/s, crouched (quiet, hard to spot)
export const GUARD_WALK = 72;
export const GUARD_CHASE = 152;
export const GUARD_SUSPECT = 96;

export const VISION_RANGE = 235;
export const VISION_HALF_ANGLE = 0.62; // ~35 degrees each side
export const NOISE_RADIUS_RUN = 130;
export const NOISE_RADIUS_WALK = 0;    // walking is silent; only running makes noise
export const CATCH_DIST = 26;

export const SUSPICION = {
  // suspicion points per second while the player is inside a guard's cone + line of sight
  base: 46,
  closeBonus: 55,      // extra at point-blank range
  shadowFactor: 0.45,  // hiding in shadow slows the rise
  sneakFactor: 0.55,   // sneaking slows the rise
  runFactor: 1.35,     // running is easier to spot
  decay: 14,           // points per second when unseen
  suspiciousAt: 30,    // guard turns and investigates
  alertAt: 100,        // guard gives chase
  loseSightFor: 2.6,   // seconds unseen before giving up the chase
};

export const COLORS = {
  floorA: '#171a26',
  floorB: '#141724',
  floorLine: '#1e2233',
  wall: '#232742',
  wallTop: '#343b60',
  crate: '#4a3a26',
  crateTop: '#6b5636',
  shadow: 'rgba(4, 6, 14, 0.55)',
  exit: '#39d98a',
  core: '#ffcf4d',
  player: '#7fe7ff',
  playerCloak: '#2f6f8f',
  guard: '#ff5d5d',
  guardArmor: '#7a2b2b',
  coneCalm: 'rgba(255, 214, 90, 0.20)',
  coneWary: 'rgba(255, 166, 40, 0.30)',
  coneAlert: 'rgba(255, 70, 70, 0.34)',
};
