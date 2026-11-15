import { execFileSync } from "node:child_process";
import { cpSync, rmSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const publicArtifact = path.join(root, "artifacts", "cong-dich-vu-moi");
const output = path.join(publicArtifact, "dist", "public");

rmSync(output, { recursive: true, force: true });
execFileSync("pnpm", ["--filter", "@workspace/cong-dich-vu-moi", "build"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, NODE_ENV: "production", PORT: "3000", BASE_PATH: "/" },
});

console.log(`Static publication output ready: ${output}`);
