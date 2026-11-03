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

// 링크 미리보기(og:image 등)는 완전한 주소가 필요하다. 배포 주소는 VITE_SITE_URL, 없으면 Vercel 이 빌드 때 주는 운영 주소를 쓴다.
function siteUrl(env) {
  const raw = env.VITE_SITE_URL || (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
  return raw.replace(/\/+$/, '')
}
function htmlSiteUrl(env) {
  return { name: 'html-site-url', transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', siteUrl(env)) }
}

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
  return { plugins: [react(), devApi(loadEnv(mode, process.cwd(), '')), htmlSiteUrl(env)] }
})
