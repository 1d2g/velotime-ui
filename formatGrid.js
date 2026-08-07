import fs from 'fs';
import path from 'path';

const replacements = [
  { regex: /\brounded-[a-zA-Z0-9-]+\b/g, replace: '' }, // Strip all rounded corners
  { regex: /\bshadow-[a-zA-Z0-9-]+\b/g, replace: '' }, // Strip all shadows
  { regex: /\bborder-gray-[0-9]+\b/g, replace: 'border-slate-300' }, // Standardize borders
  { regex: /\btext-gray-900\b/g, replace: 'text-slate-900' },
  { regex: /\btext-gray-800\b/g, replace: 'text-slate-900' },
  { regex: /\btext-gray-700\b/g, replace: 'text-slate-700' },
  { regex: /\btext-gray-600\b/g, replace: 'text-slate-600' },
  { regex: /\btext-gray-500\b/g, replace: 'text-slate-500' },
  { regex: /\btext-gray-400\b/g, replace: 'text-slate-400' },
  { regex: /\bbg-gray-50\b/g, replace: 'bg-slate-50' },
  { regex: /\bbg-gray-100\b/g, replace: 'bg-slate-100' },
  { regex: /\bhover:bg-gray-100\b/g, replace: 'hover:bg-slate-100' },
  { regex: /\bhover:bg-gray-200\b/g, replace: 'hover:bg-slate-200' },
  { regex: /\bring-blue-500\b/g, replace: 'ring-slate-900' }, // Focus rings to black
  { regex: /\bborder-blue-[0-9]+\b/g, replace: 'border-slate-900' },
  { regex: /\btext-blue-600\b/g, replace: 'text-rose-600' }, // Accents to Rose
  { regex: /\btext-blue-700\b/g, replace: 'text-rose-700' },
  { regex: /\btext-blue-500\b/g, replace: 'text-rose-600' },
  { regex: /\bbg-blue-50\b/g, replace: 'bg-rose-50' },
  { regex: /\bbg-blue-100\b/g, replace: 'bg-rose-100' },
  { regex: /\bbg-blue-600\b/g, replace: 'bg-slate-900' }, // Primary buttons to black
  { regex: /\bbg-blue-700\b/g, replace: 'bg-slate-900' },
  { regex: /\bhover:bg-blue-[0-9]+\b/g, replace: 'hover:bg-slate-800' },
  { regex: /\btext-white\b/g, replace: 'text-white' }, // Just to ensure safe boundaries
];

function formatFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  for (const { regex, replace } of replacements) {
    content = content.replace(regex, replace);
  }
  
  // Clean up double spaces that might be left in className strings
  content = content.replace(/  +/g, ' ');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('Formatted', filePath);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      formatFile(fullPath);
    }
  }
}

formatFile('c:/Users/4thge/Desktop/dgtools/velotime-ui/src/App.jsx');
walkDir('c:/Users/4thge/Desktop/dgtools/velotime-ui/src/components');
