import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="page-stub">
      <h1>길을 잃었어요</h1>
      <p>없는 주소입니다.</p>
      <Link to="/" className="btn btn-warning">3D 지도로 돌아가기</Link>
    </div>
  )
}
