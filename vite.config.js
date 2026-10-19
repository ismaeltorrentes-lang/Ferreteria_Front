import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      input: {
        catalogo: resolve(import.meta.dirname, 'index.html'),
        ventas: resolve(import.meta.dirname, 'ventas.html'),
        login: resolve(import.meta.dirname, 'login.html'),
      },
    },
  },
})
