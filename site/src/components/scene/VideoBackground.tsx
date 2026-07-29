import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useMemo } from 'react'

/**
 * VideoPlane — a full-frame plane that displays a given texture inside the WebGL
 * scene. The video element + VideoTexture are owned by GlobalScene (so the same
 * texture can also be handed to the liquid glass); this component is only the
 * geometry that shows it as the page background.
 *
 * The plane is sized with trig (not `viewport`) because it sits at z = -1, behind
 * the z=0 focus plane `viewport` measures — a plane that far back must be scaled
 * up to still fill the frustum, or black borders show.
 */
export function VideoPlane({ texture, dim = 0.55 }: { texture: THREE.Texture; dim?: number }) {
  const { size, camera } = useThree()

  const scale = useMemo<[number, number, number]>(() => {
    const planeZ = -1
    const dist = camera.position.z - planeZ
    const vFov = ((camera as THREE.PerspectiveCamera).fov * Math.PI) / 180
    const h = 2 * Math.tan(vFov / 2) * dist
    const w = h * (size.width / size.height)
    return [w * 1.04, h * 1.04, 1] // small margin so edges never show
  }, [size.width, size.height, camera])

  return (
    <mesh position={[0, 0, -1]} scale={scale} frustumCulled={false}>
      <planeGeometry />
      {/* `color` multiplies the texture — a gray dims the video so foreground
          text stays readable and the glass has headroom to glare over it. */}
      <meshBasicMaterial
        map={texture}
        toneMapped={false}
        depthTest={false}
        depthWrite={false}
        color={new THREE.Color(dim, dim, dim)}
      />
    </mesh>
  )
}
