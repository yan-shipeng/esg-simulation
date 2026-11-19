import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { PEOPLE, STAGE_COLORS, type GameState, type TurnResult } from '../game/engine'
import { getPersonText, translations, type Language } from '../i18n'

interface CampusSceneProps {
  state: GameState
  selectedId: string
  networkVisible: boolean
  language: Language
  lastTurn?: TurnResult
  onSelect: (id: string) => void
}

interface AnimatedEffect {
  object: THREE.Object3D
  life: number
  maxLife: number
  velocity: THREE.Vector3
}

const stageColor = (stage: keyof typeof STAGE_COLORS) => new THREE.Color(STAGE_COLORS[stage])

function makeTextSprite(title: string, subtitle: string, accent: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 144
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = 'rgba(7, 16, 15, .88)'
  ctx.beginPath()
  ctx.roundRect(22, 12, 468, 116, 22)
  ctx.fill()
  ctx.strokeStyle = 'rgba(183, 224, 204, .20)'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fillStyle = accent
  ctx.beginPath()
  ctx.roundRect(22, 12, 8, 116, 4)
  ctx.fill()
  ctx.textAlign = 'center'
  ctx.fillStyle = '#f0f5ed'
  const titleSize = title.length > 18 ? 32 : title.length > 12 ? 36 : 42
  ctx.font = `600 ${titleSize}px "Microsoft YaHei", sans-serif`
  ctx.fillText(title, 256, 66, 440)
  ctx.fillStyle = '#91a59e'
  ctx.font = '24px "Microsoft YaHei", sans-serif'
  ctx.fillText(subtitle, 256, 105, 440)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }))
  sprite.scale.set(2.65, 0.75, 1)
  sprite.renderOrder = 20
  return sprite
}

function makeEffectText(text: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 128
  const ctx = canvas.getContext('2d')!
  ctx.textAlign = 'center'
  ctx.shadowColor = 'rgba(184, 238, 118, .5)'
  ctx.shadowBlur = 22
  ctx.fillStyle = '#d9ff9b'
  ctx.font = '700 54px "Microsoft YaHei", sans-serif'
  ctx.fillText(text, 256, 76)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }))
  sprite.scale.set(2.7, 0.68, 1)
  sprite.renderOrder = 30
  return sprite
}

function addBox(scene: THREE.Object3D, size: [number, number, number], position: [number, number, number], color: string, roughness = 0.8) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(...size),
    new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.12 }),
  )
  mesh.position.set(...position)
  mesh.castShadow = true
  mesh.receiveShadow = true
  scene.add(mesh)
  return mesh
}

function addBuilding(scene: THREE.Scene, x: number, z: number, width: number, height: number, depth: number, color: string) {
  const group = new THREE.Group()
  group.position.set(x, 0, z)
  scene.add(group)
  addBox(group, [width, height, depth], [0, height / 2, 0], color)
  addBox(group, [width + 0.14, 0.12, depth + 0.14], [0, height + 0.02, 0], '#31443f')
  const windowMaterial = new THREE.MeshStandardMaterial({ color: '#9fcfae', emissive: '#5a956e', emissiveIntensity: 0.55, roughness: 0.35 })
  for (let floor = 0; floor < Math.max(1, Math.floor(height / 0.8)); floor += 1) {
    for (let column = 0; column < Math.floor(width / 0.65); column += 1) {
      const window = new THREE.Mesh(new THREE.PlaneGeometry(0.29, 0.25), windowMaterial)
      window.position.set(-width / 2 + 0.43 + column * 0.65, 0.55 + floor * 0.72, depth / 2 + 0.006)
      group.add(window)
    }
  }
  return group
}

function addTree(scene: THREE.Scene, x: number, z: number, scale = 1) {
  addBox(scene, [0.13 * scale, 0.65 * scale, 0.13 * scale], [x, 0.32 * scale, z], '#4d3e31')
  const crown = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.48 * scale, 1),
    new THREE.MeshStandardMaterial({ color: '#315e48', roughness: 1 }),
  )
  crown.position.set(x, 0.88 * scale, z)
  crown.castShadow = true
  scene.add(crown)
}

export default function CampusScene(props: CampusSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const propsRef = useRef(props)
  const effectHandlerRef = useRef<(turn: TurnResult) => void>(() => undefined)
  propsRef.current = props

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#091310')
    scene.fog = new THREE.FogExp2('#091310', 0.022)
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    host.appendChild(renderer.domElement)

    const camera = new THREE.OrthographicCamera(-10, 10, 7, -7, 0.1, 100)
    let orbitAngle = 0.64
    let zoom = 1
    const placeCamera = () => {
      camera.position.set(Math.sin(orbitAngle) * 20, 14.5, Math.cos(orbitAngle) * 20)
      camera.lookAt(0, 0.3, 0)
      camera.zoom = zoom
      camera.updateProjectionMatrix()
    }
    placeCamera()

    scene.add(new THREE.HemisphereLight('#a6c7b4', '#14251e', 1.6))
    const sun = new THREE.DirectionalLight('#f5e8c8', 3.2)
    sun.position.set(-7, 14, 9)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.left = -12
    sun.shadow.camera.right = 12
    sun.shadow.camera.top = 12
    sun.shadow.camera.bottom = -12
    sun.shadow.bias = -0.0008
    scene.add(sun)
    const rim = new THREE.DirectionalLight('#68a68e', 1.2)
    rim.position.set(8, 5, -10)
    scene.add(rim)

    addBox(scene, [18, 0.45, 13], [0, -0.28, 0], '#15231f')
    addBox(scene, [17.5, 0.05, 12.5], [0, -0.025, 0], '#1a2b25')
    addBox(scene, [1.05, 0.035, 11.7], [0, 0.02, 0], '#35443b')
    addBox(scene, [16.8, 0.035, 0.9], [0, 0.025, 0.25], '#35443b')
    const grid = new THREE.GridHelper(22, 44, '#294239', '#20362e')
    grid.position.y = 0.005
    const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material]
    gridMaterials.forEach((material) => { material.transparent = true; material.opacity = 0.32 })
    scene.add(grid)

    const hq = addBuilding(scene, -4.3, -4.25, 5.1, 3.5, 2.6, '#30453e')
    addBox(hq, [1.15, 2.65, 0.08], [0.3, 1.35, 1.35], '#21352f')
    const hqSign = makeTextSprite('NORTHSTAR', translations[props.language].headquarters, '#b8ee76')
    hqSign.position.set(0, 4.25, 0)
    hqSign.scale.set(3.1, 0.86, 1)
    hq.add(hqSign)

    const factory = addBuilding(scene, 4.4, -4.15, 4.8, 2.15, 2.9, '#3b4139')
    addBox(factory, [0.48, 2.5, 0.48], [1.65, 2.25, -0.7], '#536057')
    addBox(factory, [0.62, 0.14, 0.62], [1.65, 3.5, -0.7], '#738074')
    for (let i = 0; i < 3; i += 1) {
      const panel = addBox(factory, [0.95, 0.07, 1.15], [-1.35 + i * 1.1, 2.35, 0], '#28546a', 0.25)
      panel.rotation.x = -0.18
    }
    const factorySign = makeTextSprite('GREEN OPS', translations[props.language].lowCarbon, '#76c7d9')
    factorySign.position.set(0, 3.25, 0)
    factory.add(factorySign)

    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(1.25, 1.4, 0.18, 48),
      new THREE.MeshStandardMaterial({ color: '#2c4036', roughness: 0.72 }),
    )
    hub.position.set(0, 0.1, 2.1)
    hub.receiveShadow = true
    scene.add(hub)
    const hubRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.08, 0.025, 8, 64),
      new THREE.MeshBasicMaterial({ color: '#b8ee76', transparent: true, opacity: 0.55 }),
    )
    hubRing.rotation.x = Math.PI / 2
    hubRing.position.set(0, 0.22, 2.1)
    scene.add(hubRing)
    const player = new THREE.Group()
    player.position.set(0, 0.18, 2.1)
    const playerBody = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 0.9, 8), new THREE.MeshStandardMaterial({ color: '#c8e5ae', roughness: 0.65 }))
    playerBody.position.y = 0.9
    playerBody.castShadow = true
    player.add(playerBody)
    const playerHead = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), new THREE.MeshStandardMaterial({ color: '#e0b998', roughness: 0.9 }))
    playerHead.position.y = 1.56
    playerHead.castShadow = true
    player.add(playerHead)
    scene.add(player)

    ;[[-7.4, -4.6], [-7.2, -1.8], [-7.35, 2.1], [-6.8, 4.8], [7.2, -4.5], [7.4, -1.4], [7.1, 2], [6.9, 4.8], [-1.8, 5.2], [2.1, 5.15]].forEach(([x, z], index) => addTree(scene, x, z, 0.8 + (index % 3) * 0.12))
    ;[-5.8, 5.8].forEach((x) => {
      addBox(scene, [0.07, 1.6, 0.07], [x, 0.8, 0.4], '#63726a')
      const light = new THREE.PointLight('#d8f4b0', 2.2, 4)
      light.position.set(x, 1.65, 0.4)
      scene.add(light)
      addBox(scene, [0.32, 0.08, 0.32], [x, 1.62, 0.4], '#b9d7a0')
    })

    const network = new THREE.Group()
    scene.add(network)
    const linePairs: [string, string][] = []
    PEOPLE.forEach((person) => person.links.forEach((linked) => {
      if (!linePairs.some(([a, b]) => (a === person.id && b === linked) || (a === linked && b === person.id))) linePairs.push([person.id, linked])
    }))
    linePairs.forEach(([from, to]) => {
      const a = PEOPLE.find((person) => person.id === from)!
      const b = PEOPLE.find((person) => person.id === to)!
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(a.position[0], 0.11, a.position[2]),
        new THREE.Vector3(b.position[0], 0.11, b.position[2]),
      ])
      const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: '#718d7e', transparent: true, opacity: 0.3 }))
      line.userData.people = [from, to]
      network.add(line)
    })

    const characters = new Map<string, THREE.Group>()
    const stageRings = new Map<string, THREE.MeshBasicMaterial>()
    const selectRings = new THREE.Group()
    scene.add(selectRings)
    const clickTargets: THREE.Object3D[] = []
    PEOPLE.forEach((person, index) => {
      const group = new THREE.Group()
      group.position.set(...person.position)
      group.userData.baseY = person.position[1]
      group.userData.index = index
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.56, 0.12, 32), new THREE.MeshStandardMaterial({ color: '#273a32', roughness: 0.75 }))
      base.position.y = 0.08
      base.receiveShadow = true
      group.add(base)
      const ringMaterial = new THREE.MeshBasicMaterial({ color: STAGE_COLORS.Unaware, transparent: true, opacity: 0.95 })
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.53, 0.045, 8, 48), ringMaterial)
      ring.rotation.x = Math.PI / 2
      ring.position.y = 0.17
      group.add(ring)
      stageRings.set(person.id, ringMaterial)
      const selection = new THREE.Mesh(new THREE.TorusGeometry(0.69, 0.022, 8, 48), new THREE.MeshBasicMaterial({ color: '#e3ffb5', transparent: true, opacity: 0.8 }))
      selection.rotation.x = Math.PI / 2
      selection.position.y = 0.14
      selection.userData.personId = person.id
      selectRings.add(selection)
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 0.78, 8), new THREE.MeshStandardMaterial({ color: person.color, roughness: 0.75 }))
      torso.position.y = 0.88
      torso.castShadow = true
      group.add(torso)
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 16, 12), new THREE.MeshStandardMaterial({ color: '#dfb495', roughness: 0.95 }))
      head.position.y = 1.47
      head.castShadow = true
      group.add(head)
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.236, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.48), new THREE.MeshStandardMaterial({ color: '#252723', roughness: 1 }))
      hair.position.y = 1.51
      group.add(hair)
      ;[-1, 1].forEach((side) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.09, 0.47, 8), new THREE.MeshStandardMaterial({ color: '#26332f', roughness: 0.9 }))
        leg.position.set(side * 0.13, 0.36, 0)
        leg.castShadow = true
        group.add(leg)
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.075, 0.64, 8), new THREE.MeshStandardMaterial({ color: person.color, roughness: 0.8 }))
        arm.position.set(side * 0.32, 0.9, 0)
        arm.rotation.z = side * -0.12
        group.add(arm)
      })
      const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.64, 2.4, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#b8ee76', transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }))
      beacon.position.y = 1.25
      beacon.userData.beacon = true
      group.add(beacon)
      const personText = getPersonText(person.id, props.language)
      const label = makeTextSprite(personText.role, personText.department, STAGE_COLORS.Aware)
      label.position.set(0, 2.15, 0)
      group.add(label)
      const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 2, 12), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }))
      hit.position.y = 1
      hit.userData.personId = person.id
      group.add(hit)
      clickTargets.push(hit)
      scene.add(group)
      characters.set(person.id, group)
    })

    const effects: AnimatedEffect[] = []
    effectHandlerRef.current = (turn) => {
      const target = characters.get(turn.personId)
      if (!target) return
      const floating = makeEffectText(`${translations[propsRef.current.language].supportGain} +${turn.supportDelta}`)
      floating.position.copy(target.position).add(new THREE.Vector3(0, 2.85, 0))
      scene.add(floating)
      effects.push({ object: floating, life: 2.1, maxLife: 2.1, velocity: new THREE.Vector3(0, 0.48, 0) })
      for (let index = 0; index < 22; index += 1) {
        const particle = new THREE.Mesh(new THREE.IcosahedronGeometry(0.035 + Math.random() * 0.035, 0), new THREE.MeshBasicMaterial({ color: index % 3 === 0 ? '#e9ffc8' : '#b8ee76', transparent: true }))
        particle.position.copy(target.position).add(new THREE.Vector3(0, 0.6 + Math.random(), 0))
        scene.add(particle)
        const angle = Math.random() * Math.PI * 2
        effects.push({ object: particle, life: 1.3 + Math.random() * 0.5, maxLife: 1.8, velocity: new THREE.Vector3(Math.cos(angle) * 0.7, 0.8 + Math.random(), Math.sin(angle) * 0.7) })
      }
    }

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    let pointerDown = { x: 0, y: 0 }
    let dragging = false
    const castPerson = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1)
      raycaster.setFromCamera(pointer, camera)
      return raycaster.intersectObjects(clickTargets, false)[0]?.object.userData.personId as string | undefined
    }
    const onPointerDown = (event: PointerEvent) => {
      pointerDown = { x: event.clientX, y: event.clientY }
      dragging = true
      renderer.domElement.setPointerCapture(event.pointerId)
    }
    const onPointerMove = (event: PointerEvent) => {
      if (dragging) {
        const delta = event.movementX
        if (Math.abs(event.clientX - pointerDown.x) + Math.abs(event.clientY - pointerDown.y) > 5) {
          orbitAngle -= delta * 0.006
          placeCamera()
        }
      } else {
        renderer.domElement.style.cursor = castPerson(event) ? 'pointer' : 'grab'
      }
    }
    const onPointerUp = (event: PointerEvent) => {
      const distance = Math.abs(event.clientX - pointerDown.x) + Math.abs(event.clientY - pointerDown.y)
      dragging = false
      if (distance < 6) {
        const id = castPerson(event)
        if (id) propsRef.current.onSelect(id)
      }
    }
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      zoom = THREE.MathUtils.clamp(zoom - event.deltaY * 0.0007, 0.72, 1.55)
      placeCamera()
    }
    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    renderer.domElement.addEventListener('pointermove', onPointerMove)
    renderer.domElement.addEventListener('pointerup', onPointerUp)
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false })

    const resize = () => {
      const width = host.clientWidth
      const height = host.clientHeight
      if (!width || !height) return
      renderer.setSize(width, height)
      const aspect = width / height
      const frustum = aspect < 1.1 ? 9.2 : 7.3
      camera.left = -frustum * aspect
      camera.right = frustum * aspect
      camera.top = frustum
      camera.bottom = -frustum
      camera.updateProjectionMatrix()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    resize()

    const clock = new THREE.Clock()
    let frame = 0
    const animate = () => {
      frame = requestAnimationFrame(animate)
      const delta = Math.min(clock.getDelta(), 0.04)
      const elapsed = clock.elapsedTime
      const current = propsRef.current
      network.visible = current.networkVisible
      characters.forEach((group, id) => {
        const person = current.state.stakeholders[id]
        group.position.y = group.userData.baseY + Math.sin(elapsed * 1.55 + group.userData.index) * 0.035
        stageRings.get(id)?.color.copy(stageColor(person.stage))
        const beacon = group.children.find((child) => child.userData.beacon)
        if (beacon) {
          beacon.visible = person.stage === 'Converted'
          beacon.rotation.y += delta * 0.3
        }
      })
      selectRings.children.forEach((ring) => {
        ring.visible = ring.userData.personId === current.selectedId
        if (ring.visible) {
          ring.position.set(characters.get(current.selectedId)?.position.x ?? 0, 0.14, characters.get(current.selectedId)?.position.z ?? 0)
          const pulse = 1 + Math.sin(elapsed * 3.5) * 0.07
          ring.scale.setScalar(pulse)
        }
      })
      network.children.forEach((line) => {
        const [a, b] = line.userData.people as [string, string]
        const active = current.state.stakeholders[a].stage === 'Converted' || current.state.stakeholders[b].stage === 'Converted'
        const selected = a === current.selectedId || b === current.selectedId
        const material = (line as THREE.Line).material as THREE.LineBasicMaterial
        material.color.set(active ? '#b8ee76' : selected ? '#79bfa4' : '#718d7e')
        material.opacity = active ? 0.72 : selected ? 0.5 : 0.2
      })
      hubRing.rotation.z += delta * 0.08
      for (let index = effects.length - 1; index >= 0; index -= 1) {
        const effect = effects[index]
        effect.life -= delta
        effect.object.position.addScaledVector(effect.velocity, delta)
        if (!effect.object.type.includes('Sprite')) effect.velocity.y -= delta * 1.2
        const material = (effect.object as THREE.Mesh).material as THREE.Material & { opacity?: number }
        if (material && 'opacity' in material) material.opacity = Math.max(0, effect.life / effect.maxLife)
        if (effect.life <= 0) {
          scene.remove(effect.object)
          effect.object.traverse((child) => {
            const mesh = child as THREE.Mesh
            mesh.geometry?.dispose()
            const mat = mesh.material as THREE.Material | THREE.Material[]
            if (Array.isArray(mat)) mat.forEach((item) => item.dispose())
            else mat?.dispose()
          })
          effects.splice(index, 1)
        }
      }
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer.domElement.removeEventListener('pointermove', onPointerMove)
      renderer.domElement.removeEventListener('pointerup', onPointerUp)
      renderer.domElement.removeEventListener('wheel', onWheel)
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh
        mesh.geometry?.dispose()
        const material = mesh.material as THREE.Material | THREE.Material[]
        if (Array.isArray(material)) material.forEach((item) => item.dispose())
        else material?.dispose()
      })
      renderer.dispose()
      renderer.domElement.remove()
      effectHandlerRef.current = () => undefined
    }
  }, [])

  useEffect(() => {
    if (props.lastTurn) effectHandlerRef.current(props.lastTurn)
  }, [props.lastTurn?.id])

  return <div className="campus-canvas" ref={hostRef} aria-label={translations[props.language].sceneAria} />
}
