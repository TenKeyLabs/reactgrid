import { defineConfig } from "vite";
import { resolve } from "path";
import react from "@vitejs/plugin-react-swc";
import dts from "vite-plugin-dts";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxImportSource: "@emotion/react",
    }),
    // Declarations roll up into a single main.d.ts, so the published artifact is one bundle, one declaration file and one sourcemap.
    dts({ include: ["lib"], exclude: ["lib/**/*.test.*"], rollupTypes: true }),
    cssInjectedByJsPlugin(),
  ],
  // Library builds are always production builds: the development-only branches are compiled away rather than left to the consumer's bundler.
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  esbuild: {
    drop: ["console"],
  },
  build: {
    lib: {
      entry: resolve(__dirname, "lib/main.ts"),
      formats: ["es"],
      fileName: "main",
    },
    copyPublicDir: false,
    rollupOptions: {
      external: ["react", "react/jsx-runtime"],
    },
    minify: "esbuild",
    sourcemap: true,
    emptyOutDir: true,
  },
});
