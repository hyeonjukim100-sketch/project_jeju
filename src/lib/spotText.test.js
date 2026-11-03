import test from 'node:test'
import assert from 'node:assert/strict'
import { categoryLabel, splitIntro } from './spotText.js'

test('splitIntro takes the first sentence as the lead and keeps the rest', () => {
  assert.deepEqual(splitIntro('붉은오름에서 물찻오름까지 이어지는 길이에요. 여름에도 시원해요.'), {
    lead: '붉은오름에서 물찻오름까지 이어지는 길이에요.',
    rest: '여름에도 시원해요.',
  })
})

test('splitIntro leaves rest empty for a single sentence', () => {
  assert.deepEqual(splitIntro('조용한 해변이에요.'), { lead: '조용한 해변이에요.', rest: '' })
})

test('splitIntro handles empty and missing text', () => {
  assert.deepEqual(splitIntro(''), { lead: '', rest: '' })
  assert.deepEqual(splitIntro(null), { lead: '', rest: '' })
})

test('splitIntro drops the bold lead when the first sentence is too long, so nothing repeats', () => {
  const long = '가'.repeat(70)
  assert.deepEqual(splitIntro(long), { lead: '', rest: long })
  const twoSentences = `${'가'.repeat(70)}. 둘째 문장이에요.`
  assert.deepEqual(splitIntro(twoSentences), { lead: '', rest: twoSentences })
})

test('splitIntro keeps a first sentence of up to 60 characters as the lead', () => {
  const sixty = '가'.repeat(59) + '.'
  assert.deepEqual(splitIntro(sixty), { lead: sixty, rest: '' })
})

test('splitIntro treats a line break as a sentence end', () => {
  assert.deepEqual(splitIntro('첫 줄\n둘째 줄'), { lead: '첫 줄', rest: '둘째 줄' })
})

test('categoryLabel uses the stop type, then the tab group, then the raw kind', () => {
  assert.equal(categoryLabel({ type: 'meal' }), '식당')
  assert.equal(categoryLabel({ type: 'rest' }), '카페')
  assert.equal(categoryLabel({ kind: '문화유적' }), '문화')
  assert.equal(categoryLabel({ kind: '사찰' }), '문화')
  assert.equal(categoryLabel({ kind: '자연' }), '자연')
  assert.equal(categoryLabel({ kind: '기타' }), '기타')
  assert.equal(categoryLabel({}), '기타')
})
