import { build } from 'esbuild';
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const ortSource = join(root, 'node_modules/onnxruntime-web/dist');
const ortTarget = join(root, 'lib/paddleocr/wasm');

await mkdir(ortTarget, { recursive: true });

// Keep one thread so the extension does not require cross-origin isolation.
for (const file of [
  'ort-wasm-simd-threaded.mjs',
  'ort-wasm-simd-threaded.wasm'
]) {
  await copyFile(`${ortSource}/${file}`, `${ortTarget}/${file}`);
}

await build({
  stdin: {
    contents: await readFile(join(root, 'scripts/paddleocr-entry.js'), 'utf8'),
    resolveDir: root,
    sourcefile: 'paddleocr-entry.js',
    loader: 'js'
  },
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  // PaddleOCR imports onnxruntime-web dynamically. The package default
  // browser entry includes WebGPU/WebGL code that uses new Function(), which
  // Chrome MV3 rejects even with wasm-unsafe-eval. Use the WASM-only entry.
  alias: {
    'onnxruntime-web': join(root, 'node_modules/onnxruntime-web/dist/ort.wasm.min.mjs')
  },
  external: ['fs', 'path', 'crypto'],
  outfile: './offscreen/paddleocr.bundle.js',
  minify: true,
  sourcemap: false,
  logLevel: 'info'
});
