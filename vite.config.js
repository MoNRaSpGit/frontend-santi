import { execSync } from "node:child_process";
import { defineConfig } from "vite";

function gitSha() {
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "local";
  }
}

export default defineConfig(({ mode }) => {
  const releaseSha = gitSha();
  return {
    // Rutas relativas: sirve en GitHub Pages sea cual sea el nombre del repo.
    base: mode === "github-pages" ? "./" : "/",
    define: { __APP_RELEASE_SHA__: JSON.stringify(releaseSha) },
    plugins: [
      {
        // app-build.json: la app lo consulta para saber si hay version nueva.
        name: "santi-app-build-meta",
        generateBundle() {
          this.emitFile({ type: "asset", fileName: "app-build.json", source: JSON.stringify({ releaseSha }) });
        }
      }
    ]
  };
});
