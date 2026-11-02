// 푸른 공간 / 초록 공간 — 장소의 성격을 나누는 표시일 뿐, 건강이나 마음에 효과가 있다는 말이 아니다.
//  푸른 공간: 해안선(OpenStreetMap 윤곽)에서 600m 안
//  초록 공간: 오름·숲·올레길 같은 자연 종류
import coast from '../data/jeju-coast.json'

const BLUE_KM = 0.6
const GREEN_KINDS = ['자연', '오름', '생태공원', '트레일', '지질트레일', '올레코스']

const coastPts = coast.rings.flat()
const km = (lng, lat, p) => Math.hypot((lat - p[1]) * 111, (lng - p[0]) * 92)

export function spaceOf(spot) {
  let min = Infinity
  for (const p of coastPts) {
    const d = km(spot.lng, spot.lat, p)
    if (d < min) min = d
  }
  if (min <= BLUE_KM) return 'blue'
  if (GREEN_KINDS.includes(spot.kind)) return 'green'
  return null
}

export const SPACE_LABEL = { blue: '푸른 공간', green: '초록 공간' }
export const SPACE_EMOJI = { blue: 'wave', green: 'herb' }
