import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isMoodName, moodChangeText, moodOf } from './moods.js'

test('이모지 이름으로 기분 단계를 찾고, 모르는 이름은 걸러 낸다', () => {
  assert.equal(moodOf('exhale').label, '많이 지쳤어요')
  assert.equal(moodOf('nope'), null)
  assert.equal(isMoodName('smile'), true)
  assert.equal(isMoodName('hospital'), false)
  assert.equal(isMoodName(null), false)
})

test('기분 변화 문구는 좋아졌는지 평가하지 않고 두 상태를 그대로 말한다', () => {
  assert.equal(moodChangeText('exhale', 'smile'), '많이 지쳤어요에서 괜찮아요로')
  assert.equal(moodChangeText('smile', 'exhale'), '괜찮아요에서 많이 지쳤어요로')
  assert.equal(moodChangeText('neutral', 'neutral'), '그저 그래요 그대로')
})

test('한쪽만 남겼거나 둘 다 없으면 짧게 말하거나 비운다', () => {
  assert.equal(moodChangeText('pensive', null), '떠나기 전 조금 가라앉았어요')
  assert.equal(moodChangeText(null, 'grin'), '다녀온 뒤 활기 넘쳐요')
  assert.equal(moodChangeText(null, null), '')
  assert.equal(moodChangeText('bogus', 'alsobogus'), '')
})
