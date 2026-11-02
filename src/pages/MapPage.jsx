import JejuMap3D from '../components/JejuMap3D'
import { useAppStore } from '../store/useAppStore'

export default function MapPage() {
  const spot = useAppStore((s) => s.selectedSpot)
  return (
    <div className="map-stage">
      <JejuMap3D />
      <aside className="glass-panel">
        <div className="panel-kicker">STEP 1 · 골격 확인</div>
        {spot ? (
          <>
            <h2 className="panel-title">{spot.title}</h2>
            <p className="text-secondary mb-0">
              선택한 장소가 store 에 담겼습니다. 이후 관광지 정보·사진 갤러리·올레길이 여기에 붙습니다.
            </p>
          </>
        ) : (
          <>
            <h2 className="panel-title">느린 제주 마음지도</h2>
            <p className="text-secondary mb-0">섬을 돌려 보고 핀을 눌러 보세요. (임시 핀 3개)</p>
          </>
        )}
      </aside>
    </div>
  )
}
