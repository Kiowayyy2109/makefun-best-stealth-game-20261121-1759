// Nightshade — level data. One job: the three hand-built maps.
// Legend: # wall, . floor, C crate (cover, blocks sight + movement),
//         S shadow pool (dark floor: detection rises slowly there),
//         P player start, G guard spawn, o data core, E exit.
// Guard patrol waypoints are tile coordinates [col, row]; they must sit on walkable tiles.
export const LEVELS = [
  {
    name: 'The Quiet Gallery',
    briefing: 'Slip past the patrols. Take all 3 ember cores, then reach the green exit unseen.',
    map: [
      '####################',
      '#P....C......o.....#',
      '#.....#......#.....#',
      '#..G..#..C...#..E..#',
      '#.....#......#.....#',
      '#..C.....o.....C...#',
      '#.....#####........#',
      '#..o......#...G....#',
      '#.....C...#........#',
      '#.........#....C...#',
      '####################',
    ],
    guards: [
      { waypoints: [[2, 3], [5, 3]], pause: 1.2 },
      { waypoints: [[12, 7], [18, 7]], pause: 1.0 },
    ],
  },
  {
    name: 'The Sunken Archive',
    briefing: 'Three wardens now. Shadows are your friends — detection crawls in the dark.',
    map: [
      '####################',
      '#P...S....C....o...#',
      '#..###......###....#',
      '#..G.....C.....G...#',
      '#..S....###....S...#',
      '#....C.......o.....#',
      '#.####....C...####.#',
      '#..o.....C.....G...#',
      '#..S....###....S...#',
      '#....C......E......#',
      '####################',
    ],
    guards: [
      { waypoints: [[2, 3], [8, 3]], pause: 1.0 },
      { waypoints: [[12, 3], [18, 3]], pause: 1.4 },
      { waypoints: [[12, 7], [18, 7]], pause: 0.8 },
    ],
  },
  {
    name: 'The Ember Vault',
    briefing: 'Four wardens, tight corridors, one vault. Run and they will hear you. Sneak.',
    map: [
      '####################',
      '#P..C....S....o..E.#',
      '#.##...##...##...#.#',
      '#..G.....C......G..#',
      '#.##...##..S...##..#',
      '#....C.....o....C..#',
      '#..####..###..####.#',
      '#..o....C....G.....#',
      '#.##..S..##...##...#',
      '#..G......C........#',
      '####################',
    ],
    guards: [
      { waypoints: [[2, 3], [8, 3]], pause: 0.9 },
      { waypoints: [[15, 3], [18, 3]], pause: 1.1 },
      { waypoints: [[13, 7], [18, 7]], pause: 0.8 },
      { waypoints: [[2, 9], [9, 9]], pause: 1.2 },
    ],
  },
];
