export type ProviderId = 'openAi' | 'gemini' | 'anthropic' | 'deepSeek'
export type Language = 'en' | 'ar' | 'fr'
export type Phase = { name: string; durationMinutes: number; order: number }
export type Preset = { id: string; name: string; description: string; isDefault: boolean; phases: Phase[] }
export type AiModel = { id: string; name: string }
export type LessonPhase = Phase & {
  objective: string; teacherActions: string[]; studentActions: string[]; questions: string[]; notes: string
}
export type Lesson = {
  title: string; topic: string; className: string; totalDurationMinutes: number
  learningObjectives: string[]; requiredMaterials: string[]; phases: LessonPhase[]
  assessmentSummary: string; expectedOutcomes: string[]; teacherNotes: string
}
export type Variant = { id: string; variantNumber: number; generationRound: number; provider: string; model: string; lesson: Lesson }
export type Preparation = { preparationId: string; className: string; totalDurationMinutes: number; sourceLanguage: Language; phases: Phase[]; sourceText: string; preparedSourceText: string; variants: Variant[] }
export type Settings = { displayLanguage: Language; provider: ProviderId; keys: Partial<Record<ProviderId, string>>; models: Partial<Record<ProviderId, string>> }

export const providerNames: Record<ProviderId, string> = { openAi: 'OpenAI', gemini: 'Gemini', anthropic: 'Anthropic', deepSeek: 'DeepSeek' }
export const providerIds: ProviderId[] = ['openAi', 'gemini', 'anthropic', 'deepSeek']

const legacyProviders: Record<string, ProviderId> = {
  openai: 'openAi', openAi: 'openAi',
  gemini: 'gemini',
  anthropic: 'anthropic',
  deepseek: 'deepSeek', deepSeek: 'deepSeek',
}

function migrateProvider(value: unknown): ProviderId {
  return typeof value === 'string' && value in legacyProviders ? legacyProviders[value] : 'deepSeek'
}

function migrateKeys(raw: unknown): Partial<Record<ProviderId, string>> {
  if (!raw || typeof raw !== 'object') return {}
  const keys: Partial<Record<ProviderId, string>> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const provider = migrateProvider(key)
    if (typeof value === 'string' && value.includes('.')) keys[provider] = value
  }
  return keys
}

function migrateModels(raw: unknown): Partial<Record<ProviderId, string>> {
  if (!raw || typeof raw !== 'object') return {}
  const models: Partial<Record<ProviderId, string>> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const provider = migrateProvider(key)
    if (typeof value === 'string') models[provider] = value
  }
  return models
}

export function loadSettings(): Settings {
  try {
    const value = JSON.parse(localStorage.getItem('lessonprep.settings') || '{}')
    return {
      displayLanguage: value.displayLanguage === 'ar' ? 'ar' : 'en',
      provider: migrateProvider(value.provider),
      keys: migrateKeys(value.keys),
      models: migrateModels(value.models),
    }
  } catch { return { displayLanguage: 'en', provider: 'deepSeek', keys: {}, models: {} } }
}
export function saveSettings(value: Settings) { localStorage.setItem('lessonprep.settings', JSON.stringify(value)) }
export function loadLocalPresets(): Preset[] {
  try { return JSON.parse(localStorage.getItem('lessonprep.presets') || '[]') } catch { return [] }
}
export function saveLocalPresets(value: Preset[]) { localStorage.setItem('lessonprep.presets', JSON.stringify(value)) }
export function loadPreparation(): Preparation | null {
  try {
    const value = JSON.parse(localStorage.getItem('lessonprep.lastPreparation') || 'null')
    return value && typeof value.preparationId === 'string' && typeof value.sourceText === 'string' &&
      typeof value.preparedSourceText === 'string' && Array.isArray(value.phases) && Array.isArray(value.variants)
      ? value as Preparation : null
  } catch { return null }
}
export function savePreparation(value: Preparation) { localStorage.setItem('lessonprep.lastPreparation', JSON.stringify(value)) }

async function errorMessage(response: Response): Promise<string> {
  try { const data = await response.json(); return data.message || data.title || `Request failed (${response.status})` }
  catch { return `Request failed (${response.status})` }
}

const apiRoot = '/lessonprep/v1.0'

export async function getPresets(): Promise<Preset[]> {
  const response = await fetch(`${apiRoot}/LessonFlowPresets`)
  if (!response.ok) throw new Error(await errorMessage(response))
  return response.json()
}

export async function issueCredential(provider: ProviderId, apiKey: string): Promise<string> {
  const response = await fetch(`${apiRoot}/Ai/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, apiKey }),
  })
  if (!response.ok) throw new Error(await errorMessage(response))
  const data = await response.json() as { token: string }
  return data.token
}

export async function getModels(provider: ProviderId, token: string): Promise<AiModel[]> {
  const response = await fetch(`${apiRoot}/Ai/providers/${provider}/models`, {
    method: 'POST',
    headers: { 'X-Provider-Token': token },
  })
  if (!response.ok) throw new Error(await errorMessage(response))
  return response.json()
}

export async function consumeSse(response: Response, onEvent: (event: string, data: any) => void): Promise<void> {
  if (!response.ok) throw new Error(await errorMessage(response))
  if (!response.body) throw new Error('Streaming is unavailable in this browser.')
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let complete = false
  while (true) {
    const { value, done } = await reader.read()
    buffer += decoder.decode(value, { stream: !done })
    buffer = buffer.replace(/\r\n/g, '\n')
    let boundary = buffer.indexOf('\n\n')
    while (boundary >= 0) {
      const block = buffer.slice(0, boundary)
      buffer = buffer.slice(boundary + 2)
      const event = block.split('\n').find(line => line.startsWith('event:'))?.slice(6).trim() || 'message'
      const text = block.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n')
      if (text) {
        const data = JSON.parse(text)
        if (event === 'error') throw new Error(data.message || 'Generation failed.')
        if (event === 'complete') complete = true
        onEvent(event, data)
      }
      boundary = buffer.indexOf('\n\n')
    }
    if (done) break
  }
  if (!complete) throw new Error('The lesson stream ended before generation completed.')
}
