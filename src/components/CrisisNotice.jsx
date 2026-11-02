import { CRISIS_CONTACTS } from '../lib/crisis'

// 글에 위험 문구가 있을 때 보여 주는 안내. 공개 글은 올리지 않고, 연락처를 먼저 알려 준다.
export default function CrisisNotice({ children }) {
  return (
    <div className="crisis-card" role="alert">
      <div>많이 힘드신 것 같아요. 혼자 견디지 않으셔도 괜찮아요. 지금 이야기 나눌 수 있는 곳이 있어요.</div>
      {CRISIS_CONTACTS.map((c) => (
        <a key={c.tel} href={`tel:${c.tel.replace(/-/g, '')}`}>
          {c.tel}({c.name})
        </a>
      ))}
      {children}
    </div>
  )
}
