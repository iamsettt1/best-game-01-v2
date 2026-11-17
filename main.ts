// STARFALL ARENA — make.fun best-game-01 entry program.
// Hands the game in by copying the static game folder and the screenshots
// into the output directory and writing the dossier the judge reads.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(fromName: string, toName: string): void {
  const source = join(rootDir, fromName);
  const target = join(outputDir, toName);
  mkdirSync(target, { recursive: true });
  if (existsSync(source)) {
    cpSync(source, target, { recursive: true });
  }
}

mkdirSync(outputDir, { recursive: true });
copyTree('game', 'game');
copyTree('screenshots', 'screenshots');

const dossierBytes = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossierBytes);

// A short receipt on stdout: handy when run by hand, ignored by the grader.
console.log(`STARFALL ARENA handed in: dossier.json is ${dossierBytes.byteLength} bytes in ${outputDir}`);
