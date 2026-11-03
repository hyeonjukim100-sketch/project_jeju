import { useEffect, useState } from 'react'

const QUERY = '(max-width: 640px)' // theme.css 의 모바일 구간과 같은 너비

// 화면이 모바일 너비인지 (창 크기가 바뀌면 따라간다)
export function useIsMobile() {
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia(QUERY).matches)
  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const on = (e) => setMobile(e.matches)
    setMobile(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return mobile
}
