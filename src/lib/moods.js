// 기분 슬라이더 5단계 (지침 ↔ 활기). 점수는 저장하지 않고 이모지만 기록에 남긴다.
export const MOOD_LEVELS = [
  { emoji: 'exhale', label: '많이 지쳤어요' },
  { emoji: 'pensive', label: '조금 가라앉았어요' },
  { emoji: 'neutral', label: '그저 그래요' },
  { emoji: 'smile', label: '괜찮아요' },
  { emoji: 'grin', label: '활기 넘쳐요' },
]

// 슬라이더 색: 붉은 산호(지침) → 초록(활기), 파스텔
export const MOOD_GRADIENT = 'linear-gradient(90deg, #F59A8B 0%, #F4D58A 50%, #8FD1A4 100%)'

// 장소 종류 → 이모지
export const KIND_EMOJI = {
  자연: 'nature', 문화: 'culture', 의료: 'hospital', 축제: 'festival', 오름: 'oreum', 예술: 'art',
  시장: 'market', 트레일: 'trail', 문화유적: 'ruins', '축제/행사': 'festival', 지질트레일: 'rock',
  박물관: 'museum', 유적: 'moai', 사찰: 'temple', 올레코스: 'footprints', 생태공원: 'park', 기타: 'pin',
  '사진 있는 곳': 'camera',
}

// 시간대 문구 (제주 현지 시각 기준)
export const MOMENTS = [
  [5, '아침 산책하기 좋은 시간', 'sunrise'],
  [9, '커피 마시기 좋은 시간', 'coffee'],
  [12, '천천히 점심 먹는 시간', 'food'],
  [14, '쉬어가는 시간', 'herb'],
  [16, '명상하기 좋은 시간', 'lotus'],
  [24, '사색에 잠기기 좋은 시간', 'crescent'],
]
export const momentOf = (timeStr) => {
  const h = Number(timeStr.slice(11, 13))
  const [, text, emoji] = MOMENTS.find(([end]) => h < end) || MOMENTS.at(-1)
  return { text, emoji }
}

export function skyOf(w) {
  const { code, cloud, isDay } = w
  if (code === 0) return isDay ? { text: '맑음', emoji: 'sun' } : { text: '맑은 밤', emoji: 'crescent' }
  if (code <= 3) return cloud > 60 ? { text: '구름 많음', emoji: 'cloud' } : { text: '구름 조금', emoji: 'partly' }
  if (code <= 48) return { text: '흐림·안개', emoji: 'fog' }
  if (code <= 77 && code >= 71) return { text: '눈', emoji: 'snow' }
  return { text: '비', emoji: 'rain' }
}

export const airText = (pm25) => (pm25 == null ? '' : pm25 <= 15 ? '숨쉬기 좋은 공기' : pm25 <= 35 ? '보통 공기' : '공기가 탁해요')
