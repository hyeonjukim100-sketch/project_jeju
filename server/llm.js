// 모델 호출의 유일한 통로. 에이전트(agent.js)는 이 파일만 알고, 어느 회사 모델인지는 모른다.
// LLM_PROVIDER 로 고른다 (지금은 gemini — 테스트용. 나중에 claude 어댑터를 추가해 바꾼다).
export async function generate(args) {
  const provider = process.env.LLM_PROVIDER || 'gemini'
  if (provider === 'gemini') return (await import('./llm/gemini.js')).generate(args)
  throw new Error(`알 수 없는 LLM_PROVIDER: ${provider}`)
}
