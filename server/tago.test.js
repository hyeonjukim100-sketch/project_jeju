import test from 'node:test'
import assert from 'node:assert/strict'
import { memo, parseItems, withRetry, toArrivals, toRouteStops, toRoutes, toStops } from './tago.js'

const wrap = (item) => ({ response: { header: { resultCode: '00' }, body: { items: item === undefined ? '' : { item }, totalCount: 1 } } })

test('parseItems turns one item, many items and an empty answer into a list', () => {
  assert.deepEqual(parseItems(wrap({ a: 1 })), [{ a: 1 }])
  assert.deepEqual(parseItems(wrap([{ a: 1 }, { a: 2 }])), [{ a: 1 }, { a: 2 }])
  assert.deepEqual(parseItems(wrap(undefined)), [])
})

test('parseItems throws on an error answer so the caller can fall back', () => {
  assert.throws(() => parseItems({ OpenAPI_ServiceResponse: { cmmMsgHeader: { errMsg: 'SERVICE_KEY_IS_NOT_REGISTERED_ERROR' } } }), /SERVICE_KEY_IS_NOT_REGISTERED_ERROR/)
  assert.throws(() => parseItems({ response: { header: { resultCode: '22', resultMsg: 'LIMITED' } } }), /LIMITED/)
})

test('toStops keeps Jeju stops inside the radius, nearest first', () => {
  const rows = [
    { nodeid: 'JJB2', nodenm: '먼 정류장', gpslati: 33.5106, gpslong: 126.4929, citycode: 39 },
    { nodeid: 'JJB1', nodenm: '가까운 정류장', gpslati: 33.5068, gpslong: 126.4929, citycode: 39 },
    { nodeid: 'SEL9', nodenm: '서울 정류장', gpslati: 33.5067, gpslong: 126.4929, citycode: 11 },
    { nodeid: 'JJB3', nodenm: '너무 먼 정류장', gpslati: 33.6, gpslong: 126.4929, citycode: 39 },
  ]
  const out = toStops(rows, 33.5066, 126.4929, 1000)
  assert.deepEqual(out.map((s) => s.id), ['JJB1', 'JJB2'])
  assert.equal(out[0].name, '가까운 정류장')
  assert.ok(out[0].meters < out[1].meters && out[1].meters <= 1000)
})

test('toRoutes maps passing routes with their direction id and destination', () => {
  const out = toRoutes([{ routeid: 'JJB405000001', routeno: '100', endnodenm: '성산' }])
  assert.deepEqual(out, [{ routeId: 'JJB405000001', number: '100', to: '성산' }])
})

test('toRouteStops keeps the stop order of a route', () => {
  const out = toRouteStops([
    { nodeid: 'JJB2', nodenm: 'B', nodeord: 2 },
    { nodeid: 'JJB1', nodenm: 'A', nodeord: 1 },
  ])
  assert.deepEqual(out, [{ id: 'JJB1', name: 'A', ord: 1 }, { id: 'JJB2', name: 'B', ord: 2 }])
})

test('toArrivals gives the soonest bus of each number in minutes', () => {
  const rows = [
    { routeno: '100', arrtime: 600, nodenm: '공항' },
    { routeno: '100', arrtime: 240, nodenm: '공항' },
    { routeno: '200', arrtime: 0, nodenm: '공항' },
    { routeno: '300', arrtime: 90, nodenm: '공항' },
  ]
  const out = toArrivals(rows)
  assert.equal(out.stop, '공항')
  assert.deepEqual(out.routes.map((r) => [r.number, r.minutes]), [['300', 2], ['100', 4]])
  assert.equal(out.runningCount, 2)
})

test('memo hands back a promise both on the first call and on a cache hit', async () => {
  const cache = new Map()
  let loads = 0
  const load = async () => (loads++, 'v')
  const first = memo(cache, 'k', 1000, load)
  assert.equal(typeof first.then, 'function')
  assert.equal(await first, 'v')
  const second = memo(cache, 'k', 1000, load)
  assert.equal(typeof second.then, 'function')
  assert.equal(await second, 'v')
  assert.equal(loads, 1)
})

test('withRetry tries again after a short failure and gives up after the last try', async () => {
  let n = 0
  const flaky = async () => {
    n++
    if (n < 3) throw new Error('busy')
    return 'ok'
  }
  assert.equal(await withRetry(flaky, 3, 1), 'ok')
  assert.equal(n, 3)
  let m = 0
  await assert.rejects(withRetry(async () => (m++, Promise.reject(new Error('down'))), 2, 1), /down/)
  assert.equal(m, 2)
})

test('withRetry does not retry a fatal error such as an unregistered key', async () => {
  let n = 0
  const fatal = Object.assign(new Error('key'), { fatal: true })
  await assert.rejects(withRetry(async () => (n++, Promise.reject(fatal)), 3, 1), /key/)
  assert.equal(n, 1)
})
