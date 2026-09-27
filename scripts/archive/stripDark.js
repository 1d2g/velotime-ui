import fs from 'fs';
import path from 'path';

function stripDarkClasses(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  // Match `dark:` followed by any valid tailwind class character (letters, numbers, dash, slash, brackets, percentages)
  // Basically `dark:` up to the next space or quote
  const regex = /dark:[^\s"']+/g;
  if (regex.test(content)) {
    content = content.replace(regex, '');
    fs.writeFileSync(filePath, content);
    console.log('Stripped dark classes from', filePath);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      stripDarkClasses(fullPath);
    }
  }
}

stripDarkClasses('c:/Users/4thge/Desktop/dgtools/velotime-ui/src/App.jsx');
walkDir('c:/Users/4thge/Desktop/dgtools/velotime-ui/src/components');
