import { useState } from 'react'
import { MAX_CUSTOM_TAGS, MAX_TAGS, PRESET_TAGS, cleanTag } from '../lib/tags'

// 미리 정한 해시태그 + 직접 쓰기(최대 2개, 전체 6개까지)
export default function TagPicker({ value, onChange }) {
  const [custom, setCustom] = useState('')
  const [err, setErr] = useState('')
  const customTags = value.filter((t) => !PRESET_TAGS.includes(t))

  const toggle = (t) => {
    if (value.includes(t)) return onChange(value.filter((x) => x !== t))
    if (value.length >= MAX_TAGS) return setErr(`태그는 ${MAX_TAGS}개까지 고를 수 있어요`)
    setErr('')
    onChange([...value, t])
  }

  const addCustom = () => {
    const t = cleanTag(custom)
    if (!t) return setErr('태그는 공백 없이 한글·영문·숫자 2~12자로 써 주세요')
    if (value.includes(t)) return setErr('이미 고른 태그예요')
    if (customTags.length >= MAX_CUSTOM_TAGS) return setErr(`직접 쓰는 태그는 ${MAX_CUSTOM_TAGS}개까지예요`)
    if (value.length >= MAX_TAGS) return setErr(`태그는 ${MAX_TAGS}개까지 고를 수 있어요`)
    setErr('')
    onChange([...value, t])
    setCustom('')
  }

  return (
    <div className="tag-picker">
      <div className="kind-chips">
        {[...PRESET_TAGS, ...customTags].map((t) => (
          <button key={t} type="button" aria-pressed={value.includes(t)} className={`chip ${value.includes(t) ? 'on' : ''}`} onClick={() => toggle(t)}>
            #{t}
          </button>
        ))}
      </div>
      <div className="tag-add">
        <input
          value={custom}
          maxLength={13}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addCustom()
            }
          }}
          placeholder="#직접 쓰기"
          aria-label="직접 쓰는 해시태그"
        />
        <button type="button" className="chip" onClick={addCustom}>
          추가
        </button>
      </div>
      {err && <div className="small tag-err" role="alert">{err}</div>}
    </div>
  )
}
