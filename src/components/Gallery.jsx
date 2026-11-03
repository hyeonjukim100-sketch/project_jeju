import { useEffect, useState } from 'react'
import { fetchPhotos } from '../api/client'

// 장소 사진 불러오기. photos 가 null 이면 찾는 중, 빈 배열이면 사진이 없는 곳.
export function usePhotos(spot) {
  const [photos, setPhotos] = useState(null)
  useEffect(() => {
    setPhotos(null)
    fetchPhotos(spot).then((r) => setPhotos(r.photos)).catch(() => setPhotos([]))
  }, [spot.id])
  return { photos }
}

export default function Gallery({ spot }) {
  const { title } = spot
  const { photos } = usePhotos(spot)
  const [idx, setIdx] = useState(0)
  useEffect(() => setIdx(0), [spot.id])

  if (photos === null) return <div className="gallery-empty">사진을 찾는 중…</div>
  if (!photos.length) return <div className="gallery-empty">이곳의 사진은 아직 없어요</div>
  return (
    <div>
      <img className="gallery-main" src={photos[idx].url} alt={title} loading="lazy" />
      <div className="gallery-thumbs">
        {photos.map((p, i) => (
          <img key={p.url} src={p.url} alt="" className={i === idx ? 'on' : ''} onClick={() => setIdx(i)} loading="lazy" />
        ))}
      </div>
      <div className="small text-secondary mt-1">
        사진: {photos[idx].credit} ({photos[idx].source})
      </div>
    </div>
  )
}
