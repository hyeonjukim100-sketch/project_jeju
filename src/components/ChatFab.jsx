import { useEffect, useRef, useState } from 'react'
import { sendChat } from '../api/client'
import { useAppStore } from '../store/useAppStore'
import { MongsumiFace } from './Mongsumi'

const SUGGESTIONS = ['오늘 날씨에 맞는 느린 하루 코스를 추천해 주세요', '조용히 걷기 좋은 곳이 궁금해요']

// 플로팅 챗: 위험 문구는 서버가 먼저 걸러 연락처 카드로 돌려준다
export default function ChatFab() {
  const moodLevel = useAppStore((s) => s.moodLevel)
  const chatDraft = useAppStore((s) => s.chatDraft)
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const bottom = useRef(null)

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' })
  }, [messages, busy, open])

  // 오늘의 제안 카드에서 온 질문: 챗을 열고 입력칸에 채워 둔다
  useEffect(() => {
    if (!chatDraft) return
    setOpen(true)
    setText(chatDraft.text)
  }, [chatDraft])

  const send = async (content) => {
    const q = content.trim()
    if (!q || busy) return
    const next = [...messages, { role: 'user', content: q }]
    setMessages(next)
    setText('')
    setBusy(true)
    try {
      // 연락처 카드와 오류 문구는 모델에게 다시 보내지 않는다
      const history = next.filter((m) => !m.crisis && !m.error).map(({ role, content }) => ({ role, content }))
      const res = await sendChat(history, moodLevel)
      setMessages([...next, { role: 'assistant', content: res.reply, crisis: res.crisis, contacts: res.contacts }])
    } catch (e) {
      setMessages([...next, { role: 'assistant', content: e.message, error: true }])
    } finally {
      setBusy(false)
    }
  }

  const dismissCard = (idx) => setMessages((ms) => ms.map((m, i) => (i === idx ? { ...m, dismissed: true } : m)))

  return (
    <>
      {open && (
        <div className="chat-panel" role="dialog" aria-label="몽숨이 AI">
          <div className="chat-head">
            <strong>몽숨이 AI</strong>
            <button type="button" className="chat-x" onClick={() => setOpen(false)} aria-label="닫기">
              <i className="bi bi-x-lg" />
            </button>
          </div>

          <div className="chat-log" aria-live="polite">
            {messages.length === 0 && (
              <>
                <p className="chat-body">안녕하세요. 오늘의 기분과 날씨에 맞는 느린 제주 하루를 함께 찾아 드릴게요.</p>
                <div className="chat-suggest">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} type="button" className="chip" onClick={() => send(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`bubble ${m.role} ${m.error ? 'err' : ''}`}>
                {m.content}
                {m.crisis && !m.dismissed && (
                  <div className="crisis-card">
                    {m.contacts.map((c) => (
                      <a key={c.tel} href={`tel:${c.tel.replace(/-/g, '')}`}>
                        {c.tel}({c.name})
                      </a>
                    ))}
                    <button type="button" className="chip" onClick={() => dismissCard(i)}>
                      괜찮아요, 코스 이야기를 이어갈게요
                    </button>
                  </div>
                )}
              </div>
            ))}
            {busy && <div className="bubble assistant">생각하는 중이에요…</div>}
            <div ref={bottom} />
          </div>

          <form
            className="chat-form"
            onSubmit={(e) => {
              e.preventDefault()
              send(text)
            }}
          >
            <input value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="무엇이든 편하게 말씀해 주세요" aria-label="메시지" />
            <button type="submit" className="btn-soft" aria-label="보내기">
              <i className="bi bi-send-fill" />
            </button>
          </form>
          <p className="chat-note">AI가 만든 답이라 틀릴 수 있어요. 의료·상담이 아닌 여행 추천이에요.</p>
        </div>
      )}
      <button type="button" className="chat-fab" onClick={() => setOpen((o) => !o)} aria-label={open ? '대화창 닫기' : '몽숨이 AI와 대화하기'}>
        <MongsumiFace size="2.8rem" />
      </button>
    </>
  )
}
