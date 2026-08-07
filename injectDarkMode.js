import fs from 'fs';
import path from 'path';

const replacements = [
  { regex: /\bbg-white\b(?! dark:bg-zinc-900)/g, replace: 'bg-white dark:bg-zinc-900' },
  { regex: /\bbg-slate-50\b(?! dark:bg-zinc-950)/g, replace: 'bg-slate-50 dark:bg-zinc-950' },
  { regex: /\bbg-slate-100\b(?! dark:bg-zinc-800)/g, replace: 'bg-slate-100 dark:bg-zinc-800' },
  { regex: /\bbg-gray-200\b(?! dark:bg-zinc-950)/g, replace: 'bg-gray-200 dark:bg-zinc-950' }, // the main body in App.jsx
  { regex: /\bborder-slate-300\b(?! dark:border-zinc-700)/g, replace: 'border-slate-300 dark:border-zinc-700' },
  { regex: /\btext-slate-900\b(?! dark:text-slate-100)/g, replace: 'text-slate-900 dark:text-slate-100' },
  { regex: /\btext-slate-800\b(?! dark:text-slate-200)/g, replace: 'text-slate-800 dark:text-slate-200' },
  { regex: /\btext-slate-700\b(?! dark:text-slate-300)/g, replace: 'text-slate-700 dark:text-slate-300' },
  { regex: /\btext-slate-600\b(?! dark:text-slate-400)/g, replace: 'text-slate-600 dark:text-slate-400' },
  { regex: /\btext-slate-500\b(?! dark:text-slate-500)/g, replace: 'text-slate-500 dark:text-slate-500' },
  { regex: /\btext-slate-400\b(?! dark:text-slate-600)/g, replace: 'text-slate-400 dark:text-slate-600' },
];

function formatFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  for (const { regex, replace } of replacements) {
    content = content.replace(regex, replace);
  }
  
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('Injected dark mode:', filePath);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js') || fullPath.endsWith('.tsx') || fullPath.endsWith('.html')) {
      formatFile(fullPath);
    }
  }
}

const currentDir = process.cwd();
walkDir(path.join(currentDir, 'src'));
