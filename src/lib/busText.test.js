import test from 'node:test'
import assert from 'node:assert/strict'
import { busMeta, moreLabel } from './busText.js'

test('busMeta joins the stop count and the next bus', () => {
  assert.equal(busMeta({ stops: 1, nextMin: 8 }), '1개 정류장, 다음 버스 약 8분 뒤')
  assert.equal(busMeta({ stops: 12, nextMin: 0 }), '12개 정류장, 다음 버스 약 0분 뒤')
})

test('busMeta leaves out the next bus when it is unknown', () => {
  assert.equal(busMeta({ stops: 2, nextMin: null }), '2개 정류장')
  assert.equal(busMeta({ stops: 2 }), '2개 정류장')
})

test('moreLabel names how many more buses are hidden or offers to fold them', () => {
  assert.equal(moreLabel(3, false), '버스 2개 더 보기')
  assert.equal(moreLabel(2, false), '버스 1개 더 보기')
  assert.equal(moreLabel(3, true), '접기')
})
