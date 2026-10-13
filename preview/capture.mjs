#!/usr/bin/env node
// Records the browser preview as a loop for portfolios: wallpapers cycling, window focus moving, the unlock screen.
// Usage: npx -y -p @soleone/showcase@0.2.0 node preview/capture.mjs
// Needs agent-browser (with its browser installed) and FFmpeg on the PATH. Writes preview/media/demo.webp.
import { execFile } from 'node:child_process';
import { realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { serve } from './serve.mjs';

const exec = promisify(execFile);
// The theme repo has no package.json, so showcase comes from npx and is found through its bin on the PATH.
const showcase = await realpath((await exec('which', ['showcase'])).stdout.trim());
const { record } = await import(pathToFileURL(path.join(path.dirname(showcase), '../src/capture.js')).href);

const here = path.dirname(fileURLToPath(import.meta.url));
// At 1280x784 the desktop fills the top 1280x720 exactly; the crop drops the controls below it.
const viewport = { width: 1280, height: 784 };
const server = await serve(0);
const focus = (id) => `window.gilt.focusWindow('${id}')`;
try {
  const { frames, durationMs, grid } = await record({
    url: `http://127.0.0.1:${server.address().port}/`,
    out: path.join(here, 'media/demo.webp'),
    viewport,
    width: 960,
    crop: 'iw:ih*720/784:0:0',
    attempts: 2,
    async start(page) {
      await page.waitFor('window.giltReady === true', { timeoutMs: 30_000 });
      await page.sleep(1500);
    },
    async drive(page) {
      await page.sleep(1600);
      for (let step = 0; step < 3; step++) {
        await page.click('Next wallpaper');
        await page.sleep(2000);
      }
      await page.run('eval', focus('term'));
      await page.sleep(900);
      await page.run('eval', focus('palette'));
      await page.sleep(1200);
      await page.click('Lock');
      await page.sleep(2800);
      await page.run('press', 'Escape');
      await page.sleep(900);
      // Back to where the loop starts: the first wallpaper with Neovim focused.
      await page.run('eval', focus('nvim'));
      await page.run('eval', 'window.gilt.showWallpaper(0)');
      await page.sleep(2200);
    },
    async verify(page) {
      if (!(await page.eval(`document.getElementById('wallname').textContent.startsWith('01')`))) return 'did not end on the first wallpaper';
    },
  });
  console.log(`Wrote preview/media/demo.webp (${frames} frames, ${(durationMs / 1000).toFixed(1)} s). Check the frames in ${grid}.`);
} finally {
  server.close();
}
