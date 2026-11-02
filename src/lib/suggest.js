// 오늘의 제안: 날씨와 기분으로 규칙에 따라 3곳을 고른다 (AI 호출 없음). 같은 날·같은 조건이면 같은 곳이 나온다.
import { KIND_GROUP } from './moods'

const RAINY = ['rain', 'snow', 'sleet']
const INDOOR_TITLE = /박물관|미술관|전시|뮤지엄|갤러리|체험관|아쿠아|도서관|기념관/

// 기분 단계별로 어울리는 종류 (원래 종류 기준)
const MOOD_KINDS = [
  ['사찰', '생태공원', '문화유적', '유적', '예술', '문화'], // 0 많이 지쳤어요
  ['사찰', '생태공원', '문화유적', '유적', '예술', '문화', '자연'], // 1
  ['자연', '문화', '예술', '생태공원', '오름', '시장'], // 2
  ['오름', '트레일', '자연', '문화'], // 3
  ['오름', '트레일', '자연', '올레코스'], // 4
]

const KIND_NOTE = {
  자연: '바다나 숲을 천천히 걸어 보세요',
  오름: '짧게 올라 바람을 맞아 보세요',
  트레일: '걷기 좋은 길을 따라가 보세요',
  문화: '천천히 둘러보세요',
  예술: '그림과 전시를 감상해 보세요',
  시장: '구경하며 쉬엄쉬엄 걸어 보세요',
  올레코스: '올레길을 맛보듯 걸어 보세요',
}

// 간단한 해시 → 0~1 (같은 날 같은 조건이면 같은 순서)
const rnd = (seed) => {
  let h = 2166136261
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return ((h >>> 0) % 10000) / 10000
}

export function suggest({ spots, weather, moodLevel, day }) {
  if (!spots.length || !weather) return null
  const rainy = RAINY.includes(weather.sky)
  const kinds = MOOD_KINDS[moodLevel] ?? MOOD_KINDS[2]

  const pool = spots.filter((s) => {
    if (s.kind === '올레코스') return false // 올레코스 핀은 코스 대표 위치라 제안에서는 뺀다
    if (rainy) return INDOOR_TITLE.test(s.title) || s.kind === '박물관' || s.kind === '예술'
    return kinds.includes(s.kind)
  })
  // 사진이 있고(둘러보기 좋고), 지친 날엔 푸른·초록 공간이면 점수를 더 준다
  const scored = pool
    .map((s) => ({ s, score: (s.tourId ? 1 : 0) + (moodLevel <= 1 && s.space ? 1 : 0) + rnd(`${day}-${moodLevel}-${weather.sky}-${s.id}`) }))
    .sort((a, b) => b.score - a.score)

  // 종류가 겹치지 않게 3곳
  const picked = []
  for (const { s } of scored) {
    if (picked.length >= 3) break
    if (!picked.some((p) => KIND_GROUP[p.kind] === KIND_GROUP[s.kind]) || scored.length < 6) picked.push(s)
  }

  const note = (s) => (rainy ? '비를 피해 둘러보세요' : KIND_NOTE[KIND_GROUP[s.kind]] || KIND_NOTE[s.kind] || '천천히 둘러보세요')
  return { picks: picked.map((s) => ({ spot: s, note: note(s) })), rainy }
}

// 카드 맨 위 문장: "오늘은 날씨가 맑으며 활기가 넘치는 날이에요. 아래의 장소를 추천해요."
const WEATHER_PHRASE = { clear: '날씨가 맑으며', partly: '구름이 조금 있으며', cloudy: '구름이 많으며', overcast: '날씨가 흐리며', fog: '안개가 끼어 있으며', rain: '비가 오며', snow: '눈이 오며', sleet: '진눈깨비가 내리며' }
const MOOD_PHRASE = ['몸과 마음이 많이 지친', '마음이 조금 가라앉은', '그저 그런', '기분이 괜찮은', '활기가 넘치는']
export const introLine = ({ weather, moodLevel }) =>
  `오늘은 ${WEATHER_PHRASE[weather.sky] ?? '날씨가 흐리며'} ${MOOD_PHRASE[moodLevel] ?? MOOD_PHRASE[2]} 날이에요. 아래의 장소를 추천해요.`