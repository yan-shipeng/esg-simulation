import { ACTIONS, PEOPLE, STAGE_LABELS, type Stage } from './game/engine'

export type Language = 'zh' | 'en'

export interface PersonText {
  name: string
  role: string
  department: string
  concern: string
  quote: string
}

export interface ActionText {
  name: string
  description: string
}

const zh = {
  save: '已保存至此设备',
  restart: '重新开始',
  switchLanguage: 'Switch to English',
  missionEyebrow: '未来 8 周',
  missionTitle: '让转型，从共识开始',
  fullStop: '。',
  currentWeek: '当前周次',
  resources: '行动资源',
  credibility: '公信力',
  resistance: '组织阻力',
  stakeholder: '利益相关者',
  support: '支持度',
  convertedCaption: '已成为坚定的转型盟友',
  nextStage: '距下一阶段还需 {points} 点',
  coreConcern: '核心诉求',
  influence: '组织影响力',
  connections: '关键关系',
  objective: '本局目标',
  objectiveText: '在 8 周内争取 4 位关键盟友',
  headquarters: '集团总部',
  lowCarbon: '低碳制造中心',
  campus: '集团总部园区',
  network: '关系网络',
  clickHelp: '点击角色查看诉求',
  dragHelp: '拖动旋转',
  zoomHelp: '滚轮缩放',
  sceneAria: '可交互的三维总部园区',
  strategies: '可用策略',
  actionDeck: '行动策略',
  yourMove: '你的回合',
  actionTitle: '推动一次真实改变',
  actionSubtitle: '每个行动消耗 1 周，谨慎分配资源。',
  stepPerson: '选择职位',
  stepAction: '选择行动',
  stepExecute: '执行行动',
  selectActionFirst: '请先选择一项行动',
  selectTargetNext: '请在园区中选择目标职位',
  viewProfile: '诉求',
  closeProfile: '关闭人物档案',
  currentTarget: '当前对象',
  approximate: '约',
  execute: '执行「{action}」',
  localSimulation: '本地单机模拟',
  seed: '种子',
  recentAction: '最近行动',
  emptyHistory: '选择一位利益相关者，开始你的第一步。',
  supportGain: '支持度',
  becameAlly: '成为了转型盟友',
  completed: '已完成',
  alsoInspired: '也受到带动',
  networkBoost: '全体网络支持度提升',
  actionFailed: '行动无法执行',
  ended: '本局已结束',
  alreadyConverted: '已经是转型盟友',
  insufficientResources: '资源不足',
  stageRequired: '需要先达到「{stage}」',
  previewAlly: '关联盟友将共同发声',
  previewNoAlly: '尚无关联盟友，效果降低',
  previewRoadshow: '其他角色也会获得支持度',
  previewWorkshop: '关联角色额外获得支持度',
  previewPilot: '高影响，也会略微增加阻力',
  previewDialogue: '建立信任并提升公信力',
  report: '转型报告',
  wonTitle: '转型联盟，已经形成。',
  lostTitle: '窗口期，暂时关闭。',
  wonText: '你把分散的意愿变成了共同的行动。真正的转型，现在才开始。',
  lostText: '共识尚未跨越临界点。调整行动顺序，更早利用关系网络，再试一次。',
  allies: '转型盟友',
  remainingResources: '剩余资源',
  score: '本局得分',
  playAgain: '开始新的一局',
  simulationActive: '模拟进行中',
  verticalSlice: '垂直切片',
}

export type Copy = typeof zh

const en: Copy = {
  save: 'Saved on this device',
  restart: 'Restart game',
  switchLanguage: '切换到中文',
  missionEyebrow: 'THE NEXT 8 WEEKS',
  missionTitle: 'Transformation starts with consensus',
  fullStop: '.',
  currentWeek: 'Current week',
  resources: 'Action resources',
  credibility: 'Credibility',
  resistance: 'Resistance',
  stakeholder: 'STAKEHOLDER',
  support: 'Support',
  convertedCaption: 'A committed transition ally',
  nextStage: '{points} points to the next stage',
  coreConcern: 'CORE CONCERN',
  influence: 'Organizational influence',
  connections: 'Key relationships',
  objective: 'Your objective',
  objectiveText: 'Win 4 key allies within 8 weeks',
  headquarters: 'Group Headquarters',
  lowCarbon: 'Low-Carbon Manufacturing',
  campus: 'Group Headquarters',
  network: 'Relationships',
  clickHelp: 'Click a person to view concerns',
  dragHelp: 'Drag to rotate',
  zoomHelp: 'Scroll to zoom',
  sceneAria: 'Interactive 3D headquarters campus',
  strategies: 'strategies',
  actionDeck: 'ACTION DECK',
  yourMove: 'YOUR MOVE',
  actionTitle: 'Make a real change',
  actionSubtitle: 'Every action takes 1 week. Spend resources wisely.',
  stepPerson: 'Select role',
  stepAction: 'Choose action',
  stepExecute: 'Execute',
  selectActionFirst: 'Choose an action first',
  selectTargetNext: 'Select a target role in the campus',
  viewProfile: 'Concerns',
  closeProfile: 'Close stakeholder profile',
  currentTarget: 'Target',
  approximate: 'Approx.',
  execute: 'Run “{action}”',
  localSimulation: 'Local single-player simulation',
  seed: 'Seed',
  recentAction: 'Latest action',
  emptyHistory: 'Select a stakeholder and make your first move.',
  supportGain: 'Support',
  becameAlly: 'became a transition ally',
  completed: ' completed',
  alsoInspired: 'also gained support',
  networkBoost: 'Support increased across the network',
  actionFailed: 'This action could not be completed',
  ended: 'This game has ended',
  alreadyConverted: 'Already a transition ally',
  insufficientResources: 'Insufficient resources',
  stageRequired: 'Requires “{stage}” first',
  previewAlly: 'A connected ally will add their voice',
  previewNoAlly: 'No connected ally yet; reduced effect',
  previewRoadshow: 'Everyone else also gains support',
  previewWorkshop: 'Connected people gain bonus support',
  previewPilot: 'High impact, with a slight increase in resistance',
  previewDialogue: 'Build trust and credibility',
  report: 'TRANSITION REPORT',
  wonTitle: 'Your transition coalition is here.',
  lostTitle: 'The window has closed—for now.',
  wonText: 'You turned scattered intent into collective action. The real transition starts now.',
  lostText: 'Consensus has not crossed the tipping point. Change your sequence, use the network earlier, and try again.',
  allies: 'Transition allies',
  remainingResources: 'Resources left',
  score: 'Final score',
  playAgain: 'Start a new game',
  simulationActive: 'SIMULATION ACTIVE',
  verticalSlice: 'VERTICAL SLICE',
}

export const translations: Record<Language, Copy> = { zh, en }

export const STAGE_LABELS_EN: Record<Stage, string> = {
  Unaware: 'Unaware',
  Aware: 'Aware',
  Interested: 'Interested',
  Participated: 'Participated',
  Converted: 'Converted ally',
}

export function getStageLabel(stage: Stage, language: Language) {
  return language === 'zh' ? STAGE_LABELS[stage] : STAGE_LABELS_EN[stage]
}

const EN_PEOPLE: Record<string, PersonText> = {
  lin: {
    name: 'Sustainability Director', role: 'Sustainability Director', department: 'Strategy & ESG',
    concern: 'Needs a vision that can become an actionable, cross-functional roadmap.',
    quote: 'Don’t give me another report. Give me a project we can start.',
  },
  chen: {
    name: 'Head of Production', role: 'Head of Production', department: 'Manufacturing',
    concern: 'Worries that decarbonization will disrupt delivery and destabilize the line.',
    quote: 'Show me it won’t stop the production line.',
  },
  zhou: {
    name: 'Chief Financial Officer', role: 'Chief Financial Officer', department: 'Finance',
    concern: 'Focused on capital expenditure, payback periods, and measurable business value.',
    quote: 'Make the long-term value clear, and the short-term numbers add up.',
  },
  han: {
    name: 'Human Resources Director', role: 'Human Resources Director', department: 'People & Organization',
    concern: 'Wants the transition to build capability rather than create extra burdens.',
    quote: 'Without employee ownership, change will never move beyond the poster on the wall.',
  },
  zhao: {
    name: 'Head of Procurement', role: 'Head of Procurement', department: 'Supply Chain',
    concern: 'Lacks supplier data and worries that sustainable sourcing will raise costs.',
    quote: 'The goal is great, but our suppliers need to come with us.',
  },
  sun: {
    name: 'Employee Representative', role: 'Employee Representative', department: 'Employee Committee',
    concern: 'Cares about a just transition and whether frontline employees have a voice.',
    quote: 'Involve the frontline in the change; don’t just inform them afterward.',
  },
}

const EN_ACTIONS: Record<string, ActionText> = {
  dialogue: { name: '1:1 Dialogue', description: 'Understand concerns and build trust. A steady, low-cost way forward.' },
  workshop: { name: 'Co-creation Workshop', description: 'Bring relationship partners in, creating value for the target and their connections.' },
  pilot: { name: 'Launch a Pilot', description: 'Use visible results to drive a breakthrough. Requires genuine interest first.' },
  endorsement: { name: 'Ally Endorsement', description: 'Let converted allies influence their connections. Much weaker without an ally.' },
  roadshow: { name: 'Company Town Hall', description: 'Share the vision across the network, but increase organizational resistance.' },
}

export function getPersonText(id: string, language: Language): PersonText {
  const person = PEOPLE.find((item) => item.id === id) ?? PEOPLE[0]
  if (language === 'en' && EN_PEOPLE[id]) return EN_PEOPLE[id]
  return { name: person.name, role: person.role, department: person.department, concern: person.concern, quote: person.quote }
}

export function getActionText(id: string, language: Language): ActionText {
  const action = ACTIONS.find((item) => item.id === id) ?? ACTIONS[0]
  if (language === 'en' && EN_ACTIONS[id]) return EN_ACTIONS[id]
  return { name: action.name, description: action.description }
}

export function fill(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce((text, [key, value]) => text.replace(`{${key}}`, String(value)), template)
}
