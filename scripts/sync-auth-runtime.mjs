import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const targetPath = path.resolve(__dirname, '../public/vendor-auth.js');

async function syncAuthRuntime() {
  try {
    // If file already exists and was modified in the last 7 days, keep it
    if (fs.existsSync(targetPath)) {
      const stats = fs.statSync(targetPath);
      const ageDays = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24);
      if (ageDays < 7 && stats.size > 100000) {
        console.log(`[sync-auth-runtime] vendor-auth.js is fresh (${Math.round(ageDays)}d old, ${stats.size} bytes). Skipping download.`);
        return;
      }
    }

    console.log('[sync-auth-runtime] Downloading first-party auth runtime from Clerk CDN...');
    const res = await fetch('https://clerk.velotime.dg.tools/npm/@clerk/clerk-js@5/dist/clerk.browser.js');
    if (!res.ok) {
      console.warn(`[sync-auth-runtime] Failed to fetch auth runtime (${res.status}). Using existing asset.`);
      return;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 50000) {
      console.warn(`[sync-auth-runtime] Downloaded file too small (${buf.length} bytes). Aborting.`);
      return;
    }
    fs.writeFileSync(targetPath, buf);
    console.log(`[sync-auth-runtime] Successfully synchronized vendor-auth.js (${buf.length} bytes) to first-party public assets.`);
  } catch (err) {
    console.warn('[sync-auth-runtime] Warning: Could not download auth runtime:', err.message);
  }
}

syncAuthRuntime();
