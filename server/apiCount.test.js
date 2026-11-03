import assert from 'node:assert/strict'
import fs from 'node:fs'
import { test } from 'node:test'

// Vercel Hobby 요금제는 api/ 안의 파일 하나를 서버 함수 하나로 세고 12개까지만 배포된다.
// 시험 파일이나 도우미 파일을 api/ 에 두면 개수가 늘어 배포가 실패한다 (시험은 server/ 에 둔다).
test('api/ 에는 서버 함수 파일만 있고 12개를 넘지 않는다', () => {
  const files = fs.readdirSync('api')
  assert.deepEqual(files.filter((f) => /\.test\./.test(f)), [])
  assert.ok(files.length <= 12, `api/ 파일이 ${files.length}개예요 (Vercel Hobby 한도 12)`)
})
