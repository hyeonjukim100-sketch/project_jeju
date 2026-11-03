// 버스 세부정보에 쓰는 글

// "1개 정류장, 다음 버스 약 8분 뒤" (다음 버스를 모르면 앞부분만)
export function busMeta({ stops, nextMin }) {
  return nextMin != null ? `${stops}개 정류장, 다음 버스 약 ${nextMin}분 뒤` : `${stops}개 정류장`
}

// 처음엔 버스 1개만 보이므로, 숨은 개수를 알려 주고 펼친 뒤에는 접기
export function moreLabel(total, expanded) {
  return expanded ? '접기' : `버스 ${total - 1}개 더 보기`
}

// 버스를 못 찾았을 때 안내 문구 (이유별)
export function noBusNote(reason) {
  if (reason === 'no-stops') return '근처 1km 안에 버스 정류장이 없어요.'
  if (reason === 'near') return '가까운 거리라 걸어가는 게 좋아요.'
  if (reason === 'error') return '버스 정보를 잠시 불러오지 못했어요.'
  return '직접 가는 버스를 찾지 못했어요. 환승이 필요할 수 있어요.'
}
