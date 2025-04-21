import * as esbuild from "https://deno.land/x/esbuild@v0.25.2/mod.js";

await esbuild.build({
  entryPoints: ["src/mod.ts"], // Entry point
  bundle: true,
  outfile: "dist/mod.js", // Output file
  platform: "browser", // Target the browser
  format: "esm", // Output as an ES module
  sourcemap: true, // Enable sourcemaps for debugging
  minify: true, // Minify the output
});

console.log("Created dist/mod.js");
console.log("Build complete!");
await esbuild.stop();
