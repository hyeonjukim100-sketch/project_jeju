// 해시태그: 미리 정한 목록에서 고르거나 직접 쓴다. 효과를 단정하지 않고 "느낌"만 말한다.
export const PRESET_TAGS = [
  '혼자와도좋아요',
  '걷기좋아요',
  '조용했어요',
  // 아래 셋은 제안한 것 — 마음에 안 들면 바꿔도 된다
  '바다가보여요',
  '초록이가득해요',
  '앉아쉴곳이있어요',
]

export const MAX_TAGS = 6
export const MAX_CUSTOM_TAGS = 2
export const MAX_TEXT = 300

// 직접 쓴 태그 다듬기: '#' 과 공백을 지우고, 한글·영문·숫자 2~12자만 받는다
export function cleanTag(raw) {
  const t = String(raw).replace(/[#\s]/g, '')
  return /^[0-9A-Za-z가-힣]{2,12}$/.test(t) ? t : null
}
