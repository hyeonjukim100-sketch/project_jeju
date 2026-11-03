import test from 'node:test'
import assert from 'node:assert/strict'
import { isWellness, WELLNESS_PLACES } from './wellness.js'

test('matches the five places that are also in the spot list, ignoring spaces', () => {
  assert.equal(isWellness('환상숲 곶자왈공원'), true)
  assert.equal(isWellness('서귀포치유의숲'), true)
  assert.equal(isWellness('서귀포 치유의 숲'), true)
  assert.equal(isWellness('머체왓숲길'), true)
  assert.equal(isWellness('신흥2리 동백마을'), true)
  assert.equal(isWellness('파파빌레'), true)
})

test('does not match other places, including names that only contain a listed one', () => {
  assert.equal(isWellness('사려니숲길'), false)
  assert.equal(isWellness('파파빌레 카페'), false)
  assert.equal(isWellness('머체왓'), false)
})

test('handles empty and missing titles', () => {
  assert.equal(isWellness(''), false)
  assert.equal(isWellness(undefined), false)
  assert.equal(isWellness(null), false)
})

test('keeps all eleven places from the Visit Jeju wellness list', () => {
  assert.equal(WELLNESS_PLACES.length, 11)
  assert.ok(WELLNESS_PLACES.every((p) => p.id && p.title))
})
