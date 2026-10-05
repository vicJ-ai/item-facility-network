// Options read from the page URL, for checking performance on a device and for the test suites.

const params = new URLSearchParams(window.location.search)

function positiveParam(name: string, max: number) {
  const value = Number(params.get(name))
  return Number.isFinite(value) && value > 0 ? Math.min(value, max) : undefined
}

/** `?debug=perf` shows a frame-rate and memory readout for checking quality settings on a device. */
export const DEBUG_PERF = params.get('debug') === 'perf'
/** `?previewSpeed=20` plays the Preview tour faster. */
export const PREVIEW_SPEED = positiveParam('previewSpeed', 100) ?? 1
/** `?previewFps=8` caps the tour's frame rate, so software WebGL in one test leaves room for the others. */
export const PREVIEW_MAX_FPS = positiveParam('previewFps', 120)
