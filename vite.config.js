import { resolve } from 'node:path'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  if (command === 'build' && !env.VITE_API_URL?.trim()) {
    throw new Error(
      'Falta VITE_API_URL. Configura la dirección de la API antes de compilar.'
    )
  }

  return {
    server: {
      port: 5173,
    },
    build: {
      rollupOptions: {
        input: {
          catalogo: resolve(import.meta.dirname, 'index.html'),
          ventas: resolve(import.meta.dirname, 'ventas.html'),
          historial: resolve(import.meta.dirname, 'historial.html'),
          login: resolve(import.meta.dirname, 'login.html'),
        },
      },
    },
  }
})