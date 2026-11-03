import test from 'node:test'
import assert from 'node:assert/strict'
import { needsRecPlan } from './recPlan.js'

const made = (mood) => ({ stops: [{ title: 'a' }], legs: [], mood })

test('makes a recommendation when there is none yet', () => {
  assert.equal(needsRecPlan({ stops: [], legs: [] }, 2, false), true)
})

test('reuses the recommendation made for the same mood', () => {
  assert.equal(needsRecPlan(made(2), 2, false), false)
})

test('makes a new one when the mood has changed since', () => {
  assert.equal(needsRecPlan(made(2), 4, false), true)
  assert.equal(needsRecPlan(made(0), 1, false), true)
})

test('does not start another while one is being made', () => {
  assert.equal(needsRecPlan({ stops: [], legs: [] }, 2, true), false)
  assert.equal(needsRecPlan(made(2), 4, true), false)
})

test('treats a recommendation with no recorded mood as out of date', () => {
  assert.equal(needsRecPlan({ stops: [{ title: 'a' }], legs: [] }, 2, false), true)
})
