import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// import { nodePolyfills } from 'vite-plugin-node-polyfills'  // ← Comment out

export default defineConfig({
  plugins: [
    react(),
    // nodePolyfills({ ... })  // ← Comment out this block
  ],
  base: '/pinkwhale/',  // Keep this
})
