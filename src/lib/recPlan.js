// 기분을 고르고 지도로 넘어갈 때 추천 동선을 새로 만들어야 하는지.
// 이미 같은 기분으로 만든 것이 있으면 다시 만들지 않고(5~7초, 외부 서비스 호출), 만드는 중이면 겹쳐 만들지 않는다.
export function needsRecPlan(recPlan, moodLevel, busy) {
  if (busy) return false
  if (!recPlan.stops.length) return true
  return recPlan.mood !== moodLevel
}
