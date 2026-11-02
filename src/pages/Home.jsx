import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import CharacterStone from '../components/CharacterStone'
import Explore from '../components/Explore'
import MoodSlider from '../components/MoodSlider'

const scrollTo = (id) =>
  document.getElementById(id)?.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block: 'start',
  })

// 첫 화면(인사말 · 기분 슬라이더 · 캐릭터) → 스크롤하면 날씨와 3D 지도
export default function Home() {
  const { hash } = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    scrollTo(hash.slice(1) || 'hero')
  }, [hash])

  // 주소에 이미 #explore 가 있어도 다시 눌렀을 때 스크롤되도록 직접 스크롤한다
  const goExplore = () => {
    navigate('/#explore')
    scrollTo('explore')
  }

  return (
    <>
      <section id="hero" className="hero">
        <div className="hero-text">
          <h1>오늘의 기분은 어떤가요?</h1>
          <p>아래 동그란 점을 좌우로 밀어 기분을 알려 주세요. 기분에 맞는 여행 코스를 추천해 드려요.</p>
        </div>
        <MoodSlider onDone={goExplore} />
        <CharacterStone />
        <button type="button" className="scroll-hint" onClick={goExplore}>
          지도 보러 가기 <i className="bi bi-chevron-down" />
        </button>
      </section>
      <Explore />
    </>
  )
}
