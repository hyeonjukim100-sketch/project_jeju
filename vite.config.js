import fs from 'node:fs'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// 개발 중에는 Vercel 없이도 /api/*.js 를 그대로 실행해 준다 (배포 땐 Vercel 이 담당)
function devApi(env) {
  return {
    name: 'dev-api',
    configureServer(server) {
      Object.assign(process.env, env)
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/')) return next()
        const name = req.url.slice(5).split('?')[0]
        const file = path.resolve('api', `${name}.js`)
        if (!/^[\w-]+$/.test(name) || !fs.existsSync(file)) return next()
        try {
          const mod = await server.ssrLoadModule(file)
          if (req.method === 'POST') {
            const chunks = []
            for await (const c of req) chunks.push(c)
            try {
              req.body = JSON.parse(Buffer.concat(chunks).toString() || '{}')
            } catch {
              req.body = {}
            }
          }
          res.status = (code) => ((res.statusCode = code), res)
          res.json = (body) => {
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify(body))
          }
          await mod.default(req, res)
        } catch (e) {
          res.statusCode = 500
          res.end(String(e.message))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), devApi(loadEnv(mode, process.cwd(), ''))],
}))
