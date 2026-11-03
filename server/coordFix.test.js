import test from 'node:test'
import assert from 'node:assert/strict'
import { judge } from './coordFix.js'

const spot = (o) => ({ title: '곳', address: '제주특별자치도 제주시 조천읍 함대로 362', lat: 33.152795, lng: 126.661194, ...o })
const addr = { lat: 33.513, lng: 126.6609 }

test('주소와 맞는 좌표는 그대로 둔다', () => {
  assert.deepEqual(judge(spot({ lat: 33.5131, lng: 126.661 }), addr, null), { action: 'keep' })
})

test('주소와 어긋나고 카카오 이름 검색이 주소와 맞으면 그 위치로 고친다', () => {
  const named = { title: '곳', lat: 33.5129, lng: 126.6611 }
  assert.deepEqual(judge(spot({}), addr, named), { action: 'fix', lat: 33.5129, lng: 126.6611 })
})

test('이름이 정확히 같지 않은 카카오 결과는 믿지 않고 숨긴다', () => {
  assert.deepEqual(judge(spot({}), addr, { title: '다른곳', lat: 33.5129, lng: 126.6611 }), { action: 'hide' })
})

test('좌표는 이름으로 확인되고 주소만 틀린 곳은 그대로 둔다', () => {
  const named = { title: '곳', lat: 33.1531, lng: 126.6612 }
  assert.deepEqual(judge(spot({}), addr, named), { action: 'keep' })
})

test('읍·면까지만 있는 주소는 10km 안이면 어긋남으로 보지 않는다', () => {
  assert.deepEqual(judge(spot({ address: '제주시 조천읍', lat: 33.46, lng: 126.66 }), addr, null), { action: 'keep' })
})

test('주소를 못 찾았어도 지형 밖(추자도)이면 숨긴다', () => {
  assert.deepEqual(judge(spot({ lat: 33.95, lng: 126.32 }), null, null), { action: 'hide' })
  assert.deepEqual(judge(spot({ lat: 33.4, lng: 126.5 }), null, null), { action: 'keep' })
})
