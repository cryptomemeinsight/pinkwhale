import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// import { nodePolyfills } from 'vite-plugin-node-polyfills'  // ← Comment this out

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // nodePolyfills({ ... })  // ← Comment out the entire polyfills block
  ],
  base: '/pinkwhale/',  // Keep this!
})
