import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, BookOpen, Check, ChevronRight, CirclePlus, Copy, Download, FileText, KeyRound, LoaderCircle, RefreshCw, Settings2, Sparkles, Trash2, UploadCloud, WandSparkles } from 'lucide-react'
import openaiLogo from '@lobehub/icons-static-svg/icons/openai.svg'
import geminiLogo from '@lobehub/icons-static-svg/icons/gemini-color.svg'
import anthropicLogo from '@lobehub/icons-static-svg/icons/anthropic.svg'
import deepseekLogo from '@lobehub/icons-static-svg/icons/deepseek-color.svg'
import { consumeSse, encryptKey, getModels, getPresets, loadLocalPresets, loadPreparation, loadSettings, providerIds, providerNames, saveLocalPresets, savePreparation, saveSettings } from './api'
import type { AiModel, Language, Phase, Preparation, Preset, ProviderId, Settings, Variant } from './api'
import { translations } from './i18n'
import './App.css'

type Tab = 'prepare' | 'presets' | 'settings' | 'results'
const logos: Record<ProviderId, string> = { openai: openaiLogo, gemini: geminiLogo, anthropic: anthropicLogo, deepseek: deepseekLogo }
const blankPreset = (): Preset => ({ id: crypto.randomUUID(), name: '', description: '', isDefault: false, phases: [{ name: '', durationMinutes: 5, order: 1 }] })
const classChoices = [
  { value: 'Kindergarten 1', en: 'Kindergarten 1', ar: 'الروضة الأولى' },
  { value: 'Kindergarten 2', en: 'Kindergarten 2', ar: 'الروضة الثانية' },
  { value: 'Kindergarten 3', en: 'Kindergarten 3', ar: 'الروضة الثالثة' },
  ...Array.from({ length: 12 }, (_, index) => ({ value: `Grade ${index + 1}`, en: `Grade ${index + 1}`, ar: `الصف ${index + 1}` })),
]

function App() {
  const [tab, setTab] = useState<Tab>('prepare')
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [serverPresets, setServerPresets] = useState<Preset[]>([])
  const [localPresets, setLocalPresets] = useState<Preset[]>(loadLocalPresets)
  const [selectedPresetId, setSelectedPresetId] = useState('')
  const [draftPreset, setDraftPreset] = useState<Preset | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [className, setClassName] = useState('')
  const [duration, setDuration] = useState(45)
  const [sourceLanguage, setSourceLanguage] = useState<Language>('en')
  const [variantCount, setVariantCount] = useState(3)
  const [keyInput, setKeyInput] = useState('')
  const [models, setModels] = useState<AiModel[]>([])
  const [modelLoading, setModelLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const requestController = useRef<AbortController | null>(null)
  const [stage, setStage] = useState('')
  const [liveDraft, setLiveDraft] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [preparation, setPreparation] = useState<Preparation | null>(loadPreparation)
  const preparationRef = useRef(preparation)
  const [activeVariantId, setActiveVariantId] = useState('')
  const t = translations(settings.displayLanguage)
  const allPresets = useMemo(() => [...serverPresets, ...localPresets], [serverPresets, localPresets])
  const selectedPreset = allPresets.find(x => x.id === selectedPresetId)
  const phaseTotal = selectedPreset?.phases.reduce((sum, x) => sum + Number(x.durationMinutes || 0), 0) || 0
  const latestRound = preparation?.variants.length ? Math.max(...preparation.variants.map(x => x.generationRound)) : 0
  const currentVariants = preparation?.variants.filter(x => x.generationRound === latestRound) || []
  const activeVariant = currentVariants.find(x => x.id === activeVariantId) || currentVariants[0]

  function exportSelectedPdf() {
    if (!activeVariant) return
    const originalTitle = document.title
    document.title = activeVariant.lesson.title.replace(/[\\/:*?"<>|]/g, '-').trim().slice(0, 100) || 'lesson-plan'
    const restoreTitle = () => { document.title = originalTitle }
    window.addEventListener('afterprint', restoreTitle, { once: true })
    window.print()
  }

  function updateSettings(next: Settings) { setSettings(next); saveSettings(next) }
  function updateLocalPresets(next: Preset[]) { setLocalPresets(next); saveLocalPresets(next) }
  function updatePreparation(next: Preparation) { preparationRef.current = next; setPreparation(next); savePreparation(next) }

  useEffect(() => {
    getPresets().then(list => { setServerPresets(list); setSelectedPresetId(current => current || list[0]?.id || '') }).catch(cause => setError(cause.message))
  }, [])

  useEffect(() => {
    if (tab !== 'settings') return
    const credential = settings.keys[settings.provider]
    if (!credential) { setModels([]); return }
    let active = true
    setModelLoading(true)
    getModels(settings.provider, credential).then(list => {
      if (!active) return
      setModels(list)
      const chosen = settings.models[settings.provider]
      if (chosen && !list.some(x => x.id === chosen)) {
        updateSettings({ ...settings, models: { ...settings.models, [settings.provider]: '' } })
        setNotice(t.unavailableModel)
      }
    }).catch(cause => { if (active) { setModels([]); setError(cause.message) } })
      .finally(() => { if (active) setModelLoading(false) })
    return () => { active = false }
  }, [tab, settings.provider, settings.keys])

  async function refreshModels() {
    const credential = settings.keys[settings.provider]
    if (!credential) return
    setError(''); setModelLoading(true)
    try {
      const list = await getModels(settings.provider, credential)
      setModels(list)
      const chosen = settings.models[settings.provider]
      if (chosen && !list.some(x => x.id === chosen)) updateSettings({ ...settings, models: { ...settings.models, [settings.provider]: '' } })
    } catch (cause) { setError((cause as Error).message) }
    finally { setModelLoading(false) }
  }

  async function saveKey() {
    if (!keyInput.trim()) return
    setError(''); setNotice('')
    try {
      const encrypted = await encryptKey(keyInput.trim())
      updateSettings({ ...settings, keys: { ...settings.keys, [settings.provider]: encrypted }, models: { ...settings.models, [settings.provider]: '' } })
      setKeyInput(''); setNotice(t.keySaved)
    } catch (cause) { setError((cause as Error).message) }
  }

  function duplicate(preset: Preset) {
    const copy = { ...preset, id: crypto.randomUUID(), isDefault: false, name: `${preset.name} copy`, phases: preset.phases.map(x => ({ ...x })) }
    updateLocalPresets([...localPresets, copy]); setDraftPreset(copy); setSelectedPresetId(copy.id); setTab('presets')
  }
  function savePreset() {
    if (!draftPreset || !draftPreset.name.trim() || !draftPreset.phases.length || draftPreset.phases.some(x => !x.name.trim() || x.durationMinutes <= 0)) { setError(t.invalidFlow); return }
    const saved = { ...draftPreset, name: draftPreset.name.trim(), phases: draftPreset.phases.map((x, index) => ({ ...x, name: x.name.trim(), order: index + 1 })) }
    updateLocalPresets(localPresets.some(x => x.id === saved.id) ? localPresets.map(x => x.id === saved.id ? saved : x) : [...localPresets, saved])
    setSelectedPresetId(saved.id); setDraftPreset(null); setNotice(t.created); setError('')
  }
  function editPhase(index: number, update: Partial<Phase>) {
    if (draftPreset) setDraftPreset({ ...draftPreset, phases: draftPreset.phases.map((phase, i) => i === index ? { ...phase, ...update } : phase) })
  }
  function movePhase(index: number, direction: -1 | 1) {
    if (!draftPreset) return
    const next = [...draftPreset.phases], destination = index + direction
    if (destination < 0 || destination >= next.length) return
    ;[next[index], next[destination]] = [next[destination], next[index]]
    setDraftPreset({ ...draftPreset, phases: next })
  }

  function handleEvent(event: string, data: any) {
    if (event === 'status') { setStage(data.stage); if (data.stage === 'retry') setLiveDraft('') }
    if (event === 'preparation') {
      updatePreparation({ ...(data as Omit<Preparation, 'variants'>), variants: [] })
    }
    if (event === 'source_prepared' && preparationRef.current)
      updatePreparation({ ...preparationRef.current, preparedSourceText: data.preparedSourceText })
    if (event === 'text_delta') setLiveDraft(previous => (previous + data.text).slice(-12000))
    if (event === 'variant_ready') {
      const variant = data as Variant
      if (preparationRef.current) updatePreparation({ ...preparationRef.current,
        variants: [...preparationRef.current.variants.filter(x => x.generationRound === variant.generationRound), variant] })
      setActiveVariantId(variant.id); setLiveDraft('')
    }
    if (event === 'complete') { setStage('complete'); setLiveDraft('') }
  }

  async function generate() {
    setError(''); setNotice('')
    if (!files.length) { setError(t.noFiles); return }
    if (!className) { setError(settings.displayLanguage === 'ar' ? 'اختر صفًا.' : 'Select a class.'); return }
    if (!selectedPreset) { setError(t.noSelection); return }
    if (phaseTotal !== duration) { setError(t.mismatch); return }
    const credential = settings.keys[settings.provider], model = settings.models[settings.provider]
    if (!credential || !model) { setError(t.providerNeeded); setTab('settings'); return }
    const form = new FormData()
    files.forEach(file => form.append('files', file))
    form.append('className', className); form.append('totalDurationMinutes', String(duration))
    form.append('sourceLanguage', sourceLanguage); form.append('variantCount', String(variantCount))
    form.append('provider', settings.provider); form.append('model', model)
    form.append('encryptedCredential', JSON.stringify(credential))
    if (selectedPreset.isDefault) form.append('lessonFlowPresetId', selectedPreset.id)
    else form.append('customPhases', JSON.stringify(selectedPreset.phases))
    const controller = new AbortController()
    requestController.current = controller
    setBusy(true); setStage('extracting'); setLiveDraft(''); preparationRef.current = null; setPreparation(null); setTab('results')
    try { await consumeSse(await fetch('/api/lesson-preparations/generate', { method: 'POST', body: form, signal: controller.signal }), handleEvent) }
    catch (cause) { setLiveDraft(''); if (!controller.signal.aborted) setError((cause as Error).message) }
    finally { requestController.current = null; setBusy(false) }
  }

  async function regenerate() {
    if (!preparation || busy) return
    const credential = settings.keys[settings.provider], model = settings.models[settings.provider]
    if (!credential || !model) { setError(t.providerNeeded); setTab('settings'); return }
    const controller = new AbortController()
    requestController.current = controller
    setError(''); setBusy(true); setStage('generating'); setLiveDraft('')
    try {
      const response = await fetch('/api/lesson-preparations/regenerate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ variantCount, generationRound: latestRound + 1, provider: settings.provider, model,
          encryptedCredential: credential, snapshot: {
            preparationId: preparation.preparationId, className: preparation.className,
            totalDurationMinutes: preparation.totalDurationMinutes, sourceLanguage: preparation.sourceLanguage,
            phases: preparation.phases, sourceText: preparation.sourceText, preparedSourceText: preparation.preparedSourceText
          } })
      })
      await consumeSse(response, handleEvent)
    } catch (cause) { setLiveDraft(''); if (!controller.signal.aborted) setError((cause as Error).message) }
    finally { requestController.current = null; setBusy(false) }
  }

  return <div className="app-shell" dir={settings.displayLanguage === 'ar' ? 'rtl' : 'ltr'}>
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><BookOpen size={22} strokeWidth={2.3} /></div><div><strong>{t.app}</strong><span>{t.subtitle}</span></div></div>
      <div className="nav-caption">{t.workspace}</div>
      <nav aria-label="Main navigation">{([['prepare', WandSparkles, t.prepare], ['presets', BookOpen, t.presets], ['results', FileText, t.results], ['settings', Settings2, t.settings]] as const).map(([id, Icon, label]) =>
        <button className={`nav-item ${tab === id ? 'active' : ''}`} key={id} onClick={() => { setTab(id); setError(''); setNotice('') }}><Icon size={19} /><span>{label}</span>{id === 'results' && currentVariants.length > 0 && <b>{currentVariants.length}</b>}</button>)}</nav>
      <div className="sidebar-footer"><div className="footer-spark"><Sparkles size={18} /></div><p>{t.sidebarFooter}</p></div>
    </aside>

    <main className="main-content">
      <header className="topbar"><span>{tab === 'prepare' ? t.prepare : tab === 'presets' ? t.presets : tab === 'settings' ? t.settings : t.results}</span><div className="topbar-right"><span className="provider-pill"><img src={logos[settings.provider]} alt="" />{providerNames[settings.provider]}</span><span className="avatar">T</span></div></header>
      {error && <div className="alert error" role="alert">{error}<button onClick={() => setError('')}>×</button></div>}
      {notice && <div className="alert success" role="status">{notice}<button onClick={() => setNotice('')}>×</button></div>}

      {tab === 'prepare' && <>
        <section className="hero"><div><span className="eyebrow"><Sparkles size={13} /> {t.heroEyebrow}</span><h1>{t.heroTitle}</h1><p>{t.heroBody}</p></div><div className="hero-art"><div className="art-card art-back"></div><div className="art-card art-front"><div></div><div></div><div></div><div></div></div><span className="art-star star-one">✦</span><span className="art-star star-two">✦</span></div></section>
        <div className="section-head"><div><h2>{t.prepare}</h2><p>{t.prepareHelp}</p></div><span className="step-label">01 / 04</span></div>
        <div className="form-grid">
          <section className="panel wide"><div className="panel-heading"><div className="panel-icon peach"><UploadCloud size={20} /></div><div><h3>{t.material}</h3><p>{t.materialHelp}</p></div></div><label className="upload-zone"><input type="file" multiple accept=".pdf,.txt,.csv,application/pdf,text/plain,text/csv" onChange={event => setFiles(Array.from(event.target.files || []))} /><UploadCloud size={25} /><strong>{t.chooseFiles}</strong><span>{files.length ? files.map(x => x.name).join(' · ') : t.materialHelp}</span></label></section>
          <section className="panel"><div className="panel-heading"><div className="panel-icon lavender"><BookOpen size={20} /></div><div><h3>{t.classInfo}</h3><p>{t.classHelp}</p></div></div><div className="field-row"><label>{t.className}<select value={className} onChange={event => setClassName(event.target.value)} required><option value="">{settings.displayLanguage === 'ar' ? 'اختر صفًا' : 'Select a class'}</option>{classChoices.map(choice => <option key={choice.value} value={choice.value}>{settings.displayLanguage === 'ar' ? choice.ar : choice.en}</option>)}</select></label><label>{t.duration}<div className="number-wrap"><input type="number" min="10" max="240" value={duration} onChange={event => setDuration(Number(event.target.value))} /><span>{t.minutes}</span></div></label></div><label className="field-label">{t.sourceLanguage}<select value={sourceLanguage} onChange={event => setSourceLanguage(event.target.value as Language)}><option value="en">{t.english}</option><option value="ar">{t.arabic}</option><option value="fr">{settings.displayLanguage === 'ar' ? 'الفرنسية' : 'French'}</option></select></label></section>
          <section className="panel"><div className="panel-heading"><div className="panel-icon mint"><Sparkles size={20} /></div><div><h3>{t.alternatives}</h3><p>{t.alternativesHelp}</p></div></div><div className="segmented">{[1, 2, 3].map(number => <button key={number} className={variantCount === number ? 'selected' : ''} onClick={() => setVariantCount(number)}>{number}</button>)}</div><p className="subtle-info">{providerNames[settings.provider]} · {settings.models[settings.provider] || t.selectModel}</p></section>
          <section className="panel wide"><div className="panel-heading"><div className="panel-icon butter"><RefreshCw size={20} /></div><div><h3>{t.flow}</h3><p>{t.flowHelp}</p></div></div><div className="flow-selector"><select value={selectedPresetId} onChange={event => setSelectedPresetId(event.target.value)}>{allPresets.map(preset => <option value={preset.id} key={preset.id}>{preset.name}</option>)}</select><button className="text-button" onClick={() => setTab('presets')}>{t.edit} <ChevronRight size={16} /></button></div><div className="phase-preview">{selectedPreset?.phases.map((phase, index) => <div className="phase-chip" key={`${phase.order}-${index}`}><span className="phase-index">{String(index + 1).padStart(2, '0')}</span><strong>{phase.name}</strong><span>{phase.durationMinutes} {t.minutes}</span></div>)}</div><div className={`flow-total ${phaseTotal !== duration ? 'invalid' : ''}`}><span>{t.total}</span><strong>{phaseTotal} / {duration} {t.minutes}</strong></div>{phaseTotal !== duration && <p className="validation-text">{t.mismatch}</p>}</section>
        </div><div className="action-row"><button className="primary-button" disabled={busy || !className || !selectedPreset || phaseTotal !== duration} onClick={generate}><WandSparkles size={18} />{busy ? t.generating : t.generate}<ChevronRight size={18} /></button></div>
      </>}

      {tab === 'presets' && <div className="page-content"><div className="section-head"><div><span className="eyebrow">{t.rhythmEyebrow}</span><h1>{t.presets}</h1><p>{t.presetsHelp}</p></div><button className="primary-button small" onClick={() => { setDraftPreset(blankPreset()); setError('') }}><CirclePlus size={18} />{t.newPreset}</button></div><div className="preset-layout"><div className="preset-list">{allPresets.map(preset => <button key={preset.id} className={`preset-list-item ${selectedPresetId === preset.id ? 'current' : ''}`} onClick={() => { setSelectedPresetId(preset.id); setDraftPreset(null) }}><div className="preset-list-icon"><BookOpen size={19} /></div><div><strong>{preset.name}</strong><span>{preset.isDefault ? t.standard : t.local} · {preset.phases.reduce((sum, phase) => sum + Number(phase.durationMinutes), 0)} {t.minutes}</span></div><ChevronRight size={17} /></button>)}</div><div className="panel preset-detail">{draftPreset ? <><div className="detail-head"><div><span className="eyebrow">{t.customFlow}</span><h2>{draftPreset.name || t.newPreset}</h2></div><button className="icon-button" onClick={() => setDraftPreset(null)}>×</button></div><div className="field-row"><label>{t.name}<input value={draftPreset.name} onChange={event => setDraftPreset({ ...draftPreset, name: event.target.value })} /></label><label>{t.description}<input value={draftPreset.description} onChange={event => setDraftPreset({ ...draftPreset, description: event.target.value })} /></label></div><div className="edit-phase-list">{draftPreset.phases.map((phase, index) => <div className="edit-phase" key={index}><span className="phase-index">{String(index + 1).padStart(2, '0')}</span><input aria-label={t.phaseName} placeholder={t.phaseName} value={phase.name} onChange={event => editPhase(index, { name: event.target.value })} /><input aria-label={t.duration} type="number" min="1" value={phase.durationMinutes} onChange={event => editPhase(index, { durationMinutes: Number(event.target.value) })} /><span>{t.minutes}</span><button className="icon-button" aria-label={t.moveUp} onClick={() => movePhase(index, -1)}><ArrowUp size={16} /></button><button className="icon-button" aria-label={t.moveDown} onClick={() => movePhase(index, 1)}><ArrowDown size={16} /></button><button className="icon-button danger" aria-label={t.remove} onClick={() => setDraftPreset({ ...draftPreset, phases: draftPreset.phases.filter((_, i) => i !== index) })}><Trash2 size={16} /></button></div>)}</div><button className="secondary-button" onClick={() => setDraftPreset({ ...draftPreset, phases: [...draftPreset.phases, { name: '', durationMinutes: 5, order: draftPreset.phases.length + 1 }] })}><CirclePlus size={16} />{t.addPhase}</button><div className="detail-actions"><span>{t.total}: {draftPreset.phases.reduce((sum, phase) => sum + Number(phase.durationMinutes || 0), 0)} {t.minutes}</span><button className="primary-button small" onClick={savePreset}><Check size={17} />{t.save}</button></div></> : selectedPreset ? <><div className="detail-head"><div><span className="eyebrow">{selectedPreset.isDefault ? t.standard : t.local}</span><h2>{selectedPreset.name}</h2><p>{selectedPreset.description}</p></div><div className="detail-buttons"><button className="secondary-button" onClick={() => duplicate(selectedPreset)}><Copy size={16} />{t.duplicate}</button>{!selectedPreset.isDefault && <><button className="secondary-button" onClick={() => setDraftPreset({ ...selectedPreset, phases: selectedPreset.phases.map(x => ({ ...x })) })}>{t.edit}</button><button className="icon-button danger" aria-label={t.remove} onClick={() => { updateLocalPresets(localPresets.filter(x => x.id !== selectedPreset.id)); setSelectedPresetId(serverPresets[0]?.id || '') }}><Trash2 size={17} /></button></>}</div></div><div className="detail-phases">{selectedPreset.phases.map((phase, index) => <div className="detail-phase" key={index}><span className="phase-index">{String(index + 1).padStart(2, '0')}</span><strong>{phase.name}</strong><span>{phase.durationMinutes} {t.minutes}</span></div>)}</div><div className="flow-total"><span>{t.total}</span><strong>{selectedPreset.phases.reduce((sum, phase) => sum + Number(phase.durationMinutes), 0)} {t.minutes}</strong></div>{selectedPreset.isDefault && <p className="subtle-info">{t.readOnly}</p>}</> : null}</div></div></div>}

      {tab === 'settings' && <div className="page-content"><div className="section-head"><div><span className="eyebrow">{t.settingsEyebrow}</span><h1>{t.settings}</h1><p>{t.settingsHelp}</p></div></div><section className="panel settings-panel"><div className="panel-heading"><div className="panel-icon lavender"><Settings2 size={20} /></div><div><h3>{t.displayLanguage}</h3><p>{t.displayHelp}</p></div></div><div className="segmented language-segment"><button className={settings.displayLanguage === 'en' ? 'selected' : ''} onClick={() => updateSettings({ ...settings, displayLanguage: 'en' })}>English</button><button className={settings.displayLanguage === 'ar' ? 'selected' : ''} onClick={() => updateSettings({ ...settings, displayLanguage: 'ar' })}>العربية</button></div></section><section className="panel settings-panel"><div className="panel-heading"><div className="panel-icon mint"><Sparkles size={20} /></div><div><h3>{t.aiProvider}</h3><p>{t.providerHelp}</p></div></div><div className="provider-grid">{providerIds.map(id => <button className={`provider-card ${settings.provider === id ? 'selected' : ''}`} key={id} onClick={() => { updateSettings({ ...settings, provider: id }); setError(''); setNotice('') }}><img src={logos[id]} alt="" /><strong>{providerNames[id]}</strong>{settings.keys[id] && <Check size={15} className="provider-check" />}</button>)}</div><div className="key-section"><div><label className="field-label">{providerNames[settings.provider]} {t.apiKey}<div className="key-input-wrap"><KeyRound size={17} /><input type="password" autoComplete="off" value={keyInput} onChange={event => setKeyInput(event.target.value)} placeholder={t.pasteKey} /></div></label><p className="subtle-info">{t.security}</p></div><div className="key-actions"><button className="primary-button small" disabled={!keyInput.trim()} onClick={saveKey}><KeyRound size={16} />{t.saveKey}</button>{settings.keys[settings.provider] && <button className="text-button danger" onClick={() => { const keys = { ...settings.keys }, models = { ...settings.models }; delete keys[settings.provider]; delete models[settings.provider]; updateSettings({ ...settings, keys, models }); setModels([]) }}>{t.removeKey}</button>}</div></div>{settings.keys[settings.provider] && <div className="model-section"><div className="model-title"><label>{t.model}</label><button className="text-button" onClick={refreshModels} disabled={modelLoading}><RefreshCw size={15} className={modelLoading ? 'spin' : ''} />{t.refreshModels}</button></div><select value={settings.models[settings.provider] || ''} onChange={event => updateSettings({ ...settings, models: { ...settings.models, [settings.provider]: event.target.value } })}><option value="">{modelLoading ? t.loading : t.selectModel}</option>{models.map(model => <option value={model.id} key={model.id}>{model.name} ({model.id})</option>)}</select><p className="subtle-info">{models.length} {t.modelsAvailable}</p></div>}</section></div>}

      {tab === 'results' && <div className="page-content"><div className="section-head"><div><span className="eyebrow">{t.classroomOptions}</span><h1>{t.results}</h1><p>{preparation ? `${preparation.className} · ${preparation.totalDurationMinutes} ${t.minutes}` : t.emptyResults}</p></div><div className="detail-buttons">{activeVariant && <button className="secondary-button" disabled={busy} onClick={exportSelectedPdf}><Download size={16} />{t.exportPdf}</button>}{preparation && <button className="secondary-button" disabled={busy} onClick={regenerate}><RefreshCw size={16} className={busy ? 'spin' : ''} />{t.regenerate}</button>}</div></div>{busy && <div className="processing-card"><LoaderCircle className="spin" size={19} /><div><strong>{stage === 'variant' ? `${t.generating} ${t.option}` : t.processing}</strong><span>{providerNames[settings.provider]} · {settings.models[settings.provider]}</span></div><button className="secondary-button small" onClick={() => { requestController.current?.abort(); setLiveDraft("") }}>{t.cancel}</button></div>}{busy && liveDraft && <div className="panel live-panel"><div className="panel-heading"><div className="panel-icon butter"><Sparkles size={19} /></div><div><h3>{t.live}</h3><p>{t.liveHelp}</p></div></div><pre>{liveDraft}</pre></div>}{currentVariants.length > 0 ? <><div className="variant-tabs">{currentVariants.map(variant => <button key={variant.id} className={activeVariant?.id === variant.id ? 'active' : ''} onClick={() => setActiveVariantId(variant.id)}>{t.option} {variant.variantNumber}<span>{variant.lesson.title}</span></button>)}</div>{activeVariant && <article className="lesson-result"><div className="result-hero"><span className="eyebrow">{t.option} {activeVariant.variantNumber} · {activeVariant.provider} / {activeVariant.model}</span><h2>{activeVariant.lesson.title}</h2><p>{t.topic}: {activeVariant.lesson.topic}</p><div className="result-meta"><span>{activeVariant.lesson.className}</span><span>{activeVariant.lesson.totalDurationMinutes} {t.minutes}</span></div></div><div className="result-summary"><div className="panel"><h3>{t.objectives}</h3><ul>{activeVariant.lesson.learningObjectives.map((item, index) => <li key={index}>{item}</li>)}</ul></div><div className="panel"><h3>{t.resources}</h3><ul>{activeVariant.lesson.requiredMaterials.map((item, index) => <li key={index}>{item}</li>)}</ul></div></div><div className="lesson-timeline">{activeVariant.lesson.phases.map((phase, index) => <section className="timeline-item" key={index}><div className="timeline-dot">{index + 1}</div><div className="panel timeline-panel"><div className="timeline-head"><h3>{phase.name}</h3><span>{phase.durationMinutes} {t.minutes}</span></div><p className="phase-objective">{phase.objective}</p><div className="activity-grid"><div><h4>{t.teacher}</h4><ul>{phase.teacherActions.map((action, i) => <li key={i}>{action}</li>)}</ul></div><div><h4>{t.students}</h4><ul>{phase.studentActions.map((action, i) => <li key={i}>{action}</li>)}</ul></div></div>{phase.questions?.length > 0 && <div className="question-block"><h4>{t.questions}</h4><ul>{phase.questions.map((question, i) => <li key={i}>{question}</li>)}</ul></div>}{phase.notes && <p className="phase-notes">{phase.notes}</p>}</div></section>)}</div><div className="result-summary"><div className="panel"><h3>{t.assessment}</h3><p>{activeVariant.lesson.assessmentSummary}</p></div><div className="panel"><h3>{t.outcomes}</h3><ul>{activeVariant.lesson.expectedOutcomes.map((item, index) => <li key={index}>{item}</li>)}</ul></div></div>{activeVariant.lesson.teacherNotes && <div className="panel teacher-notes"><h3>{t.notes}</h3><p>{activeVariant.lesson.teacherNotes}</p></div>}</article>}</> : !busy && <div className="empty-state"><div><FileText size={34} /></div><h2>{t.emptyResults}</h2><button className="primary-button small" onClick={() => setTab('prepare')}>{t.prepare}<ChevronRight size={17} /></button></div>}</div>}
    </main>
  </div>
}

export default App
