export type Stage = 'Unaware' | 'Aware' | 'Interested' | 'Participated' | 'Converted'
export type GameStatus = 'playing' | 'won' | 'lost'

export interface PersonDefinition {
  id: string
  name: string
  initials: string
  role: string
  department: string
  concern: string
  quote: string
  color: string
  position: [number, number, number]
  influence: number
  initialSupport: number
  links: string[]
}

export interface Stakeholder extends PersonDefinition {
  support: number
  stage: Stage
}

export interface ActionDefinition {
  id: string
  name: string
  english: string
  description: string
  cost: number
  baseSupport: number
  minStage?: Stage
}

export interface TurnResult {
  id: number
  week: number
  personId: string
  actionId: string
  title: string
  detail: string
  supportDelta: number
  previousStage: Stage
  nextStage: Stage
  convertedCount: number
}

export interface GameState {
  version: 1
  seed: number
  rngSeed: number
  week: number
  maxWeeks: number
  resources: number
  credibility: number
  resistance: number
  stakeholders: Record<string, Stakeholder>
  history: TurnResult[]
  status: GameStatus
}

export const STAGES: Stage[] = ['Unaware', 'Aware', 'Interested', 'Participated', 'Converted']
export const STAGE_LABELS: Record<Stage, string> = {
  Unaware: '尚未了解',
  Aware: '已经知晓',
  Interested: '产生兴趣',
  Participated: '主动参与',
  Converted: '转型盟友',
}
export const STAGE_COLORS: Record<Stage, string> = {
  Unaware: '#71807c',
  Aware: '#58a6c7',
  Interested: '#e6bb62',
  Participated: '#aa8ce5',
  Converted: '#b8ee76',
}
export const STAGE_THRESHOLDS = [0, 20, 45, 70, 90]
export const CONVERSION_GOAL = 4

export const PEOPLE: PersonDefinition[] = [
  {
    id: 'lin', name: '可持续发展总监', initials: 'ESG', role: '可持续发展总监', department: '战略与 ESG',
    concern: '需要把愿景变成跨部门可执行的路线图。', quote: '别再给我一份报告，给我一个能开始的项目。',
    color: '#74b9a4', position: [-4.2, 0, 0.6], influence: 4, initialSupport: 38, links: ['zhou', 'han'],
  },
  {
    id: 'chen', name: '生产负责人', initials: 'OPS', role: '生产负责人', department: '制造中心',
    concern: '担心减排改造影响交付节奏与产线稳定。', quote: '先证明它不会让产线停下来。',
    color: '#c99369', position: [3.7, 0, 0.9], influence: 5, initialSupport: 18, links: ['zhao', 'sun'],
  },
  {
    id: 'zhou', name: '财务总监', initials: 'CFO', role: '财务总监', department: '财务管理',
    concern: '关注资本开支、回收周期和可量化的商业价值。', quote: '把长期价值讲清楚，也把短期账算明白。',
    color: '#7799c9', position: [-1.8, 0, -1.7], influence: 5, initialSupport: 28, links: ['lin', 'zhao'],
  },
  {
    id: 'han', name: '人力资源总监', initials: 'HR', role: '人力资源总监', department: '组织与人才',
    concern: '希望转型带来能力建设，而不是额外负担。', quote: '如果员工没有参与感，变革就只会停在墙上。',
    color: '#b18bc3', position: [1.25, 0, -1.45], influence: 3, initialSupport: 46, links: ['lin', 'sun'],
  },
  {
    id: 'zhao', name: '采购负责人', initials: 'SCM', role: '采购负责人', department: '供应链',
    concern: '缺少供应商数据，也担心绿色采购推高成本。', quote: '目标很好，但供应商要跟我们走在一起。',
    color: '#c2a661', position: [4.5, 0, 3.55], influence: 4, initialSupport: 12, links: ['chen', 'zhou'],
  },
  {
    id: 'sun', name: '员工代表', initials: 'ER', role: '员工代表', department: '员工委员会',
    concern: '关心转型是否公平，以及一线员工是否有发言权。', quote: '让一线参与进来，而不只是被通知。',
    color: '#c77e85', position: [-3.7, 0, 3.6], influence: 3, initialSupport: 24, links: ['chen', 'han'],
  },
]

export const ACTIONS: ActionDefinition[] = [
  { id: 'dialogue', name: '一对一沟通', english: 'LISTEN', description: '理解诉求，建立信任。稳定、低成本的推进方式。', cost: 4, baseSupport: 22 },
  { id: 'workshop', name: '共创工作坊', english: 'CO-CREATE', description: '邀请关系伙伴参与，目标与其关联人共同获益。', cost: 8, baseSupport: 30 },
  { id: 'pilot', name: '启动试点', english: 'PILOT', description: '用可见成果推动跃迁，需要对方先产生兴趣。', cost: 12, baseSupport: 40, minStage: 'Interested' },
  { id: 'endorsement', name: '盟友背书', english: 'MOBILIZE', description: '借助已转化盟友影响关系伙伴；没有盟友时效果有限。', cost: 6, baseSupport: 34 },
  { id: 'roadshow', name: '全员说明会', english: 'BROADCAST', description: '向整个网络传递愿景，但也会提高组织阻力。', cost: 10, baseSupport: 16 },
]

export function getStage(support: number): Stage {
  if (support >= 90) return 'Converted'
  if (support >= 70) return 'Participated'
  if (support >= 45) return 'Interested'
  if (support >= 20) return 'Aware'
  return 'Unaware'
}

export function createInitialGame(seed = 6011): GameState {
  const stakeholders = Object.fromEntries(PEOPLE.map((person) => [
    person.id,
    { ...person, support: person.initialSupport, stage: getStage(person.initialSupport) },
  ]))
  return {
    version: 1,
    seed,
    rngSeed: seed || 6011,
    week: 1,
    maxWeeks: 8,
    resources: 60,
    credibility: 6,
    resistance: 0,
    stakeholders,
    history: [],
    status: 'playing',
  }
}

function randomStep(seed: number) {
  let value = (seed + 0x6d2b79f5) >>> 0
  let t = value
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  const result = ((t ^ (t >>> 14)) >>> 0) / 4294967296
  return { seed: value, result }
}

export function getConvertedCount(state: GameState) {
  return Object.values(state.stakeholders).filter((person) => person.stage === 'Converted').length
}

export function getScore(state: GameState) {
  const people = Object.values(state.stakeholders)
  return Math.max(0,
    getConvertedCount(state) * 1000
    + people.filter((person) => person.stage === 'Participated').length * 150
    + state.resources * 12
    + state.credibility * 20
    - state.resistance * 5,
  )
}

export function hasConvertedAlly(state: GameState, personId: string) {
  const person = state.stakeholders[personId]
  return person.links.some((id) => state.stakeholders[id]?.stage === 'Converted')
}

export function getActionAvailability(state: GameState, action: ActionDefinition, person: Stakeholder) {
  if (state.status !== 'playing') return { enabled: false, code: 'ended' as const, reason: '本局已结束' }
  if (person.stage === 'Converted') return { enabled: false, code: 'converted' as const, reason: '已经是转型盟友' }
  if (state.resources < action.cost) return { enabled: false, code: 'resources' as const, reason: '资源不足' }
  if (action.minStage && STAGES.indexOf(person.stage) < STAGES.indexOf(action.minStage)) {
    return { enabled: false, code: 'stage' as const, reason: `需要先达到「${STAGE_LABELS[action.minStage]}」` }
  }
  return { enabled: true, code: 'ok' as const, reason: '' }
}

export function previewAction(state: GameState, personId: string, actionId: string) {
  const person = state.stakeholders[personId]
  const action = ACTIONS.find((item) => item.id === actionId)
  if (!person || !action) return { support: 0, note: '' }
  if (action.id === 'endorsement') {
    return hasConvertedAlly(state, personId)
      ? { support: action.baseSupport, note: '关联盟友将共同发声' }
      : { support: 12, note: '尚无关联盟友，效果降低' }
  }
  if (action.id === 'roadshow') return { support: action.baseSupport, note: '其他角色也会获得支持度' }
  if (action.id === 'workshop') return { support: action.baseSupport, note: '关联角色额外获得支持度' }
  return { support: action.baseSupport, note: action.id === 'pilot' ? '高影响，也会略微增加阻力' : '建立信任并提升公信力' }
}

export function runTurn(current: GameState, personId: string, actionId: string): GameState {
  const state: GameState = {
    ...current,
    stakeholders: Object.fromEntries(Object.entries(current.stakeholders).map(([id, person]) => [id, { ...person, links: [...person.links] }])),
    history: [...current.history],
  }
  const person = state.stakeholders[personId]
  const action = ACTIONS.find((item) => item.id === actionId)
  if (!person || !action) throw new Error('无效的人物或行动')
  const availability = getActionAvailability(state, action, person)
  if (!availability.enabled) throw new Error(availability.reason)

  const random = randomStep(state.rngSeed)
  state.rngSeed = random.seed
  const variance = Math.floor(random.result * 5) - 2
  const previousStage = person.stage
  let supportDelta = action.baseSupport
  if (action.id === 'endorsement' && !hasConvertedAlly(state, personId)) supportDelta = 12
  supportDelta = Math.max(1, supportDelta + variance + Math.floor((state.credibility - 6) / 3) - Math.floor(state.resistance / 12))

  const before = person.support
  person.support = Math.min(100, person.support + supportDelta)
  supportDelta = person.support - before
  const linkedGains: string[] = []

  if (action.id === 'workshop' || action.id === 'pilot') {
    const bonus = action.id === 'pilot' ? 10 : 6
    person.links.forEach((id) => {
      const ally = state.stakeholders[id]
      if (ally && ally.stage !== 'Converted') {
        ally.support = Math.min(100, ally.support + bonus)
        ally.stage = getStage(ally.support)
        linkedGains.push(ally.name)
      }
    })
  }
  if (action.id === 'roadshow') {
    Object.values(state.stakeholders).forEach((other) => {
      if (other.id !== personId && other.stage !== 'Converted') {
        other.support = Math.min(100, other.support + 8)
        other.stage = getStage(other.support)
      }
    })
  }

  person.stage = getStage(person.support)
  state.resources -= action.cost
  state.credibility = Math.min(20, state.credibility + (action.id === 'pilot' ? 2 : action.id === 'endorsement' || action.id === 'roadshow' ? 0 : 1))
  state.resistance = Math.max(0, Math.min(40, state.resistance + (action.id === 'roadshow' ? 3 : action.id === 'pilot' ? 2 : action.id === 'workshop' ? -2 : action.id === 'endorsement' ? -1 : 0)))

  const convertedCount = getConvertedCount(state)
  const stageImproved = STAGES.indexOf(person.stage) > STAGES.indexOf(previousStage)
  const title = person.stage === 'Converted' && previousStage !== 'Converted'
    ? `${person.name} 成为了转型盟友`
    : stageImproved ? `${person.name} · ${STAGE_LABELS[person.stage]}` : `${action.name}已完成`
  const details = [`支持度 +${supportDelta}`]
  if (linkedGains.length) details.push(`${linkedGains.join('、')}也受到带动`)
  if (action.id === 'roadshow') details.push('全体网络支持度提升')
  const result: TurnResult = {
    id: state.history.length + 1,
    week: state.week,
    personId,
    actionId,
    title,
    detail: details.join(' · '),
    supportDelta,
    previousStage,
    nextStage: person.stage,
    convertedCount,
  }
  state.history.push(result)

  if (convertedCount >= CONVERSION_GOAL) state.status = 'won'
  else if (state.week >= state.maxWeeks || state.resources < 4) state.status = 'lost'
  else state.week += 1
  return state
}
