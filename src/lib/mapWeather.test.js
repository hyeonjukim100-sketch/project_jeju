import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mapWeather } from './mapWeather.js'

test('맑음은 아무 효과 없이 가장 밝다', () => {
  const m = mapWeather('clear')
  assert.equal(m.precip, null)
  assert.equal(m.clouds, 0)
  assert.equal(m.grey, 0)
  assert.equal(m.light, 1)
})

test('비·눈·진눈깨비는 알맞은 입자를 쓴다', () => {
  assert.equal(mapWeather('rain').precip, 'rain')
  assert.equal(mapWeather('snow').precip, 'snow')
  assert.equal(mapWeather('sleet').precip, 'sleet')
})

test('눈이 오면 섬이 하얗게 덮인다, 다른 날씨는 아니다', () => {
  assert.ok(mapWeather('snow').snowCover > 0.3)
  for (const k of ['clear', 'cloudy', 'rain', 'fog']) assert.equal(mapWeather(k).snowCover, 0)
})

test('안개는 먼 곳이 뿌옇게 안개 거리가 짧다', () => {
  assert.ok(mapWeather('fog').fogFar < mapWeather('clear').fogFar)
  assert.ok(mapWeather('fog').fogNear < mapWeather('clear').fogNear)
})

test('흐릴수록 구름이 많고 햇빛이 약하다', () => {
  const order = ['clear', 'partly', 'cloudy', 'overcast'].map(mapWeather)
  for (let i = 1; i < order.length; i++) {
    assert.ok(order[i].clouds >= order[i - 1].clouds)
    assert.ok(order[i].light <= order[i - 1].light)
  }
})

test('모르는 값이나 비어 있는 값은 맑음처럼 다룬다', () => {
  assert.deepEqual(mapWeather(undefined), mapWeather('clear'))
  assert.deepEqual(mapWeather('tornado'), mapWeather('clear'))
})
