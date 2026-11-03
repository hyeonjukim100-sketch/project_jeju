import assert from 'node:assert/strict'
import { mock, test } from 'node:test'
import handler from './chat.js'

// 모델을 부르기 전에 막히는 요청(보낼 말 없음)만 보내서, 호출 횟수 제한만 시험한다
const call = async (ip) => {
  const out = { code: null }
  const res = { status: (c) => ((out.code = c), res), json: () => res }
  await handler({ method: 'POST', headers: { 'x-forwarded-for': ip }, body: {} }, res)
  return out.code
}

test('같은 IP 가 1분에 15번을 넘기면 429', async () => {
  const codes = []
  for (let i = 0; i < 16; i++) codes.push(await call('10.0.0.1'))
  assert.deepEqual(codes.slice(0, 15), Array(15).fill(400))
  assert.equal(codes[15], 429)
})

test('다른 IP 는 영향을 받지 않는다', async () => {
  for (let i = 0; i < 20; i++) await call('10.0.0.2')
  assert.equal(await call('10.0.0.3'), 400)
})

test('1분 제한을 지켜도 한 시간에 100번을 넘기면 429 (AI 비용 보호)', async () => {
  mock.timers.enable({ apis: ['Date'], now: 0 })
  try {
    let blocked = 0
    for (let i = 0; i < 110; i++) {
      if ((await call('10.0.0.4')) === 429) blocked++
      mock.timers.tick(6_000) // 6초마다 한 번 = 분당 10번
    }
    assert.equal(blocked, 10)
  } finally {
    mock.timers.reset()
  }
})

test('IP 헤더가 없으면 연결 주소로 센다', async () => {
  const out = { code: null }
  const res = { status: (c) => ((out.code = c), res), json: () => res }
  await handler({ method: 'POST', headers: {}, socket: { remoteAddress: '10.0.0.5' }, body: {} }, res)
  assert.equal(out.code, 400)
})
