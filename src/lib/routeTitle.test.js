import test from 'node:test'
import assert from 'node:assert/strict'
import { activityName, kindWord, MOOD_CHIP, routeTitle, withParticle } from './routeTitle.js'

test('withParticle picks 과 after a final consonant and 와 otherwise', () => {
  assert.equal(withParticle('숲'), '숲과')
  assert.equal(withParticle('바다'), '바다와')
  assert.equal(withParticle('시장 구경'), '시장 구경과')
  assert.equal(withParticle('abc'), 'abc와')
})

test('kindWord maps kinds, types and titles to one trait word', () => {
  assert.equal(kindWord({ type: 'rest' }), '쉼')
  assert.equal(kindWord({ type: 'meal' }), null)
  assert.equal(kindWord({ kind: '문화유적' }), '옛 이야기')
  assert.equal(kindWord({ kind: '올레코스' }), '걷는 길')
  assert.equal(kindWord({ kind: '자연', title: '광치기해변' }), '바다')
  assert.equal(kindWord({ kind: '자연', title: '사려니숲길' }), '숲')
  assert.equal(kindWord({ kind: '자연', title: '용머리' }), '자연')
  assert.equal(kindWord({ kind: '기타', title: 'x' }), null)
})

const forest = [
  { kind: '자연', title: '사려니숲길' },
  { kind: '자연', title: '제주곶자왈도립공원' },
  { kind: '자연', title: '광치기해변' },
]

test('routeTitle joins the two most common words with the mood ending', () => {
  assert.deepEqual(routeTitle(forest, 2), { chip: '보통의 하루', title: '숲과 바다 느끼기' })
  assert.equal(routeTitle(forest, 0).title, '숲과 바다에서 쉬어 가기')
  assert.equal(routeTitle(forest, 1).title, '숲과 바다 천천히 거닐기')
  assert.equal(routeTitle(forest, 3).title, '숲과 바다 즐기기')
  assert.equal(routeTitle(forest, 4).title, '숲과 바다에서 신나게 놀기')
  assert.deepEqual(routeTitle(forest, null), { chip: null, title: '숲과 바다 느끼기' })
})

test('routeTitle keeps first-seen order when counts tie', () => {
  const stops = [{ kind: '시장', title: 'a' }, { kind: '오름', title: 'b' }]
  assert.equal(routeTitle(stops, 2).title, '시장 구경과 오름 느끼기')
})

test('routeTitle falls back for empty, unmapped and single-place routes', () => {
  assert.deepEqual(routeTitle([], 2), { chip: '보통의 하루', title: '제주 둘러보기' })
  assert.equal(routeTitle([{ kind: '기타', title: 'x' }], 3).title, '제주 둘러보기')
  assert.equal(routeTitle([{ kind: '오름', title: '용눈이오름' }], 3).title, '오름 즐기기')
})

test('MOOD_CHIP has one name per mood level', () => {
  assert.equal(MOOD_CHIP.length, 5)
  assert.equal(MOOD_CHIP[0], '많이 지친 날')
  assert.equal(MOOD_CHIP[4], '활기찬 하루')
})

test('activityName follows the stop type first, then the kind', () => {
  assert.equal(activityName({ kind: '자연', title: '사려니숲길' }), '천천히 걷기')
  assert.equal(activityName({ kind: '자연', title: '광치기해변' }), '바다 소리 듣기')
  assert.equal(activityName({ kind: '오름', title: '용눈이오름' }), '오름 천천히 오르기')
  assert.equal(activityName({ kind: '트레일', title: 'x' }), '길 따라 걷기')
  assert.equal(activityName({ kind: '올레코스', title: 'x' }), '길 따라 걷기')
  assert.equal(activityName({ kind: '문화', title: 'x' }), '이야기 둘러보기')
  assert.equal(activityName({ kind: '예술', title: 'x' }), '전시 둘러보기')
  assert.equal(activityName({ kind: '시장', title: 'x' }), '구경하며 먹기')
  assert.equal(activityName({ type: 'meal', title: 'x' }), '식사하기')
  assert.equal(activityName({ type: 'rest', title: 'x' }), '차 한 잔 쉬어가기')
  assert.equal(activityName({ kind: '기타', title: 'x' }), '천천히 둘러보기')
})
