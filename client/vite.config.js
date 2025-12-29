import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from "fs";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 8083,
    https: {
      key: fs.readFileSync(
        path.resolve(__dirname, "../certs/10.10.8.53+2-key.pem")
      ),
      cert: fs.readFileSync(
        path.resolve(__dirname, "../certs/10.10.8.53+2.pem")
      ),
    },
  },
});
