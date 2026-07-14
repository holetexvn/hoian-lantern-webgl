import { defineConfig } from 'vite'
import fs from 'node:fs'

// dev-only helper: the page POSTs rendered frames here during offline video capture
const saveFrame = {
  name: 'save-frame',
  configureServer(server) {
    server.middlewares.use('/save-frame', (req, res) => {
      const n = new URL(req.url, 'http://localhost').searchParams.get('n')
      const chunks = []
      req.on('data', (c) => chunks.push(c))
      req.on('end', () => {
        fs.mkdirSync('.frames', { recursive: true })
        fs.writeFileSync(`.frames/frame-${String(n).padStart(4, '0')}.jpg`, Buffer.concat(chunks))
        res.end('ok')
      })
    })
  },
}

export default defineConfig({ server: { port: 5173, strictPort: true }, plugins: [saveFrame] })
