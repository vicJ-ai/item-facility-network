// Generates the Preview tour's narration: one MP3 per spoken line in public/narration/, plus
// src/lib/preview-tour/narration-manifest.json with each clip's length, which the tour uses to time its holds.
// Lines are built from the facility data by src/lib/preview-tour/narration.ts and stored under a hash of their
// text, so only new or changed lines are spoken again; clips no line uses any more are removed.
//
//   npm run narration          generate what is missing
//   npm run narration:check    list missing clips and exit 1 if there are any (generates nothing)
//
// The voice is Kokoro-82M (Apache 2.0) on the CPU, with ffmpeg for the MP3s. Both come from this folder's own
// package.json, which `npm run narration` installs, so the app's build never pulls in the speech runtime. The
// model (about 90 MB) downloads on the first run and is cached under this folder's node_modules; it is never shipped.
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const AUDIO_DIR = fileURLToPath(new URL('../../public/narration/', import.meta.url))
const MANIFEST = fileURLToPath(new URL('../../src/lib/preview-tour/narration-manifest.json', import.meta.url))
const check = process.argv.includes('--check')

// The tour's own modules, loaded through Vite so their TypeScript and extensionless imports resolve.
const server = await createServer({ root: ROOT, configFile: false, logLevel: 'error', appType: 'custom', server: { middlewareMode: true, hmr: false } })
let lines
let voice
let clipId
try {
  const { networkFacilities } = await server.ssrLoadModule('/src/data/facilities.ts')
  const { dashboardRegions } = await server.ssrLoadModule('/src/data/dashboard-regions.ts')
  const { buildTour } = await server.ssrLoadModule('/src/lib/preview-tour/script.ts')
  const narration = await server.ssrLoadModule('/src/lib/preview-tour/narration.ts')
  lines = narration.narrationLines(buildTour(networkFacilities, dashboardRegions))
  voice = narration.NARRATION_VOICE
  clipId = narration.clipId
} finally {
  await server.close()
}

const previous = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : { clips: {} }
const wanted = lines.map((line) => ({ ...line, clip: clipId(line.text, voice) }))
const hasClip = (clip) => previous.voice === voice && previous.clips[clip] && existsSync(`${AUDIO_DIR}${clip}.mp3`)
const missing = wanted.filter((line) => !hasClip(line.clip))

if (check) {
  for (const line of missing) console.log(`missing  ${line.key}  "${line.text}"`)
  console.log(`narration: ${wanted.length - missing.length} of ${wanted.length} lines have a current clip`)
  process.exit(missing.length > 0 ? 1 : 0)
}

/** Encodes Kokoro's 24 kHz float samples as a 64 kbps mono MP3. */
function encodeMp3(ffmpegPath, samples, rate, path) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(ffmpegPath, ['-v', 'error', '-y', '-f', 'f32le', '-ar', String(rate), '-ac', '1', '-i', 'pipe:0', '-codec:a', 'libmp3lame', '-b:a', '64k', path])
    ffmpeg.on('error', reject)
    ffmpeg.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code} for ${path}`))))
    ffmpeg.stdin.end(Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength))
  })
}

mkdirSync(AUDIO_DIR, { recursive: true })
const clips = {}
for (const line of wanted) if (hasClip(line.clip)) clips[line.clip] = previous.clips[line.clip]

if (missing.length > 0) {
  const { KokoroTTS } = await import('kokoro-js')
  const { default: ffmpegPath } = await import('ffmpeg-static')
  const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' })
  for (const [index, line] of missing.entries()) {
    const audio = await tts.generate(line.text, { voice })
    await encodeMp3(ffmpegPath, audio.audio, audio.sampling_rate, `${AUDIO_DIR}${line.clip}.mp3`)
    clips[line.clip] = { seconds: Number((audio.audio.length / audio.sampling_rate).toFixed(3)), text: line.text }
    console.log(`[${index + 1}/${missing.length}] ${line.key}  ${clips[line.clip].seconds.toFixed(1)} s`)
  }
}

// Clips no current line uses are removed, so public/narration/ holds only what the tour plays.
let removed = 0
for (const file of readdirSync(AUDIO_DIR)) {
  if (file.endsWith('.mp3') && !clips[file.slice(0, -4)]) {
    rmSync(`${AUDIO_DIR}${file}`)
    removed += 1
  }
}

// Sorted by clip id so regenerating one line changes only its own entry.
const sorted = Object.fromEntries(Object.entries(clips).sort(([a], [b]) => a.localeCompare(b)))
writeFileSync(MANIFEST, `${JSON.stringify({ voice, clips: sorted }, null, 2)}\n`)
const total = wanted.reduce((sum, line) => sum + (clips[line.clip]?.seconds ?? 0), 0)
console.log(`narration: ${missing.length} generated, ${wanted.length - missing.length} kept, ${removed} removed; ${total.toFixed(0)} s of speech in ${wanted.length} lines`)
