import fs from 'fs';

function inject(file) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('@custom-variant dark')) {
    content = content.replace('@import "tailwindcss";', '@import "tailwindcss";\n@custom-variant dark (&:where(.dark, .dark *));');
    fs.writeFileSync(file, content);
    console.log('Injected custom variant into', file);
  }
}

inject('c:/Users/4thge/Desktop/dgtools/velotime-ui/src/index.css');
inject('c:/Users/4thge/Desktop/dgtools/velotime-landing/src/app/globals.css');
