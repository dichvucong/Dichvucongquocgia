import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { mkdir } from "node:fs/promises";

const output = new URL("./node_modules/.cache/image-cleanup.test.mjs", import.meta.url);
await mkdir(new URL("./node_modules/.cache/", import.meta.url), { recursive: true });
await build({
  entryPoints: [new URL("./src/lib/image-cleanup.test.ts", import.meta.url).pathname],
  outfile: output.pathname,
  platform: "node",
  format: "esm",
  bundle: true,
  external: ["pg-native", "sharp", "@google-cloud/*", "google-auth-library"],
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
});
const result = spawnSync(process.execPath, ["--test", output.pathname], { stdio: "inherit" });
process.exit(result.status ?? 1);
