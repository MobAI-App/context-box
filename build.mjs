import * as esbuild from 'esbuild';
import { cpSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes('--watch');

const entryPoints = [
  'src/popup/popup.ts',
  'src/content/content.ts',
  'src/background/service-worker.ts',
];

const buildOptions = {
  entryPoints,
  bundle: true,
  outdir: 'dist',
  format: 'esm',
  target: 'chrome120',
  sourcemap: true,
  minify: !isWatch,
  logLevel: 'info',
};

// Copy static files
function copyStaticFiles() {
  const staticFiles = [
    ['manifest.json', 'dist/manifest.json'],
    ['src/popup/popup.html', 'dist/popup/popup.html'],
    ['src/popup/popup.css', 'dist/popup/popup.css'],
    ['src/content/content.css', 'dist/content/content.css'],
    ['icons', 'dist/icons'],
  ];

  for (const [src, dest] of staticFiles) {
    if (existsSync(src)) {
      const destDir = dirname(dest);
      if (!existsSync(destDir)) {
        mkdirSync(destDir, { recursive: true });
      }
      cpSync(src, dest, { recursive: true });
    }
  }
}

async function build() {
  copyStaticFiles();

  if (isWatch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log('Watching for changes...');
  } else {
    await esbuild.build(buildOptions);
    console.log('Build complete!');
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
