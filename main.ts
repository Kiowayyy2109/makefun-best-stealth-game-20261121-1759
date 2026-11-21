// Nightshade — The Ember Vault: my own hand-in program (Node 22 stdlib only).
// It copies this repo's game/ and screenshots/ beside this file into /output
// (or MAKEFUN_OUTPUT_DIR outside the grader) and writes /output/dossier.json
// with the vendored make.fun library, exactly as the kit's starter does.
// Run it twice and the two outputs are byte-identical: the copy is a plain
// recursive copy and buildDossier is deterministic for the same directory.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// Same caps as the scorer's gate: text_max_bytes shapes the dossier bytes;
// the other caps refuse an entry the scorer would refuse.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
