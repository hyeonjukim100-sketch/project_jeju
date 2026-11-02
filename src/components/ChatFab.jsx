import { useState } from 'react'

// 플로팅 챗 버튼 — 대화 기능은 6단계에서 연결한다.
export default function ChatFab() {
  const [open, setOpen] = useState(false)
  return (
    <>
      {open && (
        <div className="chat-panel" role="dialog" aria-label="AI 가이드">
          <div className="chat-head">
            <strong>AI 가이드</strong>
            <button type="button" className="chat-x" onClick={() => setOpen(false)} aria-label="닫기">
              <i className="bi bi-x-lg" />
            </button>
          </div>
          <p className="chat-body">안녕하세요. 대화 기능은 곧 열려요. 기분과 취향을 말씀해 주시면 느린 하루 코스를 함께 짜 드릴 예정이에요.</p>
        </div>
      )}
      <button type="button" className="chat-fab" onClick={() => setOpen((o) => !o)} aria-label={open ? '대화창 닫기' : 'AI 가이드와 대화하기'}>
        <i className="bi bi-chat-heart-fill" />
      </button>
    </>
  )
}
