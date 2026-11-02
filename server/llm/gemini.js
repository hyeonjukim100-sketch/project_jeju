// Gemini 어댑터 (테스트용). 나중에 Claude 로 바꿀 때는 같은 모양의 claude.js 를 만들어 llm.js 에서 고른다.
import { GoogleGenAI } from '@google/genai'

let client = null
const model = () => process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'

// 공통 대화 형식 → Gemini 형식. turn.raw 는 이 어댑터가 직접 만든 응답(생각 서명 포함)이라 그대로 되돌려 보낸다.
function toContents(turns) {
  return turns.map((t) => {
    if (t.raw) return t.raw
    if (t.toolResults) {
      return { role: 'user', parts: t.toolResults.map((r) => ({ functionResponse: { id: r.id, name: r.name, response: { result: r.result } } })) }
    }
    return { role: t.role === 'assistant' ? 'model' : 'user', parts: [{ text: t.text }] }
  })
}

export async function generate({ system, turns, tools }) {
  const key = process.env.GEMINI_API_KEY
  if (!key) return { unavailable: true }
  client ||= new GoogleGenAI({ apiKey: key })

  const res = await client.models.generateContent({
    model: model(),
    contents: toContents(turns),
    config: {
      systemInstruction: system,
      temperature: 0.7,
      maxOutputTokens: 900,
      httpOptions: { timeout: 40_000 }, // 응답이 오지 않으면 무한정 기다리지 않는다
      tools: [{ functionDeclarations: tools.map((t) => ({ name: t.name, description: t.description, parametersJsonSchema: t.parameters })) }],
    },
  })

  const calls = (res.functionCalls || []).map((c, i) => ({ id: c.id || `${c.name}-${i}`, name: c.name, args: c.args || {} }))
  return { text: res.text || '', calls, raw: res.candidates?.[0]?.content }
}
