// 관광지 좌표 점검 결과를 server/coordFixes.js 로 만든다. 실행: node scripts/coord-fix.mjs  (.env.local 의 KAKAO_REST_KEY, DATA_GO_KR_KEY 필요)
// 카카오 호출이 많아서 서버가 켜질 때마다 하지 않고, 결과만 파일로 저장해 둔다.
import fs from 'node:fs'
for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim() }
const { getSpots } = await import('../server/tour.js')
const { judge } = await import('../server/coordFix.js')

const H = { Authorization: `KakaoAK ${process.env.KAKAO_REST_KEY}` }
const call = async (path, query) => {
  const r = await fetch(`https://dapi.kakao.com/v2/local/search/${path}.json?size=1&query=${encodeURIComponent(query)}`, { headers: H })
  if (!r.ok) throw new Error(`kakao ${r.status}`)
  return (await r.json()).documents?.[0] || null
}
const xy = (d) => (d ? { lat: Number(d.y), lng: Number(d.x) } : null)

const spots = await getSpots()
const fixes = {}
const hidden = []
const stat = { keep: 0, fix: 0, hide: 0 }
let i = 0
await Promise.all(Array.from({ length: 6 }, async () => {
  while (i < spots.length) {
    const s = spots[i++]
    const addr = s.address ? xy(await call('address', s.address)) : null
    const k = await call('keyword', `제주 ${s.title}`)
    const named = k ? { title: k.place_name, ...xy(k) } : null
    const v = judge(s, addr, named)
    stat[v.action]++
    if (v.action === 'fix') fixes[s.id] = { lat: v.lat, lng: v.lng, was: `${s.title} ${s.lat},${s.lng}` }
    if (v.action === 'hide') hidden.push({ id: s.id, title: s.title, at: `${s.lat},${s.lng}`, address: s.address })
  }
}))
console.log(stat)
const sorted = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => Number(a) - Number(b)))
const body = `// scripts/coord-fix.mjs 가 만든 파일이다. 직접 고치지 않는다. (연번 기준)
// AUTO_FIXES: 주소와 어긋나는데 카카오 이름 검색 위치가 주소와 맞아 바꾼 곳 / HIDDEN_IDS: 어느 쪽이 맞는지 몰라 숨긴 곳
export const AUTO_FIXES = ${JSON.stringify(sorted(fixes), null, 2)}

export const HIDDEN_IDS = new Set([
${hidden.sort((a, b) => Number(a.id) - Number(b.id)).map((h) => `  '${h.id}', // ${h.title} (${h.at}) ${h.address}`).join('\n')}
])
`
fs.writeFileSync('server/coordFixes.js', body)
