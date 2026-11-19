import { useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowUpRight, Check, ChevronRight, CircleAlert, Coins, Eye, EyeOff,
  Handshake, Languages, Leaf, LockKeyhole, MessageCircle, MousePointer2, Network,
  Radio, RotateCcw, Rocket, Save, ShieldCheck, Sparkles, Target, Trophy, Users, X,
} from 'lucide-react'
import CampusScene from './components/CampusScene'
import { gameService } from './game/gameService'
import {
  ACTIONS, CONVERSION_GOAL, STAGE_COLORS, STAGE_THRESHOLDS, STAGES,
  getActionAvailability, getConvertedCount, getScore, hasConvertedAlly, previewAction, runTurn,
  type ActionDefinition, type TurnResult,
} from './game/engine'
import { fill, getActionText, getPersonText, getStageLabel, translations, type Language } from './i18n'
import './App.css'

const ACTION_ICONS = {
  dialogue: MessageCircle,
  workshop: Users,
  pilot: Rocket,
  endorsement: Handshake,
  roadshow: Radio,
}

function getInitialLanguage(): Language {
  try {
    return localStorage.getItem('northstar-esg-language') === 'en' ? 'en' : 'zh'
  } catch {
    return 'zh'
  }
}

function App() {
  const [game, setGame] = useState(gameService.load)
  const [language, setLanguage] = useState<Language>(getInitialLanguage)
  const [selectedId, setSelectedId] = useState('lin')
  const [selectedActionId, setSelectedActionId] = useState('dialogue')
  const [networkVisible, setNetworkVisible] = useState(true)
  const [profileOpen, setProfileOpen] = useState(false)
  const [flowStep, setFlowStep] = useState<1 | 2 | 3>(1)
  const [error, setError] = useState('')

  const t = translations[language]
  useEffect(() => gameService.save(game), [game])
  useEffect(() => {
    try { localStorage.setItem('northstar-esg-language', language) } catch { /* Storage is optional. */ }
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en'
    document.title = language === 'zh' ? 'NORTHSTAR · ESG 转型模拟器' : 'NORTHSTAR · ESG Transition Simulator'
  }, [language])

  const person = game.stakeholders[selectedId]
  const personText = getPersonText(selectedId, language)
  const selectedAction = ACTIONS.find((action) => action.id === selectedActionId) ?? ACTIONS[0]
  const selectedActionText = getActionText(selectedAction.id, language)
  const availability = getActionAvailability(game, selectedAction, person)
  const preview = previewAction(game, selectedId, selectedActionId)
  const converted = getConvertedCount(game)
  const lastTurn = game.history.at(-1)
  const nextThreshold = useMemo(() => STAGE_THRESHOLDS.find((value) => value > person.support) ?? 100, [person.support])

  const availabilityMessage = (result: ReturnType<typeof getActionAvailability>, action: ActionDefinition) => {
    if (result.code === 'ended') return t.ended
    if (result.code === 'converted') return t.alreadyConverted
    if (result.code === 'resources') return t.insufficientResources
    if (result.code === 'stage' && action.minStage) return fill(t.stageRequired, { stage: getStageLabel(action.minStage, language) })
    return ''
  }

  const previewNote = () => {
    if (selectedAction.id === 'endorsement') return hasConvertedAlly(game, selectedId) ? t.previewAlly : t.previewNoAlly
    if (selectedAction.id === 'roadshow') return t.previewRoadshow
    if (selectedAction.id === 'workshop') return t.previewWorkshop
    return selectedAction.id === 'pilot' ? t.previewPilot : t.previewDialogue
  }

  const turnText = (turn: TurnResult) => {
    const name = getPersonText(turn.personId, language).name
    const action = getActionText(turn.actionId, language)
    const stageImproved = STAGES.indexOf(turn.nextStage) > STAGES.indexOf(turn.previousStage)
    const title = turn.nextStage === 'Converted' && turn.previousStage !== 'Converted'
      ? `${name} ${t.becameAlly}`
      : stageImproved ? `${name} · ${getStageLabel(turn.nextStage, language)}` : `${action.name}${t.completed}`
    const details = [`${t.supportGain} +${turn.supportDelta}`]
    if (turn.actionId === 'workshop' || turn.actionId === 'pilot') {
      const names = game.stakeholders[turn.personId].links.map((id) => getPersonText(id, language).name).join(language === 'zh' ? '、' : ', ')
      details.push(`${names} ${t.alsoInspired}`)
    }
    if (turn.actionId === 'roadshow') details.push(t.networkBoost)
    return { title, detail: details.join(' · ') }
  }

  const selectPerson = (id: string) => {
    setSelectedId(id)
    setFlowStep(3)
    setProfileOpen(false)
    setError('')
  }

  const execute = () => {
    try {
      setError('')
      setGame((current) => runTurn(current, selectedId, selectedActionId))
      setFlowStep(1)
    } catch {
      setError(t.actionFailed)
    }
  }

  const restart = () => {
    setGame(gameService.reset())
    setSelectedId('lin')
    setSelectedActionId('dialogue')
    setFlowStep(1)
    setProfileOpen(false)
    setError('')
  }

  const lastTurnText = lastTurn ? turnText(lastTurn) : undefined

  return (
    <div className={`app-shell language-${language}`}>
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><Leaf size={20} strokeWidth={2.2} /></div>
          <div>
            <div className="brand-name">NORTHSTAR<span>®</span></div>
            <div className="brand-sub">ESG TRANSITION SIMULATOR</div>
          </div>
        </div>
        <div className="topbar-center"><span className="live-dot" /> TRANSITION OFFICE <span className="slash">/</span> 01</div>
        <div className="topbar-actions">
          <span className="save-state"><Save size={14} /> {t.save}</span>
          <button className="language-toggle" onClick={() => setLanguage((current) => current === 'zh' ? 'en' : 'zh')} title={t.switchLanguage} aria-label={t.switchLanguage}>
            <Languages size={15} /><span>{language === 'zh' ? 'EN' : '中文'}</span>
          </button>
          <button className="icon-button" onClick={restart} title={t.restart} aria-label={t.restart}><RotateCcw size={17} /></button>
        </div>
      </header>

      <section className="commandbar">
        <div className="mission-title">
          <span className="eyebrow">{t.missionEyebrow}</span>
          <h1>{t.missionTitle}<span>{t.fullStop}</span></h1>
        </div>
        <div className="week-display">
          <span>{t.currentWeek}</span>
          <strong>{String(game.week).padStart(2, '0')}<small> / {String(game.maxWeeks).padStart(2, '0')}</small></strong>
        </div>
        <div className="metric resource-metric">
          <div className="metric-label"><Coins size={15} /> {t.resources} <strong>{game.resources}</strong></div>
          <div className="metric-track"><i style={{ width: `${game.resources / 60 * 100}%` }} /></div>
        </div>
        <div className="metric">
          <div className="metric-label"><ShieldCheck size={15} /> {t.credibility} <strong>{game.credibility}</strong></div>
          <div className="metric-track credibility"><i style={{ width: `${game.credibility / 20 * 100}%` }} /></div>
        </div>
        <div className="metric">
          <div className="metric-label"><Activity size={15} /> {t.resistance} <strong>{game.resistance}</strong></div>
          <div className="metric-track resistance"><i style={{ width: `${game.resistance / 40 * 100}%` }} /></div>
        </div>
      </section>

      <main className="game-layout">
        {profileOpen && <button className="profile-backdrop" aria-label={t.closeProfile} onClick={() => setProfileOpen(false)} />}
        <aside className={`profile-panel panel ${profileOpen ? 'mobile-open' : ''}`}>
          <button className="profile-close" onClick={() => setProfileOpen(false)} aria-label={t.closeProfile}><X size={18} /></button>
          <div className="panel-heading"><span>{t.stakeholder}</span><span className="index">0{Object.keys(game.stakeholders).indexOf(selectedId) + 1} / 06</span></div>
          <div className="profile-identity">
            <div className="avatar" style={{ '--avatar-color': person.color } as React.CSSProperties}>
              <span>{person.initials}</span><i />
            </div>
            <div>
              <h2>{personText.role}</h2>
              <p>{personText.department}</p>
            </div>
          </div>
          <div className="stage-line">
            <span className="stage-pill" style={{ '--stage-color': STAGE_COLORS[person.stage] } as React.CSSProperties}><i />{getStageLabel(person.stage, language)}</span>
            <span>{personText.department}</span>
          </div>

          <div className="support-block">
            <div className="support-heading"><span>{t.support}</span><strong>{person.support}<small> / 100</small></strong></div>
            <div className="support-track">
              <i style={{ width: `${person.support}%`, background: STAGE_COLORS[person.stage] }} />
              {STAGE_THRESHOLDS.slice(1).map((threshold) => <b key={threshold} style={{ left: `${threshold}%` }} />)}
            </div>
            <div className="support-caption"><span>{person.stage === 'Converted' ? t.convertedCaption : fill(t.nextStage, { points: nextThreshold - person.support })}</span><span>{STAGES.indexOf(person.stage) + 1} / 5</span></div>
          </div>

          <div className="concern-block">
            <span className="eyebrow">{t.coreConcern}</span>
            <p>{personText.concern}</p>
            <blockquote>“{personText.quote}”</blockquote>
          </div>

          <div className="influence-row">
            <span>{t.influence}</span>
            <div>{Array.from({ length: 5 }, (_, index) => <i key={index} className={index < person.influence ? 'active' : ''} />)}</div>
            <strong>0{person.influence}</strong>
          </div>

          <div className="connections-block">
            <div className="section-label"><Network size={14} /> {t.connections}</div>
            <div className="connection-list">
              {person.links.map((id) => {
                const linked = game.stakeholders[id]
                const linkedText = getPersonText(id, language)
                return <button key={id} onClick={() => selectPerson(id)}>
                  <span className="mini-avatar" style={{ background: linked.color }}>{linked.initials}</span>
                  <span>{linkedText.role}<small>{linkedText.department}</small></span>
                  <i style={{ background: STAGE_COLORS[linked.stage] }} />
                </button>
              }) }
            </div>
          </div>

          <div className="objective-card">
            <div><Target size={17} /><span>{t.objective}</span><strong>{converted} / {CONVERSION_GOAL}</strong></div>
            <p>{t.objectiveText}</p>
            <div className="ally-dots">{Object.values(game.stakeholders).map((item) => <i key={item.id} className={item.stage === 'Converted' ? 'converted' : ''} />)}</div>
          </div>
        </aside>

        <section className="scene-panel">
          <CampusScene key={language} language={language} state={game} selectedId={selectedId} networkVisible={networkVisible} lastTurn={lastTurn} onSelect={selectPerson} />
          <div className="scene-topline">
            <div className="location-label"><span>01</span><div>{t.campus}<small>NORTHSTAR CAMPUS</small></div></div>
            <button className={`network-toggle ${networkVisible ? 'active' : ''}`} onClick={() => setNetworkVisible((visible) => !visible)}>
              {networkVisible ? <Eye size={14} /> : <EyeOff size={14} />} {t.network}
            </button>
          </div>
          <div className="scene-coordinate">N 31°14′ &nbsp; E 121°28′ <span>SIMULATION VIEW</span></div>
          <div className="scene-tip"><MousePointer2 size={13} /> {t.clickHelp} <span>·</span> {t.dragHelp} <span>·</span> {t.zoomHelp}</div>
          <div className="scene-legend">
            {STAGES.map((stage) => <span key={stage}><i style={{ background: STAGE_COLORS[stage] }} />{getStageLabel(stage, language)}</span>)}
          </div>
          {lastTurn && lastTurnText && <div className="turn-toast" key={`${lastTurn.id}-${language}`}>
            <div className="toast-icon"><Sparkles size={18} /></div>
            <div><strong>{lastTurnText.title}</strong><span>{lastTurnText.detail}</span></div>
            <small>W{String(lastTurn.week).padStart(2, '0')}</small>
          </div>}
        </section>

        <aside className="action-panel panel">
          <div className="panel-heading"><span>{t.actionDeck}</span><span className="index">{ACTIONS.length} {t.strategies}</span></div>
          <div className="turn-stepper">
            {[{ number: 1, label: t.stepAction }, { number: 2, label: t.stepPerson }, { number: 3, label: t.stepExecute }].map((step) => (
              <div key={step.number} className={`${flowStep === step.number ? 'active' : ''} ${flowStep > step.number ? 'done' : ''}`}>
                <span>{flowStep > step.number ? <Check size={11} /> : `0${step.number}`}</span><small>{step.label}</small>
              </div>
            ))}
          </div>
          <div className="action-list">
            {ACTIONS.map((action) => {
              const Icon = ACTION_ICONS[action.id as keyof typeof ACTION_ICONS]
              const actionCardReason = game.status !== 'playing' ? t.ended : game.resources < action.cost ? t.insufficientResources : ''
              const actionText = getActionText(action.id, language)
              const selected = selectedActionId === action.id
              return <button key={action.id} className={`action-card ${selected ? 'selected' : ''} ${actionCardReason ? 'unavailable' : ''}`} onClick={() => { setSelectedActionId(action.id); setFlowStep(2); setError('') }}>
                <div className="action-icon"><Icon size={18} /></div>
                <div className="action-copy"><div><strong>{actionText.name}</strong><span>{action.english}</span></div><p>{actionText.description}</p>{actionCardReason && <small><LockKeyhole size={11} />{actionCardReason}</small>}</div>
                <div className="action-cost"><Coins size={12} />{action.cost}</div>
                <i className="selected-marker">{selected && <Check size={11} />}</i>
              </button>
            })}
          </div>
          <div className="action-target"><span>{t.currentTarget}</span><strong>{personText.name}</strong><span className="target-stage" style={{ color: STAGE_COLORS[person.stage] }}>{getStageLabel(person.stage, language)}</span><button className="profile-open-button" onClick={() => setProfileOpen(true)}>{t.viewProfile}<ChevronRight size={13} /></button></div>
          <div className="execution-block">
            <div className="preview-line"><span>{previewNote()}</span><strong>{t.approximate} +{preview.support}</strong></div>
            {error && <div className="error-message"><CircleAlert size={13} />{error}</div>}
            {!error && (flowStep !== 3 || !availability.enabled) && <div className="availability-message"><LockKeyhole size={12} />{flowStep === 1 ? t.selectActionFirst : flowStep === 2 ? t.selectTargetNext : availabilityMessage(availability, selectedAction)}</div>}
            <button className="execute-button" disabled={flowStep !== 3 || !availability.enabled} onClick={execute}>
              <span>{fill(t.execute, { action: selectedActionText.name })}</span><span className="execute-cost"><Coins size={14} /> {selectedAction.cost}<ArrowUpRight size={17} /></span>
            </button>
            <div className="local-note"><span className="live-dot" /> {t.localSimulation} <span>·</span> {t.seed} {game.seed.toString(16).toUpperCase().slice(0, 8)}</div>
          </div>
        </aside>
      </main>

      <footer className="statusbar">
        <div><span className="live-dot" /> {t.simulationActive}</div>
        <div className="history-ticker">{lastTurn ? <><span>{t.recentAction}</span> W{String(lastTurn.week).padStart(2, '0')} · {getPersonText(lastTurn.personId, language).name} · {getActionText(lastTurn.actionId, language).name}</> : t.emptyHistory}</div>
        <div>BUILD 0.1 <span>{t.verticalSlice}</span></div>
      </footer>

      {game.status !== 'playing' && <div className="result-overlay">
        <div className="result-modal">
          <div className={`result-emblem ${game.status}`} >{game.status === 'won' ? <Trophy size={30} /> : <Activity size={30} />}</div>
          <span className="eyebrow">{t.report}</span>
          <h2>{game.status === 'won' ? t.wonTitle : t.lostTitle}</h2>
          <p>{game.status === 'won' ? t.wonText : t.lostText}</p>
          <div className="result-stats"><div><strong>{converted}</strong><span>{t.allies}</span></div><div><strong>{game.resources}</strong><span>{t.remainingResources}</span></div><div><strong>{getScore(game)}</strong><span>{t.score}</span></div></div>
          <button className="execute-button" onClick={restart}><RotateCcw size={16} /> {t.playAgain} <ArrowUpRight size={17} /></button>
        </div>
      </div>}
    </div>
  )
}

export default App
