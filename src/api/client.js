// 화면 → /api 서버 함수 호출 모음 (기능을 붙이면서 하나씩 추가)
async function get(path) {
  const r = await fetch(path)
  if (!r.ok) throw new Error(`${path} 요청 실패 (${r.status})`)
  return r.json()
}

export const hello = () => get('/api/hello')
