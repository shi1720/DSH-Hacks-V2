import { build } from "esbuild";
import { mkdir, copyFile } from "node:fs/promises";
await mkdir("public/ai", { recursive: true });
await build({
  entryPoints: ["lib/lotlight/semantic-worker.ts"],
  outfile: "public/ai/semantic-worker.js",
  bundle: true,
  platform: "browser",
  format: "esm",
  target: "es2022",
  minify: true,
  legalComments: "eof",
});
for (const file of [
  "ort-wasm-simd-threaded.jsep.mjs",
  "ort-wasm-simd-threaded.jsep.wasm",
])
  await copyFile(
    "node_modules/onnxruntime-web/dist/" + file,
    "public/ai/" + file,
  );
console.log("Built isolated browser AI worker and local WASM runtime.");
