import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import CharacterStone from '../components/CharacterStone'
import Explore from '../components/Explore'
import MoodSlider from '../components/MoodSlider'

// 첫 화면(인사말 · 기분 슬라이더 · 캐릭터) → 스크롤하면 날씨와 3D 지도
export default function Home() {
  const { hash } = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const id = hash.slice(1) || 'hero'
    document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
  }, [hash])

  return (
    <>
      <section id="hero" className="hero">
        <div className="hero-text">
          <h1>오늘 기분은 어떠세요?</h1>
          <p>편안한 하루 보내고 계신가요? 슬라이더를 움직여 알려 주세요.</p>
        </div>
        <MoodSlider onDone={() => navigate('/#explore')} />
        <CharacterStone />
        <button type="button" className="scroll-hint" onClick={() => navigate('/#explore')}>
          지도 보러 가기 <i className="bi bi-chevron-down" />
        </button>
      </section>
      <Explore />
    </>
  )
}
