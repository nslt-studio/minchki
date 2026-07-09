import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: true,
    port: 5679,
    strictPort: true,
    cors: true,
    // Le tunnel Cloudflare arrive avec un Host header en *.trycloudflare.com,
    // différent de localhost : il faut l'autoriser explicitement.
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
    lib: {
      entry: 'src/main.js',
      name: 'Minchki',
      formats: ['iife'],
      fileName: () => 'main.js',
    },
  },
})
