import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'

// 이 앱은 의료·상담이 아니라 여행 추천이다. 화면 문구가 마음이나 몸에 대한 효과를 약속하지 않도록,
// 소스에 아래 표현이 들어오면 시험이 실패한다. 장소의 공식 이름(서귀포 치유의 숲)만 예외로 허용한다.
export const BANNED = ['치유', '치료', '힐링', '완치', '우울증', '불안장애', '나아져', '낫게', '효과가 있', '마음이 치']
const ALLOWED_NAMES = ['서귀포 치유의 숲', '서귀포치유의숲']

export function findBanned(source) {
  let t = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1') // 주석은 화면에 나오지 않는다
  for (const name of ALLOWED_NAMES) t = t.split(name).join('')
  return BANNED.filter((w) => t.includes(w))
}

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name)
    return d.isDirectory() ? walk(p) : /\.(jsx?|html)$/.test(d.name) && !/\.test\./.test(d.name) ? [p] : []
  })

test('검사기가 금지 표현을 잡고, 공식 장소 이름과 주석은 봐준다', () => {
  assert.deepEqual(findBanned('<p>마음을 치유해 줘요</p>'), ['치유'])
  assert.deepEqual(findBanned('<p>우울증이 나아져요</p>'), ['우울증', '나아져'])
  assert.deepEqual(findBanned("title: '서귀포 치유의 숲'"), [])
  assert.deepEqual(findBanned('// 치료가 아니라 여행 추천\nconst a = 1'), [])
  assert.deepEqual(findBanned('const u = "https://x.kr"; <p>힐링</p>'), ['힐링'])
})

test('화면 소스(src, 서버 안내문)에 효과를 약속하는 표현이 없다', () => {
  const files = [...walk('src'), 'index.html', 'server/plan.js', 'server/tools.js', 'api/chat.js']
  const hits = files.map((f) => [f, findBanned(fs.readFileSync(f, 'utf8'))]).filter(([, w]) => w.length)
  assert.deepEqual(hits, [])
})
