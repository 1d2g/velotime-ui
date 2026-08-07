import fs from 'fs';
import path from 'path';

function replaceRoseWithPrimary(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  content = content.replace(/\brose-([0-9]+)\b/g, 'primary-$1');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('Themed', filePath);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js') || fullPath.endsWith('.tsx')) {
      replaceRoseWithPrimary(fullPath);
    }
  }
}

walkDir('c:/Users/4thge/Desktop/dgtools/velotime-ui/src');

const cssPath = 'c:/Users/4thge/Desktop/dgtools/velotime-ui/src/index.css';
let cssContent = fs.readFileSync(cssPath, 'utf8');

// Replace hardcoded rose hexes with var(--primary-*)
cssContent = cssContent.replace(/background-color: #fff1f2;/g, 'background-color: var(--primary-50);');
cssContent = cssContent.replace(/border: 1px solid #fda4af;/g, 'border: 1px solid var(--primary-300);');
cssContent = cssContent.replace(/box-shadow: inset 0 0 0 2px #e11d48;/g, 'box-shadow: inset 0 0 0 2px var(--primary-600);');
cssContent = cssContent.replace(/color: #9f1239;/g, 'color: var(--primary-800);');
cssContent = cssContent.replace(/color: #e11d48;/g, 'color: var(--primary-600);');

const themeDef = `
@theme {
  --color-primary-50: var(--primary-50);
  --color-primary-100: var(--primary-100);
  --color-primary-200: var(--primary-200);
  --color-primary-300: var(--primary-300);
  --color-primary-400: var(--primary-400);
  --color-primary-500: var(--primary-500);
  --color-primary-600: var(--primary-600);
  --color-primary-700: var(--primary-700);
  --color-primary-800: var(--primary-800);
  --color-primary-900: var(--primary-900);
  --color-primary-950: var(--primary-950);
}

:root,
:root[data-theme="rose"] {
  --primary-50: var(--color-rose-50);
  --primary-100: var(--color-rose-100);
  --primary-200: var(--color-rose-200);
  --primary-300: var(--color-rose-300);
  --primary-400: var(--color-rose-400);
  --primary-500: var(--color-rose-500);
  --primary-600: var(--color-rose-600);
  --primary-700: var(--color-rose-700);
  --primary-800: var(--color-rose-800);
  --primary-900: var(--color-rose-900);
  --primary-950: var(--color-rose-950);
}

:root[data-theme="blue"] {
  --primary-50: var(--color-blue-50);
  --primary-100: var(--color-blue-100);
  --primary-200: var(--color-blue-200);
  --primary-300: var(--color-blue-300);
  --primary-400: var(--color-blue-400);
  --primary-500: var(--color-blue-500);
  --primary-600: var(--color-blue-600);
  --primary-700: var(--color-blue-700);
  --primary-800: var(--color-blue-800);
  --primary-900: var(--color-blue-900);
  --primary-950: var(--color-blue-950);
}

:root[data-theme="violet"] {
  --primary-50: var(--color-violet-50);
  --primary-100: var(--color-violet-100);
  --primary-200: var(--color-violet-200);
  --primary-300: var(--color-violet-300);
  --primary-400: var(--color-violet-400);
  --primary-500: var(--color-violet-500);
  --primary-600: var(--color-violet-600);
  --primary-700: var(--color-violet-700);
  --primary-800: var(--color-violet-800);
  --primary-900: var(--color-violet-900);
  --primary-950: var(--color-violet-950);
}

:root[data-theme="amber"] {
  --primary-50: var(--color-amber-50);
  --primary-100: var(--color-amber-100);
  --primary-200: var(--color-amber-200);
  --primary-300: var(--color-amber-300);
  --primary-400: var(--color-amber-400);
  --primary-500: var(--color-amber-500);
  --primary-600: var(--color-amber-600);
  --primary-700: var(--color-amber-700);
  --primary-800: var(--color-amber-800);
  --primary-900: var(--color-amber-900);
  --primary-950: var(--color-amber-950);
}
`;

if (!cssContent.includes('@theme {')) {
  fs.writeFileSync(cssPath, cssContent + '\n' + themeDef);
  console.log('Updated index.css with CSS Variables');
}
