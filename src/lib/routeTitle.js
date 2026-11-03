// 동선의 특징으로 제목을 짓는다. 장소 종류에서 낱말을 뽑아 가장 많은 1~2개를 쓰고, 끝말은 기분에 따라 달라진다.

export const MOOD_CHIP = ['많이 지친 날', '가라앉은 날', '보통의 하루', '괜찮은 하루', '활기찬 하루']

// glue: 낱말 바로 뒤에 붙는 말, end: 끝말 — 기분 0(지침) → 4(활기)
const ENDINGS = [
  { glue: '에서', end: '쉬어 가기' },
  { glue: '', end: '천천히 거닐기' },
  { glue: '', end: '느끼기' },
  { glue: '', end: '즐기기' },
  { glue: '에서', end: '신나게 놀기' },
]
const NO_MOOD = ENDINGS[2]
const FALLBACK = '제주 둘러보기'

const FOREST = /숲|곶자왈|휴양림|수목원/
const SEA = /해변|포구|바다|항|해안/

export function kindWord({ kind, type, title = '' } = {}) {
  if (type === 'rest') return '쉼'
  if (type === 'meal') return null
  switch (kind) {
    case '자연':
    case '생태공원':
      return FOREST.test(title) ? '숲' : SEA.test(title) ? '바다' : '자연'
    case '오름':
      return '오름'
    case '시장':
      return '시장 구경'
    case '문화':
    case '문화유적':
    case '유적':
    case '박물관':
    case '사찰':
      return '옛 이야기'
    case '예술':
      return '전시'
    case '트레일':
    case '지질트레일':
    case '올레코스':
      return '걷는 길'
    default:
      return null
  }
}

const ACTIVITY = {
  숲: '천천히 걷기',
  자연: '천천히 걷기',
  바다: '바다 소리 듣기',
  오름: '오름 천천히 오르기',
  '걷는 길': '길 따라 걷기',
  '옛 이야기': '이야기 둘러보기',
  전시: '전시 둘러보기',
  '시장 구경': '구경하며 먹기',
  쉼: '차 한 잔 쉬어가기',
}

export function activityName(stop = {}) {
  if (stop.type === 'meal') return '식사하기'
  return ACTIVITY[kindWord(stop)] || '천천히 둘러보기'
}

// 마지막 글자에 받침이 있으면 "과", 없으면(또는 한글이 아니면) "와"
export function withParticle(word) {
  const code = word.charCodeAt(word.length - 1) - 0xac00
  const hasFinal = code >= 0 && code <= 11171 && code % 28 !== 0
  return word + (hasFinal ? '과' : '와')
}

export function routeTitle(stops, moodLevel) {
  const chip = MOOD_CHIP[moodLevel] ?? null
  const counts = new Map() // Map 은 처음 들어온 순서를 지켜 준다
  for (const s of stops || []) {
    const w = kindWord(s)
    if (w) counts.set(w, (counts.get(w) || 0) + 1)
  }
  const words = [...counts.entries()]
    .map(([word, n], first) => ({ word, n, first }))
    .sort((a, b) => b.n - a.n || a.first - b.first)
    .slice(0, 2)
    .map((x) => x.word)
  if (!words.length) return { chip, title: FALLBACK }

  const { glue, end } = ENDINGS[moodLevel] ?? NO_MOOD
  const head = words.length === 2 ? `${withParticle(words[0])} ${words[1]}` : words[0]
  return { chip, title: `${head}${glue} ${end}` }
}
