// Restore generated data after Vite builds the tracked application files.
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';

const run = promisify(execFile);
const release = 'https://github.com/Iam-invisible/Lunar-Lander-Repo/releases/download/terrain-v1/';
const manifest = JSON.parse(await readFile(new URL('./terrain-release.json', import.meta.url), 'utf8'));
const destination = fileURLToPath(new URL('../dist/tiles/', import.meta.url));
const scratch = await mkdtemp(join(tmpdir(), 'craterview-terrain-'));
await mkdir(destination, { recursive: true });
try {
  for (const [name, expected] of Object.entries(manifest)) {
    const archive = join(scratch, name);
    console.log('Restoring', name);
    await run('curl', ['--fail', '--silent', '--show-error', '--location', '--retry', '4', '--output', archive, release + name]);
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(archive)) hash.update(chunk);
    if (hash.digest('hex') !== expected) throw new Error('Terrain checksum mismatch: ' + name);
    await run('tar', ['-xzf', archive, '-C', destination]);
    await rm(archive);
  }
} finally {
  await rm(scratch, { recursive: true, force: true });
}

// The Vercel deployment serves every terrain level through /tiles/ directly.
const statusDirectory = fileURLToPath(new URL('../dist/orbital/', import.meta.url));
await mkdir(statusDirectory, { recursive: true });
await writeFile(join(statusDirectory, 'status.json'), '{}\n');
