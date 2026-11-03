import { KIND_GROUP } from './moods.js'

// 소개글을 "굵은 한 줄(lead)"과 나머지(rest)로 나눈다. 첫 문장이 max 자보다 길면 굵은 줄 없이 원문 전체를 rest 로 둔다
// (잘라서 굵게 쓰면 아래 설명과 같은 말이 두 번 보인다. 이 데이터는 첫 문장이 60자 안인 곳이 약 70%).
export function splitIntro(text, max = 60) {
  const full = String(text ?? '').trim()
  if (!full) return { lead: '', rest: '' }
  // 문장 끝: 뒤에 공백이나 글 끝이 오는 . ! ? 。 또는 줄바꿈 (3.5km 같은 숫자 안의 점은 건너뜀)
  const m = full.match(/^[\s\S]*?(?:[.!?。](?=\s|$)|\n)/)
  const first = (m ? m[0] : full).replace(/\n$/, '').trim()
  if (first.length > max) return { lead: '', rest: full }
  return { lead: first, rest: m ? full.slice(m[0].length).trim() : '' }
}

// 카드 위쪽 칩에 쓰는 이름: 식당·카페 항목은 type 으로, 장소는 탭 묶음으로, 그 밖은 원래 종류
export function categoryLabel({ kind, type } = {}) {
  if (type === 'meal') return '식당'
  if (type === 'rest') return '카페'
  return KIND_GROUP[kind] || kind || '기타'
}
