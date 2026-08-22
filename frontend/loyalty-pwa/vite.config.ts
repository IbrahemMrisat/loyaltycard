import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    https: {
      key: fs.readFileSync('./192.168.68.108+2-key.pem'),
      cert: fs.readFileSync('./192.168.68.108+2.pem'),
    }
  }
})