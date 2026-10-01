import { useEffect, useState } from 'react'
import { QUALITY_LABELS, type QualityChoice, type QualityTier } from '../lib/globe-quality'

type GpuMemory = { total: number; texture: number; buffer: number; textures: number }
type Stats = { fps: number; heap: number | null; gpu: GpuMemory | null }
type MemoryExtension = { getMemoryInfo: () => { memory: { total: number; texture: number; buffer: number }; resources: { texture: number } } }

const megabytes = (bytes: number) => `${(bytes / 1_048_576).toFixed(1)} MB`

function readHeap() {
  const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
  return memory ? memory.usedJSHeapSize : null
}

/** GPU memory held by the globe's WebGL context, reported by webgl-memory when it is loaded. */
function readGpu(): GpuMemory | null {
  const canvas = document.querySelector<HTMLCanvasElement>('.globe-canvas canvas')
  if (!canvas) return null
  // Asking for the context type the globe already created returns that same context.
  const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as WebGLRenderingContext | null
  const extension = gl?.getExtension('GMAN_webgl_memory') as MemoryExtension | null | undefined
  if (!extension) return null
  const { memory, resources } = extension.getMemoryInfo()
  return { total: memory.total, texture: memory.texture, buffer: memory.buffer, textures: resources.texture }
}

/** `?debug=perf` readout: frame rate, JavaScript heap, globe GPU memory, and the quality in use. */
export default function PerfHud({ tier, choice }: { tier: QualityTier | null; choice: QualityChoice }) {
  const [stats, setStats] = useState<Stats>({ fps: 0, heap: null, gpu: null })

  useEffect(() => {
    let frames = 0
    let windowStart = performance.now()
    let frame = 0
    const tick = (now: number) => {
      frames += 1
      if (now - windowStart >= 1000) {
        setStats({ fps: (frames * 1000) / (now - windowStart), heap: readHeap(), gpu: readGpu() })
        frames = 0
        windowStart = now
      }
      frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [])

  return (
    <aside className="perf-hud" data-testid="perf-hud" aria-label="Performance readout">
      <strong>{Math.round(stats.fps)} fps</strong>
      <span>Quality {tier ? QUALITY_LABELS[tier].label : '—'}{choice === 'auto' ? ' (auto)' : ''}</span>
      {stats.heap !== null && <span>JS heap {megabytes(stats.heap)}</span>}
      {stats.gpu ? (
        <span>GPU {megabytes(stats.gpu.total)} · textures {stats.gpu.textures} ({megabytes(stats.gpu.texture)}) · buffers {megabytes(stats.gpu.buffer)}</span>
      ) : (
        <span>GPU memory: open the globe</span>
      )}
    </aside>
  )
}
