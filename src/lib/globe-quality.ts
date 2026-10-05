// Globe rendering quality. "Automatic" picks a tier from the graphics hardware and steps down while
// running if the frame rate drops; people can also choose a tier themselves.

export type QualityTier = 'high' | 'balanced' | 'performance'
export type QualityChoice = 'auto' | QualityTier

export type QualitySettings = {
  msaaSamples: number
  resolutionScale: number
  maximumScreenSpaceError: number
  tileCacheSize: number
  /** Frame-rate cap while the Preview tour renders continuously. */
  tourMaxFps: number
  outlineGlow: boolean
}

export const QUALITY_TIERS: Record<QualityTier, QualitySettings> = {
  high: { msaaSamples: 4, resolutionScale: 1, maximumScreenSpaceError: 2, tileCacheSize: 300, tourMaxFps: 60, outlineGlow: true },
  balanced: { msaaSamples: 2, resolutionScale: 1, maximumScreenSpaceError: 2.5, tileCacheSize: 300, tourMaxFps: 60, outlineGlow: true },
  performance: { msaaSamples: 1, resolutionScale: 0.75, maximumScreenSpaceError: 4, tileCacheSize: 200, tourMaxFps: 30, outlineGlow: false },
}

export const QUALITY_LABELS: Record<QualityChoice, { label: string; description: string }> = {
  auto: { label: 'Automatic', description: 'Matches this device, and steps down if motion gets choppy.' },
  high: { label: 'High', description: 'Sharpest edges and detail, for dedicated graphics.' },
  balanced: { label: 'Balanced', description: 'Smooth on most laptops with little visible difference.' },
  performance: { label: 'Performance', description: 'Lighter rendering for older or busy machines.' },
}

const QUALITY_STORAGE_KEY = 'globe-quality-v1'
const CHOICES: QualityChoice[] = ['auto', 'high', 'balanced', 'performance']

export function getInitialQualityChoice(): QualityChoice {
  try {
    const saved = window.localStorage.getItem(QUALITY_STORAGE_KEY)
    if (saved && (CHOICES as string[]).includes(saved)) return saved as QualityChoice
  } catch {
    // Storage is optional; the globe still works on the automatic setting.
  }
  return 'auto'
}

export function saveQualityChoice(choice: QualityChoice) {
  try {
    window.localStorage.setItem(QUALITY_STORAGE_KEY, choice)
  } catch {
    // Storage is optional.
  }
}

/** The next lighter tier, or the same tier when already the lightest. */
export function lowerTier(tier: QualityTier): QualityTier {
  return tier === 'high' ? 'balanced' : 'performance'
}

export type GraphicsProbe = { webgl: boolean; tier: QualityTier; renderer: string }

const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software|microsoft basic render/i
const INTEGRATED_RENDERER = /intel|uhd|iris|hd graphics|mali|adreno|powervr|apple gpu|videocore/i

/**
 * Probes WebGL once: whether it is available at all, and a starting quality tier from the renderer
 * name. The probe context is released straight away so it does not hold on to GPU resources.
 */
export function probeGraphics(): GraphicsProbe {
  try {
    const canvas = document.createElement('canvas')
    const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as WebGLRenderingContext | null
    if (!gl) return { webgl: false, tier: 'performance', renderer: '' }
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = String(debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER))
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    const tier: QualityTier = SOFTWARE_RENDERER.test(renderer) ? 'performance' : INTEGRATED_RENDERER.test(renderer) ? 'balanced' : 'high'
    return { webgl: true, tier, renderer }
  } catch {
    return { webgl: false, tier: 'performance', renderer: '' }
  }
}
