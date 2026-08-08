const fs = require('fs');

let css = fs.readFileSync('src/index.css', 'utf8');

// The themes start at :root, and go until the end of the file.
const themesRegex = /:root,[\s\S]*:root\[data-theme="amber"\] {[\s\S]*?}/m;

const newThemes = `:root {
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

.dark {
  --primary-50: var(--color-blue-950);
  --primary-100: var(--color-blue-900);
  --primary-200: var(--color-blue-800);
  --primary-300: var(--color-blue-700);
  --primary-400: var(--color-blue-600);
  --primary-500: var(--color-blue-500);
  --primary-600: var(--color-blue-400);
  --primary-700: var(--color-blue-300);
  --primary-800: var(--color-blue-200);
  --primary-900: var(--color-blue-100);
  --primary-950: var(--color-blue-50);
}`;

css = css.replace(themesRegex, newThemes);
fs.writeFileSync('src/index.css', css, 'utf8');
console.log('Fixed index.css');
