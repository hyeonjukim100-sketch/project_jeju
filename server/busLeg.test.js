import test from 'node:test'
import assert from 'node:assert/strict'
import { findDirectRoutes, getBusLeg } from './busLeg.js'

const stop = (id, ord) => ({ id, name: `정류장${id}`, ord })
const board = [{ id: 10, name: 'A정류장', meters: 120 }]
const alight = [{ id: 12, name: 'B정류장', meters: 80 }]

test('keeps only routes that reach the alight stop after the board stop', () => {
  const routeStops = {
    1: [stop(10, 1), stop(11, 2), stop(12, 3)],
    2: [stop(12, 1), stop(10, 2)], // 반대 방향: 하차 정류장이 먼저 나온다
  }
  const routesAtBoard = { 10: [{ routeId: 1, number: '101', to: 'X' }, { routeId: 2, number: '202', to: 'Y' }] }
  const out = findDirectRoutes({ board, alight, routesAtBoard, routeStops })
  assert.equal(out.length, 1)
  assert.equal(out[0].number, '101')
  assert.equal(out[0].to, 'X')
  assert.equal(out[0].stops, 2)
  assert.deepEqual(out[0].board, board[0])
  assert.deepEqual(out[0].alight, alight[0])
})

test('returns nothing when no candidates or no matching direction exist', () => {
  assert.deepEqual(findDirectRoutes({ board: [], alight, routesAtBoard: {}, routeStops: {} }), [])
  assert.deepEqual(findDirectRoutes({ board, alight: [], routesAtBoard: {}, routeStops: {} }), [])
  const routeStops = { 2: [stop(12, 1), stop(10, 2)] }
  const routesAtBoard = { 10: [{ routeId: 2, number: '202', to: 'Y' }] }
  assert.deepEqual(findDirectRoutes({ board, alight, routesAtBoard, routeStops }), [])
})

test('keeps one option per bus number, the one with fewer stops', () => {
  const routeStops = {
    1: [stop(10, 1), stop(11, 2), stop(12, 5)],
    3: [stop(10, 1), stop(12, 2)], // 같은 101번의 다른 노선 ID
  }
  const routesAtBoard = { 10: [{ routeId: 1, number: '101', to: 'X' }, { routeId: 3, number: '101', to: 'X' }] }
  const out = findDirectRoutes({ board, alight, routesAtBoard, routeStops })
  assert.equal(out.length, 1)
  assert.equal(out[0].stops, 1)
})

test('returns at most three options, best first', () => {
  const routeStops = {}
  const routes = []
  for (let i = 1; i <= 4; i++) {
    routeStops[i] = [stop(10, 1), stop(12, 1 + i)] // 정류장 수 i
    routes.push({ routeId: i, number: `${i}00`, to: 'X' })
  }
  const out = findDirectRoutes({ board, alight, routesAtBoard: { 10: routes }, routeStops })
  assert.deepEqual(out.map((o) => o.number), ['100', '200', '300'])
})

test('getBusLeg still returns options when one boarding stop lookup fails', async () => {
  const deps = {
    nearStops: async (p) => (p.lat === 1 ? [{ id: 10, name: 'A1', meters: 100 }, { id: 11, name: 'A2', meters: 200 }] : [{ id: 12, name: 'B', meters: 50 }]),
    stopRoutes: async (id) => {
      if (id === '10') throw new Error('timeout')
      return [{ routeId: 1, number: '101', to: 'X' }]
    },
    routeStops: async () => [stop(11, 1), stop(12, 2)],
    arrivals: async () => ({ routes: [{ number: '101', minutes: 4 }] }),
  }
  const r = await getBusLeg({ lat: 1, lng: 1 }, { lat: 2, lng: 2 }, deps)
  assert.equal(r.options.length, 1)
  assert.equal(r.options[0].number, '101')
  assert.equal(r.options[0].board.id, 11)
  assert.equal(r.options[0].nextMin, 4)
})

test('getBusLeg gives nextMin null when arrivals fail', async () => {
  const deps = {
    nearStops: async (p) => (p.lat === 1 ? [{ id: 10, name: 'A', meters: 100 }] : [{ id: 12, name: 'B', meters: 50 }]),
    stopRoutes: async () => [{ routeId: 1, number: '101', to: 'X' }],
    routeStops: async () => [stop(10, 1), stop(12, 2)],
    arrivals: async () => {
      throw new Error('down')
    },
  }
  const r = await getBusLeg({ lat: 1, lng: 1 }, { lat: 2, lng: 2 }, deps)
  assert.equal(r.options[0].nextMin, null)
})

test('getBusLeg only loads the stop list of routes that serve both ends', async () => {
  const asked = []
  const deps = {
    nearStops: async (p) => (p.lat === 1 ? [{ id: 10, name: 'A', meters: 100 }] : [{ id: 12, name: 'B', meters: 50 }]),
    stopRoutes: async (id) =>
      id === '10'
        ? [{ routeId: 1, number: '101', to: 'X' }, { routeId: 2, number: '202', to: 'Y' }]
        : [{ routeId: 1, number: '101', to: 'X' }, { routeId: 3, number: '303', to: 'Z' }],
    routeStops: async (id) => {
      asked.push(id)
      return [stop(10, 1), stop(12, 2)]
    },
    arrivals: async () => ({ routes: [] }),
  }
  const r = await getBusLeg({ lat: 1, lng: 1 }, { lat: 2, lng: 2 }, deps)
  assert.deepEqual(asked, [1])
  assert.equal(r.options[0].number, '101')
})

const okDeps = {
  nearStops: async (p) => (p.lat === 1 ? [{ id: 10, name: 'A', meters: 100 }] : [{ id: 12, name: 'B', meters: 50 }]),
  stopRoutes: async () => [{ routeId: 1, number: '101', to: 'X' }],
  routeStops: async () => [stop(10, 1), stop(12, 2)],
  arrivals: async () => ({ routes: [] }),
}

test('getBusLeg says why there is no bus: no stop near one end', async () => {
  const deps = { ...okDeps, nearStops: async (p) => (p.lat === 1 ? [{ id: 10, name: 'A', meters: 100 }] : []) }
  const r = await getBusLeg({ lat: 1, lng: 1 }, { lat: 2, lng: 2 }, deps)
  assert.deepEqual(r, { options: [], reason: 'no-stops' })
})

test('getBusLeg says the two places are close enough to walk without asking the bus service', async () => {
  let asked = 0
  const deps = { ...okDeps, nearStops: async () => (asked++, []) }
  const r = await getBusLeg({ lat: 33.5, lng: 126.5 }, { lat: 33.503, lng: 126.502 }, deps)
  assert.deepEqual(r, { options: [], reason: 'near' })
  assert.equal(asked, 0)
})

test('getBusLeg tells a failed lookup apart from "no bus"', async () => {
  const down = async () => {
    throw new Error('connect timeout')
  }
  const r1 = await getBusLeg({ lat: 1, lng: 1 }, { lat: 2, lng: 2 }, { ...okDeps, nearStops: down })
  assert.deepEqual(r1, { options: [], reason: 'error' })
  const r2 = await getBusLeg({ lat: 1, lng: 1 }, { lat: 2, lng: 2 }, { ...okDeps, stopRoutes: down })
  assert.deepEqual(r2, { options: [], reason: 'error' })
})

test('getBusLeg says "none" when stops exist but no direct bus serves both', async () => {
  const deps = { ...okDeps, stopRoutes: async (id) => (id === '10' ? [{ routeId: 1, number: '101', to: 'X' }] : [{ routeId: 9, number: '909', to: 'Z' }]) }
  const r = await getBusLeg({ lat: 1, lng: 1 }, { lat: 2, lng: 2 }, deps)
  assert.deepEqual(r, { options: [], reason: 'none' })
})
