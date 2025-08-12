import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  server: {
    allowedHosts: [
      '51b21518b6ff83c313ab753cfe70a052.serveo.net',
      '.serveo.net'  
    ]
  },
  plugins: [
    tailwindcss(),
    react()
  ],
  css: {
    postcss: './postcss.config.js'
  }
})
