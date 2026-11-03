import { Fragment, useEffect, useRef, useState } from 'react'
import { fetchPlan, sendChat } from '../api/client'
import { hasCrisisSignal } from '../lib/crisis'
import { routeTitle } from '../lib/routeTitle'
import { useIsMobile } from '../lib/useIsMobile'
import { useAppStore } from '../store/useAppStore'
import { MongsumiFace } from './Mongsumi'

// 함께 여행 계획 세우기: 한 번에 하나씩 묻고 버튼으로 답한다. 직접 쓴 말은 보기와 맞는 것을 찾는다.
const STEPS = [
  { key: 'who', q: '누구와 함께 가시나요? 🌿', opts: ['혼자', '연인과', '가족과', '친구와'].map((v) => ({ label: v, value: v })) },
  {
    key: 'transport',
    q: '이동은 어떻게 하실 예정인가요? 🚗',
    opts: [
      { label: '🚗 렌터카', value: 'car' },
      { label: '🚕 택시', value: 'taxi' },
      { label: '🚶 뚜벅이', value: 'walk' },
      { label: '🚌 버스', value: 'bus' },
    ],
  },
  {
    key: 'walk',
    q: '걷는 건 어느 정도가 좋으세요?',
    opts: [
      { label: '거의 안 걷고 싶어요', value: 'little' },
      { label: '조금은 괜찮아요', value: 'some' },
      { label: '많이 걸어도 좋아요', value: 'lot' },
    ],
  },
  {
    key: 'likes',
    multi: true,
    q: '하고 싶은 것을 골라 주세요. 여러 개 골라도 좋아요 ☕ (카페에서 쉬어가는 시간은 늘 넣어 드려요)',
    opts: ['바다·자연', '오름', '걷기 좋은 길', '시장', '예술·문화', '조용한 곳'].map((v) => ({ label: v, value: v })),
  },
]
const NOTE = '이 대화와 추천 코스는 저장되지 않아요. 새로고침하면 사라지니, 마음에 드는 코스는 내 동선에 담아 두세요.'
const STOP_NOTE = '여행 계획 세우기를 멈췄어요. 지금까지 나눈 이야기는 저장되지 않고, 새로고침하면 사라져요. 필요하면 언제든 다시 시작해 주세요 🌿'
const BUS_URL = 'https://bus.jeju.go.kr'
const hm = (m) => (m >= 60 ? `${Math.floor(m / 60)}시간${m % 60 ? ` ${m % 60}분` : ''}` : `${m}분`)
const MODE = { car: 'car', taxi: 'car', walk: 'walk', bus: 'bus' }

const SUGGESTIONS = ['오늘 날씨에 맞는 느린 하루 코스를 추천해 주세요', '조용히 걷기 좋은 곳이 궁금해요', '버스로 갈 수 있는 곳이 궁금해요', '지치고 힘들 때 쉬어 가기 좋은 곳이요']

// 플로팅 챗: 위험 문구는 서버가 먼저 걸러 연락처 카드로 돌려준다
export default function ChatFab() {
  const moodLevel = useAppStore((s) => s.moodLevel)
  const chatDraft = useAppStore((s) => s.chatDraft)
  const toast = useAppStore((s) => s.toast)
  const mobile = useIsMobile() // 모바일에서는 하단 탭 바의 몽숨이 칸이 대신 연다
  const open = useAppStore((s) => s.chatOpen)
  const setOpen = useAppStore((s) => s.setChatOpen)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [flow, setFlow] = useState(null) // 여행 계획 질문 중이면 { step, answers, picks }
  const bottom = useRef(null)

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' })
  }, [messages, busy, open, flow])

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
      // 연락처 카드·오류 문구·계획 질문 흐름은 모델에게 다시 보내지 않는다
      const history = next.filter((m) => !m.crisis && !m.error && !m.plan).map(({ role, content }) => ({ role, content }))
      const res = await sendChat(history, moodLevel)
      setMessages([...next, { role: 'assistant', content: res.reply, crisis: res.crisis, contacts: res.contacts }])
    } catch (e) {
      setMessages([...next, { role: 'assistant', content: e.message, error: true }])
    } finally {
      setBusy(false)
    }
  }

  const startFlow = () => {
    setMessages((ms) => [
      ...ms,
      { role: 'user', content: '함께 여행 계획 세우기', plan: true },
      { role: 'assistant', content: `좋아요! 몇 가지만 여쭤볼게요. ${NOTE}`, plan: true },
      { role: 'assistant', content: STEPS[0].q, plan: true },
    ])
    setFlow({ step: 0, answers: {}, picks: [] })
  }

  const finishFlow = async (answers) => {
    setFlow(null)
    setBusy(true)
    try {
      const course = await fetchPlan(answers, moodLevel)
      setMessages((ms) => [...ms, { role: 'assistant', content: course.intro, course: { ...course, mood: moodLevel }, plan: true }])
    } catch (e) {
      setMessages((ms) => [...ms, { role: 'assistant', content: e.message, error: true, plan: true }])
    } finally {
      setBusy(false)
    }
  }

  const answer = (label, value) => {
    const st = STEPS[flow.step]
    const answers = { ...flow.answers, [st.key]: value }
    const said = { role: 'user', content: label, plan: true }
    if (flow.step + 1 >= STEPS.length) {
      setMessages((ms) => [...ms, said, { role: 'assistant', content: '코스를 만들고 있어요. 잠시만요 🌿', plan: true }])
      return finishFlow(answers)
    }
    setMessages((ms) => [...ms, said, { role: 'assistant', content: STEPS[flow.step + 1].q, plan: true }])
    setFlow({ step: flow.step + 1, answers, picks: [] })
  }

  const togglePick = (v) => setFlow((f) => ({ ...f, picks: f.picks.includes(v) ? f.picks.filter((x) => x !== v) : [...f.picks, v] }))

  // 질문 중에 쓴 말: 위험 문구면 계획을 멈추고 안내하고, 아니면 보기와 맞는 것을 찾는다
  const sendInFlow = (q) => {
    if (!q) return
    if (hasCrisisSignal(q)) {
      setFlow(null)
      return send(q)
    }
    const st = STEPS[flow.step]
    const hit = st.multi ? null : st.opts.find((o) => q.length > 1 && (q.includes(o.value) || o.label.includes(q)))
    setText('')
    if (hit) return answer(hit.label, hit.value)
    setMessages((ms) => [...ms, { role: 'user', content: q, plan: true }, { role: 'assistant', content: '아래 보기에서 골라 주시면 코스를 더 잘 맞출 수 있어요 🌿', plan: true }])
  }

  const restart = () => {
    setMessages([])
    setFlow(null)
    setText('')
    toast('대화를 지우고 처음으로 돌아왔어요')
  }

  const dismissCard =(idx) => setMessages((ms) => ms.map((m, i) => (i === idx ? { ...m, dismissed: true } : m)))
  const step = flow && STEPS[flow.step]

  return (
    <>
      {open && (
        <div className="chat-panel" role="dialog" aria-label="몽숨이 AI">
          <div className="chat-head">
            <strong>몽숨이 AI</strong>
            <div className="chat-head-btns">
              {messages.length > 0 && !busy && (
                <button type="button" className="chip" onClick={restart}>
                  새로 시작
                </button>
              )}
              <button type="button" className="chat-x" onClick={() => setOpen(false)} aria-label="닫기">
                <i className="bi bi-x-lg" />
              </button>
            </div>
          </div>

          <div className="chat-log" aria-live="polite">
            {messages.length === 0 && (
              <>
                <p className="chat-body">안녕하세요. 오늘의 기분과 날씨에 맞는 느린 제주 하루를 함께 찾아 드릴게요 🌿</p>
                <div className="chat-suggest">
                  <button type="button" className="chip plan-start" onClick={startFlow}>
                    <i className="bi bi-signpost-split" /> 함께 여행 계획 세우기
                  </button>
                  {SUGGESTIONS.map((s) => (
                    <button key={s} type="button" className="chip" onClick={() => send(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}

            {messages.map((m, i) => {
              const bubble = (
              <div className={`bubble ${m.role} ${m.error ? 'err' : ''}`}>
                {m.content}
                {m.course && <CourseCard course={m.course} />}
                {m.crisis && !m.dismissed && (
                  <div className="crisis-card">
                    {m.contacts.map((c) => (
                      <a key={c.tel} href={`tel:${c.tel.replace(/-/g, '')}`}>
                        📞 {c.tel}({c.name})
                      </a>
                    ))}
                    <button type="button" className="chip" onClick={() => dismissCard(i)}>
                      괜찮아요, 코스 이야기를 이어갈게요
                    </button>
                  </div>
                )}
              </div>
              )
              if (m.role !== 'assistant') return <Fragment key={i}>{bubble}</Fragment>
              // 몽숨이 얼굴은 AI 말풍선이 이어질 때 맨 처음에만 붙인다
              return (
                <div key={i} className="ai-row">
                  <span className="ai-av" aria-hidden="true">{messages[i - 1]?.role !== 'assistant' && <MongsumiFace size="1.8rem" />}</span>
                  {bubble}
                </div>
              )
            })}

            {flow && !busy && (
              <div className="chat-suggest flow-opts">
                {step.opts.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    className={`chip ${step.multi && flow.picks.includes(o.value) ? 'on' : ''}`}
                    aria-pressed={step.multi ? flow.picks.includes(o.value) : undefined}
                    onClick={() => (step.multi ? togglePick(o.value) : answer(o.label, o.value))}
                  >
                    {o.label}
                  </button>
                ))}
                {step.multi && (
                  <button type="button" className="btn-soft" onClick={() => answer(flow.picks.length ? flow.picks.join(', ') : '상관없어요', flow.picks)}>
                    {flow.picks.length ? '다 골랐어요' : '상관없어요'}
                  </button>
                )}
                <button type="button" className="chip" onClick={() => {
                    setFlow(null)
                    setMessages((m) => [...m, { role: 'assistant', content: STOP_NOTE, plan: true }])
                  }}>
                  그만할래요
                </button>
              </div>
            )}
            {busy && (
              <div className="ai-row">
                <span className="ai-av" aria-hidden="true">{messages[messages.length - 1]?.role !== 'assistant' && <MongsumiFace size="1.8rem" />}</span>
                <div className="bubble assistant">생각하는 중이에요…</div>
              </div>
            )}
            <div ref={bottom} />
          </div>

          <form
            className="chat-form"
            onSubmit={(e) => {
              e.preventDefault()
              if (flow) sendInFlow(text.trim())
              else send(text)
            }}
          >
            <input value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="무엇이든 편하게 말씀해 주세요" aria-label="메시지" />
            <button type="submit" className="btn-soft" aria-label="보내기">
              <i className="bi bi-send-fill" />
            </button>
          </form>
          <p className="chat-note">AI가 만든 답이라 틀릴 수 있어요.<br />의료·상담이 아닌 여행 추천이에요.</p>
        </div>
      )}
      {!mobile && (
        <button type="button" className="chat-fab" onClick={() => setOpen((o) => !o)} aria-label={open ? '대화창 닫기' : '몽숨이 AI와 대화하기'}>
          <MongsumiFace size="2.8rem" />
        </button>
      )}
    </>
  )
}

// 추천 코스 카드: 번호 매긴 장소와 이동시간, 장소별 담기, 코스 전체 담기
function CourseCard({ course }) {
  const { stops, legs, transport, mood } = course
  const mode = MODE[transport] || 'car'
  const spots = useAppStore((s) => s.spots)
  const selectSpot = useAppStore((s) => s.selectSpot)
  const addStop = useAppStore((s) => s.addStop)
  const addStops = useAppStore((s) => s.addStops)
  const setTransport = useAppStore((s) => s.setTransport)
  const setPanelTab = useAppStore((s) => s.setPanelTab)
  const moodLevel = useAppStore((s) => s.moodLevel)
  const { chip, title } = routeTitle(stops, mood ?? moodLevel)

  const leg =(l) => (mode === 'bus' ? `🚌 버스로 이동 ${l.km}km` : mode === 'walk' ? `🚶 걸어서 약 ${hm(l.walk)} (${l.km}km)${l.walk > 30 ? ' · 많이 멀어요' : ''}` : `🚗 차로 약 ${l.minutes}분 (${l.km}km)`)
  const plain = ({ tip, ...stop }) => stop
  const show = (s) => {
    const sp = spots.find((x) => x.title === s.title)
    if (sp) selectSpot(sp)
  }
  const addAll = () => {
    setTransport(mode)
    addStops(stops.map(plain))
    setPanelTab('plan')
  }

  return (
    <div className="course-card">
      <div className="course-head">
        {chip && <span className="route-mood">{chip}</span>}
        <div className="route-title course-title">{title}</div>
      </div>
      <ol>
        {stops.map((s, i) => (
          <li key={`${s.title}-${i}`}>
            <div className="d-flex gap-2 align-items-start">
              <span className="plan-no">{i + 1}</span>
              <div className="flex-grow-1">
                <button type="button" className="plan-title" onClick={() => show(s)}>
                  {s.title}
                </button>
                <div className="small text-secondary">{s.kind}</div>
                {s.tip && <div className="small">여기서 해 볼 5분: {s.tip}</div>}
              </div>
              <button type="button" className="chip" onClick={() => addStop(plain(s))} aria-label={`${s.title} 내 동선에 담기`}>
                + 담기
              </button>
            </div>
            {legs[i] && <div className="small text-secondary course-leg">{leg(legs[i])}</div>}
          </li>
        ))}
      </ol>
      {mode === 'bus' && <div className="small text-secondary">
          배차 간격과 시간은{' '}
          <a href={BUS_URL} target="_blank" rel="noreferrer">
            제주버스정보시스템 <i className="bi bi-box-arrow-up-right" />
          </a>
          에서 확인해 주세요.
        </div>}
      <button type="button" className="btn-soft w-100" onClick={addAll}>
        이 코스를 내 동선에 담기
      </button>
      <div className="small text-secondary">{NOTE}</div>
    </div>
  )
}
