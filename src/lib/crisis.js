// 위험 문구 점검 (초안 — 사용자 검토 후 확정). 진단이 아니라 연락처 안내를 먼저 보여 주기 위한 것.
// 키워드 방식이라 돌려 말한 표현은 놓칠 수 있고, 그래서 챗봇 지시문에도 같은 규칙을 넣는다.
const PHRASES = [
  '죽고 싶', '죽고싶', '죽어 버리', '죽어버리', '죽을래', '죽을 것 같아서 못',
  '자살', '목숨을 끊', '스스로 목숨',
  '살고 싶지 않', '살기 싫', '살 이유가 없', '사는 게 의미 없', '사는 게 무의미',
  '사라지고 싶', '없어지고 싶', '세상에서 없어', '끝내고 싶', '끝내 버리고 싶',
  '더는 못 살', '더 이상 못 살', '더 이상 살',
  '자해', '손목을 그', '약을 다 먹',
]

const squash = (t) => t.replace(/\s+/g, '')
const NEEDLES = PHRASES.map(squash)

export function hasCrisisSignal(text = '') {
  const t = squash(text)
  return NEEDLES.some((n) => t.includes(n))
}

export const CRISIS_CONTACTS = [
  { name: '자살예방상담전화', tel: '109' },
  { name: '정신건강상담전화', tel: '1577-0199' },
  { name: '긴급 상황', tel: '119' },
]
