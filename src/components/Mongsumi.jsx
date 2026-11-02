import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { Bounds, useAnimations, useGLTF } from '@react-three/drei'
import { SkeletonUtils } from 'three-stdlib'

const BODY = '/models/haenyeo.glb'

// 같은 모델을 여러 화면(Canvas)에서 쓰므로 장면을 복제해서 쓴다
function useBody() {
  const gltf = useGLTF(BODY)
  const scene = useMemo(() => SkeletonUtils.clone(gltf.scene), [gltf.scene])
  return { scene, animations: gltf.animations }
}

function Body() {
  const group = useRef()
  const { scene, animations } = useBody()
  const { actions } = useAnimations(animations, group)
  useEffect(() => {
    actions.wave?.reset().fadeIn(0.2).play()
    return () => actions.wave?.fadeOut(0.2)
  }, [actions])
  return <primitive ref={group} object={scene} />
}

// 몽숨이 — 첫 화면에서 손을 흔든다
export function MongsumiHero() {
  return (
    <div className="mongsumi-hero" role="img" aria-label="손을 흔드는 해녀 캐릭터 몽숨이">
      <Canvas camera={{ position: [0, 1, 4], fov: 30 }} dpr={[1, 2]}>
        <ambientLight intensity={1.4} />
        <directionalLight position={[3, 5, 4]} intensity={2} />
        <Suspense fallback={null}>
          <Bounds fit clip observe margin={1.15}>
            <Body />
          </Bounds>
        </Suspense>
      </Canvas>
    </div>
  )
}

function Head() {
  const { scene } = useBody()
  return <primitive object={scene} />
}

// 몽숨이 얼굴 — 버튼과 플로팅 아이콘에 쓰는 작은 그림 (몸 모델의 머리를 크게 보여 준다)
export function MongsumiFace({ size = '1.5em' }) {
  return (
    <span className="mongsumi-face" style={{ width: size, height: size }} aria-hidden="true">
      <Canvas camera={{ position: [0, 0.82, 0.9], fov: 30 }} dpr={[1, 2]} gl={{ alpha: true }} onCreated={({ camera }) => camera.lookAt(0, 0.8, 0)}>
        <ambientLight intensity={1.4} />
        <directionalLight position={[2, 3, 4]} intensity={2} />
        <Suspense fallback={null}>
          <Head />
        </Suspense>
      </Canvas>
    </span>
  )
}

useGLTF.preload(BODY)
