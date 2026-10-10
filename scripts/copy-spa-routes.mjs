import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, '..', 'dist');
const indexHtmlPath = path.join(distDir, 'index.html');

if (fs.existsSync(indexHtmlPath)) {
  const indexContent = fs.readFileSync(indexHtmlPath, 'utf8');

  // 1. Create 404.html in dist root for GitHub Pages fallback
  const fallback404 = path.join(distDir, '404.html');
  fs.writeFileSync(fallback404, indexContent, 'utf8');
  console.log('[SPA] Created dist/404.html');

  // 2. Create dist/control/index.html for direct 200 OK access to /control
  const controlDir = path.join(distDir, 'control');
  if (!fs.existsSync(controlDir)) {
    fs.mkdirSync(controlDir, { recursive: true });
  }
  fs.writeFileSync(path.join(controlDir, 'index.html'), indexContent, 'utf8');
  console.log('[SPA] Created dist/control/index.html');

  // 3. Create dist/control.html
  fs.writeFileSync(path.join(distDir, 'control.html'), indexContent, 'utf8');
  console.log('[SPA] Created dist/control.html');
} else {
  console.warn('[SPA] dist/index.html not found, skipping route copies');
}
