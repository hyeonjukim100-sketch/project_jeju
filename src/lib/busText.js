// 버스 세부정보에 쓰는 글

// "1개 정류장, 다음 버스 약 8분 뒤" (다음 버스를 모르면 앞부분만)
export function busMeta({ stops, nextMin }) {
  return nextMin != null ? `${stops}개 정류장, 다음 버스 약 ${nextMin}분 뒤` : `${stops}개 정류장`
}

// 처음엔 버스 1개만 보이므로, 숨은 개수를 알려 주고 펼친 뒤에는 접기
export function moreLabel(total, expanded) {
  return expanded ? '접기' : `버스 ${total - 1}개 더 보기`
}
