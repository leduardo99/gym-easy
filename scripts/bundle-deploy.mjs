import { mkdir } from "node:fs/promises";

import { build } from "esbuild";

const outdir = process.env.DEPLOY_BUNDLE_DIR ?? "deploy-bundles";

await mkdir(outdir, { recursive: true });

const shared = {
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "bundle",
  target: "node22",
  legalComments: "none",
};

await build({
  ...shared,
  entryPoints: ["scripts/migrate-on-deploy.mjs"],
  outfile: `${outdir}/migrate-on-deploy.mjs`,
});

await build({
  ...shared,
  entryPoints: ["scripts/purge-consent.mjs"],
  outfile: `${outdir}/purge-consent.mjs`,
});

await build({
  ...shared,
  entryPoints: ["scripts/purge-coach-messages.mjs"],
  outfile: `${outdir}/purge-coach-messages.mjs`,
});
