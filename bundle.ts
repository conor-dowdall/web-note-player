import * as esbuild from "https://deno.land/x/esbuild@v0.25.3/mod.js";
import { denoPlugins } from "jsr:@duesabati/esbuild-deno-plugin";

async function bundle() {
  try {
    await esbuild.build({
      entryPoints: ["./src/mod.ts"],
      bundle: true,
      outfile: "./dist/bundle.js",
      platform: "browser",
      format: "esm",
      sourcemap: true,
      minify: true,
      plugins: denoPlugins(),
    });

    console.log("Bundling complete: created dist/bundle.js");
  } catch (error) {
    console.error("Bundling failed:", error);
  } finally {
    await esbuild.stop();
  }
}

bundle();
