import test from 'node:test'
import assert from 'node:assert/strict'
import { createLimiter } from './rateLimit.js'

test('allows up to max requests per window and blocks the next one', () => {
  const tooMany = createLimiter(3, 60_000)
  assert.equal(tooMany('a', 0), false)
  assert.equal(tooMany('a', 1), false)
  assert.equal(tooMany('a', 2), false)
  assert.equal(tooMany('a', 3), true)
})

test('keeps a separate count per key', () => {
  const tooMany = createLimiter(1, 60_000)
  assert.equal(tooMany('a', 0), false)
  assert.equal(tooMany('b', 0), false)
  assert.equal(tooMany('a', 1), true)
})

test('lets requests through again once the window has passed', () => {
  const tooMany = createLimiter(1, 60_000)
  assert.equal(tooMany('a', 0), false)
  assert.equal(tooMany('a', 30_000), true)
  assert.equal(tooMany('a', 60_001), false)
})

test('forgets keys that have been quiet so the map cannot grow forever', () => {
  const tooMany = createLimiter(1, 1_000)
  for (let i = 0; i < 1500; i++) tooMany(`ip${i}`, 0)
  assert.equal(tooMany.size(), 1500)
  tooMany('late', 5_000) // 창이 지난 뒤의 호출이 오래된 키를 치운다
  assert.ok(tooMany.size() < 100)
})
