// 간단한 호출 횟수 제한: 키(보통 IP)마다 최근 windowMs 동안의 호출 시각을 세어, max 번을 넘으면 true 를 돌려준다.
// 서버리스는 인스턴스마다 따로 세므로 정확한 방어선이 아니라 남용을 줄이는 용도다.
export function createLimiter(max, windowMs = 60_000) {
  const hits = new Map() // key → 최근 호출 시각들

  const tooMany = (key, now = Date.now()) => {
    // 키가 많이 쌓였을 때만, 오래 조용했던 키를 치운다
    if (hits.size > 1000) {
      for (const [k, times] of hits) if (!times.some((t) => now - t < windowMs)) hits.delete(k)
    }
    const recent = (hits.get(key) || []).filter((t) => now - t < windowMs)
    // 막힌 요청은 세지 않는다: 계속 눌러도 처음 허용된 호출에서 한 창이 지나면 풀린다
    const blocked = recent.length >= max
    if (!blocked) recent.push(now)
    hits.set(key, recent)
    return blocked
  }
  tooMany.size = () => hits.size
  return tooMany
}

// 요청한 사람의 주소: Vercel 이 채워 주는 x-forwarded-for 의 첫 값, 없으면 연결 주소
export const clientIp = (req) => req.headers?.['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || 'local'
