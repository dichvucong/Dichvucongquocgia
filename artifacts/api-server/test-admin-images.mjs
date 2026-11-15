import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";

// Bundle-time substitutions exist only in this test executable, never in the API.
await mkdir(new URL("./node_modules/.cache/", import.meta.url), { recursive: true });
const directory = await mkdtemp(new URL("./node_modules/.cache/admin-images-", import.meta.url).pathname);
try {
  const output = `${directory}/suite.mjs`;
  await build({
    entryPoints: [new URL("./src/tests/admin-images.test.ts", import.meta.url).pathname],
    outfile: output,
    platform: "node",
    format: "esm",
    bundle: true,
    alias: {
      "@workspace/db": new URL("./src/tests/fixtures/database.ts", import.meta.url).pathname,
      "@clerk/express": new URL("./src/tests/fixtures/clerk.ts", import.meta.url).pathname,
    },
    external: ["pg-native", "sharp", "@google-cloud/*", "google-auth-library"],
    banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  });
  const result = spawnSync(process.execPath, ["--test", "--test-timeout=60000", output], {
    stdio: "inherit",
    // No real Clerk configuration is read by these tests.
    env: { ...process.env, ADMIN_EMAILS: "", NODE_ENV: "test" },
    timeout: 90_000,
  });
  process.exitCode = result.status ?? 1;
} finally {
  await rm(directory, { recursive: true, force: true });
}
