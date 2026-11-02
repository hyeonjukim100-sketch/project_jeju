import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'

// 이메일 가입 · 로그인. 가입하면 인증 메일의 링크를 눌러야 로그인할 수 있다.
export default function AuthForm() {
  const { signIn, signUp } = useAppStore()
  const [mode, setMode] = useState('in') // 'in' | 'up'
  const [form, setForm] = useState({ email: '', password: '', nickname: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (mode === 'up' && form.password.length < 8) return setError('비밀번호를 8자 이상으로 정해 주세요')
    setBusy(true)
    const res = mode === 'in' ? await signIn(form) : await signUp({ ...form, nickname: form.nickname.trim() })
    setBusy(false)
    if (res.error) return setError(res.error)
    if (res.needsConfirm) setSent(true)
  }

  if (sent) {
    return (
      <div className="auth-card">
        <h2>메일함을 확인해 주세요</h2>
        <p className="text-secondary">
          <strong>{form.email}</strong>로 인증 메일을 보냈어요. 메일의 링크를 누른 뒤 로그인해 주세요. 메일이 보이지 않으면 스팸함도 확인해 주세요.
        </p>
        <button type="button" className="btn-soft" onClick={() => { setSent(false); setMode('in') }}>
          로그인하러 가기
        </button>
      </div>
    )
  }

  return (
    <form className="auth-card" onSubmit={submit}>
      <div className="auth-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={mode === 'in'} className={mode === 'in' ? 'on' : ''} onClick={() => setMode('in')}>
          로그인
        </button>
        <button type="button" role="tab" aria-selected={mode === 'up'} className={mode === 'up' ? 'on' : ''} onClick={() => setMode('up')}>
          가입하기
        </button>
      </div>

      <p className="text-secondary small mb-3">
        지도와 날씨는 로그인 없이 볼 수 있어요. 여행 기록은 로그인한 본인만 볼 수 있어요.
      </p>

      {mode === 'up' && (
        <label className="auth-field">
          닉네임 <span className="text-secondary">(선택)</span>
          <input type="text" value={form.nickname} onChange={set('nickname')} maxLength={20} autoComplete="nickname" placeholder="예: 바다" />
        </label>
      )}
      <label className="auth-field">
        이메일
        <input type="email" required value={form.email} onChange={set('email')} autoComplete="email" placeholder="name@example.com" />
      </label>
      <label className="auth-field">
        비밀번호 {mode === 'up' && <span className="text-secondary">(8자 이상)</span>}
        <input
          type="password"
          required
          value={form.password}
          onChange={set('password')}
          autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
        />
      </label>

      {error && (
        <div className="auth-error" role="alert">
          {error}
        </div>
      )}

      <button type="submit" className="btn-soft w-100" disabled={busy}>
        {busy ? '잠시만요…' : mode === 'in' ? '로그인' : '가입하기'}
      </button>
    </form>
  )
}
