import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  publicDir: "../shared",
  base: process.env.VITE_BASE_PATH || "/",
});
