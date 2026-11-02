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
  '사진 있는 곳': 'camera', '푸른 공간': 'wave', '초록 공간': 'herb',
}

// 화면의 장소 종류 칩: 비슷한 종류는 하나로 묶는다 (원래 종류는 상세와 동선 추천이 그대로 쓴다)
export const KIND_GROUP = {
  자연: '자연', 생태공원: '자연',
  오름: '오름',
  트레일: '트레일', 지질트레일: '트레일',
  문화: '문화', 문화유적: '문화', 유적: '문화', 박물관: '문화', 사찰: '문화',
  예술: '예술', 시장: '시장', 올레코스: '올레코스',
}
export const KIND_CHIPS = ['자연', '오름', '트레일', '문화', '예술', '시장', '올레코스']

// 시간대 문구 (제주 현지 시각 기준). 해가 진 뒤와 새벽에는 달 이모지로 사색, 그 전에는 시각대별로.
const DAY_MOMENTS = [
  [9, '아침 산책하기 좋은 시간', 'sunrise'],
  [12, '커피 마시기 좋은 시간', 'coffee'],
  [14, '천천히 점심 먹는 시간', 'food'],
  [16, '쉬어가는 시간', 'herb'],
]
const NIGHT_MOMENT = { text: '사색에 잠기기 좋은 시간', emoji: 'crescent' }
const minutes = (hhmm) => Number(String(hhmm).slice(0, 2)) * 60 + Number(String(hhmm).slice(3, 5))
export const momentOf = (timeStr, sunsetStr = '18:00', sunriseStr = '06:00') => {
  const now = minutes(timeStr)
  if (now >= minutes(sunsetStr) || now < minutes(sunriseStr)) return NIGHT_MOMENT // 해가 진 뒤 ~ 해뜨기 전
  const h = Math.floor(now / 60)
  const hit = DAY_MOMENTS.find(([end]) => h < end)
  return hit ? { text: hit[1], emoji: hit[2] } : { text: '명상하기 좋은 시간', emoji: 'lotus' } // 16시 ~ 해질녘
}

// 서버가 주는 sky: clear | partly | cloudy | overcast | fog | rain | snow | sleet
export function skyOf(w) {
  switch (w.sky) {
    case 'clear':
      return w.isDay ? { text: '맑음', emoji: 'sun' } : { text: '맑은 밤', emoji: 'crescent' }
    case 'partly':
      return { text: '구름 조금', emoji: 'partly' }
    case 'cloudy':
      return { text: '구름 많음', emoji: 'cloud' }
    case 'fog':
      return { text: '안개', emoji: 'fog' }
    case 'rain':
      return { text: '비', emoji: 'rain' }
    case 'snow':
      return { text: '눈', emoji: 'snow' }
    case 'sleet':
      return { text: '진눈깨비', emoji: 'rain' }
    default:
      return { text: '흐림', emoji: 'cloud' }
  }
}

// 초미세먼지(PM2.5) 기준: 환경부 좋음 15 이하 · 보통 35 이하 · 나쁨 75 이하
export const airText = (pm25) => (pm25 == null ? '' : pm25 <= 15 ? '공기 좋음' : pm25 <= 35 ? '공기 보통' : pm25 <= 75 ? '공기 나쁨' : '공기 매우 나쁨')

// 자외선 지수: 0~2 낮음 · 3~5 보통 · 6~7 높음 · 8~10 매우 높음 · 11 이상 위험
export const uvText = (uv) => (uv == null ? '' : uv < 3 ? '자외선 낮음' : uv < 6 ? '자외선 보통' : uv < 8 ? '자외선 높음' : uv < 11 ? '자외선 매우 높음' : '자외선 위험')
