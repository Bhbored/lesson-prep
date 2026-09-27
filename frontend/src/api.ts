export type ProviderId = 'openai' | 'gemini' | 'anthropic' | 'deepseek'
export type Language = 'en' | 'ar' | 'fr'
export type Phase = { name: string; durationMinutes: number; order: number }
export type Preset = { id: string; name: string; description: string; isDefault: boolean; phases: Phase[] }
export type EncryptedCredential = { keyId: string; wrappedKey: string; nonce: string; ciphertext: string }
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
export type Settings = { displayLanguage: Language; provider: ProviderId; keys: Partial<Record<ProviderId, EncryptedCredential>>; models: Partial<Record<ProviderId, string>> }

export const providerNames: Record<ProviderId, string> = { openai: 'OpenAI', gemini: 'Gemini', anthropic: 'Anthropic', deepseek: 'DeepSeek' }
export const providerIds: ProviderId[] = ['openai', 'gemini', 'anthropic', 'deepseek']

export function loadSettings(): Settings {
  try {
    const value = JSON.parse(localStorage.getItem('lessonprep.settings') || '{}')
    return { displayLanguage: value.displayLanguage === 'ar' ? 'ar' : 'en', provider: providerIds.includes(value.provider) ? value.provider : 'deepseek', keys: value.keys || {}, models: value.models || {} }
  } catch { return { displayLanguage: 'en', provider: 'deepseek', keys: {}, models: {} } }
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

export async function getPresets(): Promise<Preset[]> {
  const response = await fetch('/api/lesson-flow-presets')
  if (!response.ok) throw new Error(await errorMessage(response))
  return response.json()
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}
function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value)
  return Uint8Array.from(binary, character => character.charCodeAt(0))
}

export async function encryptKey(secret: string): Promise<EncryptedCredential> {
  const response = await fetch('/api/ai/public-key')
  if (!response.ok) throw new Error(await errorMessage(response))
  const { keyId, spki } = await response.json() as { keyId: string; spki: string }
  const rsa = await crypto.subtle.importKey('spki', base64ToBytes(spki), { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt'])
  const aes = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt'])
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', aes))
  const wrapped = new Uint8Array(await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, rsa, raw))
  const nonce = crypto.getRandomValues(new Uint8Array(12))
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aes, new TextEncoder().encode(secret)))
  raw.fill(0)
  return { keyId, wrappedKey: bytesToBase64(wrapped), nonce: bytesToBase64(nonce), ciphertext: bytesToBase64(cipher) }
}

export async function getModels(provider: ProviderId, credential: EncryptedCredential): Promise<AiModel[]> {
  const response = await fetch(`/api/ai/providers/${provider}/models`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credential)
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
