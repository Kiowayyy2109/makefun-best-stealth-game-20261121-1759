// Nightshade — staged screenshot states. One job: put the real game into
// photogenic, playable states for the maker's own screenshots (?shot=1..3).
// Every state is produced by the game's own update code, never by drawing over it.
export function applyShot(game, n) {
  if (n === 1) {
    // Level start: player in the open gallery, both patrol cones sweeping ahead.
    game.state = 'playing';
    game.player.x = 4.5 * 64; game.player.y = 5.5 * 64;
  } else if (n === 2) {
    // Mid-stealth near-miss: player crouched in shadow at the cone's edge,
    // one guard wary, suspicion climbing — the tense moment of the game.
    game.state = 'playing';
    game.player.x = 5.5 * 64; game.player.y = 4.5 * 64;
    game.player.sneaking = true;
    const g = game.guards[0];
    g.x = 4.5 * 64; g.y = 3.5 * 64;
    g.angle = Math.PI / 2; // facing down toward the player
    g.suspicion = 62;
    g.state = 'wary';
    g.lastSeen = { x: game.player.x, y: game.player.y };
    game.coresGot = 1;
    game.world.cores[0].taken = true;
  } else if (n === 3) {
    // Endgame: all cores taken, exit lit, player one step from freedom,
    // a guard sweeping the corridor behind them.
    game.state = 'playing';
    game.coresGot = 3;
    for (const c of game.world.cores) c.taken = true;
    game.player.x = 14.5 * 64; game.player.y = 3.5 * 64;
    const g = game.guards[1];
    g.x = 12.5 * 64; g.y = 7.5 * 64;
    g.angle = -Math.PI / 2;
    g.suspicion = 18;
    g.state = 'patrol';
  }
}
