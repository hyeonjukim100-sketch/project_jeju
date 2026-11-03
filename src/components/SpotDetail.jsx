import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import ClampText from './ClampText'
import Emoji from './Emoji'
import FavButton from './FavButton'
import ReviewBox from './ReviewBox'
import { usePhotos } from './Gallery'
import { KIND_EMOJI, KIND_GROUP } from '../lib/moods'
import { ratingsFor } from '../lib/reviews'
import { SPACE_LABEL } from '../lib/space'
import { categoryLabel, splitIntro } from '../lib/spotText'
import { isSupabaseReady } from '../lib/supabase'
import { useIsMobile } from '../lib/useIsMobile'
import { isWellness } from '../lib/wellness'

const TYPE_EMOJI = { meal: 'food', rest: 'coffee' }

// 장소 설명: 사진 히어로 + 둥근 카드. 모바일에서는 화면 전체를 덮고, 넓은 화면에서는 패널 안에 그대로 그린다.
// children 은 설명 아래(리뷰 위)에 들어간다 (근처 카페·식당).
export default function SpotDetail({ spot, onBack, onAdd, children }) {
  const mobile = useIsMobile()
  const { photos } = usePhotos(spot)
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(undefined) // undefined: 불러오는 중, null: 리뷰 없음
  useEffect(() => setIdx(0), [spot.id])
  useEffect(() => {
    setScore(undefined)
    if (!isSupabaseReady) return setScore(null)
    let live = true
    ratingsFor([spot.id])
      .then((r) => live && setScore(r[spot.id] || null))
      .catch(() => live && setScore(null))
    return () => {
      live = false
    }
  }, [spot.id])

  const wellness = isWellness(spot.title)
  const { lead, rest } = splitIntro(spot.intro)
  const photo = photos?.[idx]
  const emoji = TYPE_EMOJI[spot.type] || KIND_EMOJI[KIND_GROUP[spot.kind]] || KIND_EMOJI[spot.kind] || 'pin'

  const body = (
    <div className="spot-detail">
      <div className={`spot-hero ${wellness ? 'wellness' : ''}`}>
        {photo ? (
          <img className="spot-hero-img" src={photo.url} alt={spot.title} />
        ) : (
          <div className="spot-hero-empty">
            <Emoji name={emoji} size="3.2rem" />
            <span>{photos === null ? '사진을 찾는 중…' : '이곳의 사진은 아직 없어요'}</span>
          </div>
        )}
        {wellness && (
          <div className="hero-label">
            <Emoji name="herb" size="1.1em" /> 제주 웰니스관광지
          </div>
        )}
        <button type="button" className="round-btn back" onClick={onBack} aria-label="뒤로가기">
          <i className="bi bi-chevron-left" />
        </button>
        <FavButton variant="round" placeId={spot.id} title={spot.title} kind={spot.kind} address={spot.address} lat={spot.lat} lng={spot.lng} />
        {photos?.length > 1 && (
          <div className="spot-hero-thumbs">
            {photos.map((p, i) => (
              <button key={p.url} type="button" className={i === idx ? 'on' : ''} onClick={() => setIdx(i)} aria-label={`사진 ${i + 1}`}>
                <img src={p.url} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="spot-sheet">
        <span className="cat-chip">
          <Emoji name={emoji} size="1.1em" /> {categoryLabel(spot)}
        </span>
        {spot.space && <span className={`space-badge ${spot.space}`}>{SPACE_LABEL[spot.space]}</span>}

        <h2 className="spot-name">{spot.title}</h2>
        {spot.address && <div className="spot-addr">{spot.address}</div>}
        {score !== undefined && (
          <div className="spot-score">
            {score ? (
              <>
                <Emoji name="tangerine" size="1em" /> {score.avg.toFixed(1)} · 마음지도 리뷰 {score.count}개
              </>
            ) : (
              '아직 리뷰가 없어요'
            )}
          </div>
        )}
        {lead && <div className="spot-lead">{lead}</div>}
        <ClampText text={rest} />
        <button type="button" className="btn-soft w-100 mt-2" onClick={onAdd}>
          동선에 담기
        </button>
        {children}
        {wellness && <div className="spot-credit">웰니스관광지 목록: Visit Jeju · 건강이나 마음에 대한 효과를 말하는 표시는 아니에요</div>}
        {photo && (
          <div className="spot-credit">
            사진: {photo.credit} ({photo.source})
          </div>
        )}
        <ReviewBox placeId={spot.id} title={spot.title} />
      </div>
    </div>
  )

  return mobile ? createPortal(<div className="spot-full">{body}</div>, document.body) : body
}
