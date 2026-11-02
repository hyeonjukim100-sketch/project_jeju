// "함께 여행 계획 세우기": 챗에서 고른 답(누구와·이동 수단·걷는 정도·하고 싶은 것)으로 하루 코스를 만든다.
// 장소는 관광지·카카오 로컬·OSRM 에서 규칙으로 고르고, 모델이 지어낸 장소가 끼어들 수 없다.
import { buildRoute } from './route.js'

export const WHO = ['혼자', '연인과', '가족과', '친구와']
export const TRANSPORT = ['car', 'taxi', 'walk', 'bus']
export const WALK = ['little', 'some', 'lot']
const LIKES = {
  '바다·자연': ['자연', '생태공원', '지질트레일'],
  오름: ['오름'],
  '걷기 좋은 길': ['트레일', '올레코스'],
  시장: ['시장'],
  '예술·문화': ['예술', '문화', '박물관', '문화유적'],
  '조용한 곳': ['사찰', '생태공원', '박물관', '문화유적'],
}
export const LIKE_NAMES = Object.keys(LIKES)

const WHO_LINE = { 혼자: '혼자만의 시간', 연인과: '둘이 함께하는 시간', 가족과: '가족과 함께하는 시간', 친구와: '친구와 함께하는 시간' }
const TIP = {
  오름: '잠시 멈춰 서서 바람 소리를 들어 보세요',
  트레일: '발걸음을 천천히, 걷는 호흡에 귀 기울여 보세요',
  자연: '깊게 숨을 세 번 쉬며 풍경을 바라보세요',
  사찰: '조용히 앉아 눈을 감고 소리를 들어 보세요',
  시장: '냄새와 색깔을 느끼며 천천히 한 바퀴 돌아보세요',
  meal: '첫 한 입을 천천히 음미해 보세요',
  rest: '따뜻한 잔을 두 손으로 감싸고 숨을 골라 보세요',
}
const tipOf = (s) => (s.type === 'spot' ? TIP[s.kind] || '마음에 드는 풍경 하나를 오래 바라보세요' : TIP[s.type])

export async function buildPlan({ who, transport, walk, likes = [] }, moodLevel = 2) {
  let kinds = [...new Set(likes.flatMap((l) => LIKES[l] || []))]
  const rest = walk === 'little' // 거의 안 걸으면 오름·트레일은 뺀다
  if (rest) kinds = kinds.filter((k) => !['오름', '트레일', '올레코스'].includes(k))
  const profile = { count: walk === 'lot' ? 4 : 3 }
  if (kinds.length) profile.kinds = kinds
  let maxLeg
  if (transport === 'walk') {
    profile.radius = 6
    maxLeg = 25 // 걷는 구간은 25분 안쪽
  } else if (transport === 'bus') {
    profile.radius = 12
    maxLeg = 30
  }
  const { stops, legs } = await buildRoute(moodLevel, { profile, maxLeg, byWalk: transport === 'walk' })
  const tipped = stops.map((s) => ({ ...s, tip: tipOf(s) }))
  const intro = `${WHO_LINE[who] || '느린 시간'}을 위한 하루 코스를 골라 봤어요 🌿`
  return { stops: tipped, legs, intro, transport }
}
