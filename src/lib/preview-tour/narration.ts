// The Preview tour's spoken lines, built from the same data the captions show. The app and
// scripts/narration.mjs both read this module, so a data edit changes a line's text, its clip id,
// and (until `npm run narration` runs) leaves that moment silent instead of reading an old figure.
import { getFacilitySquareFootage, hasReportedAvailableSpace } from '../../data/facility-space'
import type { TourChapter, TourFacility } from './script'

/** The Kokoro voice every clip is generated with; changing it regenerates every clip. */
export const NARRATION_VOICE = 'am_michael'

/** One spoken line: `opening`, `chapter:<regionId>`, `stop:<facilityId>`, or `finale`. */
export type NarrationLine = { key: string; text: string }

// Respellings for words the voice gets wrong, applied to every line. Kokoro also accepts
// `[word](/phonemes/)` for anything a respelling cannot fix.
const PRONUNCIATIONS: Record<string, string> = {
  ITEM: 'Item',
}

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
const SCALES = [
  { value: 1_000_000_000, word: 'billion' },
  { value: 1_000_000, word: 'million' },
  { value: 1_000, word: 'thousand' },
]

function belowThousand(value: number) {
  const hundreds = Math.floor(value / 100)
  const rest = value % 100
  const words = hundreds > 0 ? [`${ONES[hundreds]} hundred`] : []
  if (rest > 0) words.push(rest < 20 ? ONES[rest] : `${TENS[Math.floor(rest / 10)]}${rest % 10 ? `-${ONES[rest % 10]}` : ''}`)
  return words.join(' ')
}

/** A whole number in words, the way it is read aloud: 414962 → "four hundred fourteen thousand, nine hundred sixty-two". */
export function spokenNumber(value: number): string {
  const whole = Math.round(Math.abs(value))
  if (whole === 0) return 'zero'
  const parts: string[] = []
  let rest = whole
  for (const scale of SCALES) {
    if (rest >= scale.value) {
      parts.push(`${belowThousand(Math.floor(rest / scale.value))} ${scale.word}`)
      rest %= scale.value
    }
  }
  if (rest > 0) parts.push(belowThousand(rest))
  return `${value < 0 ? 'minus ' : ''}${parts.join(', ')}`
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)
const facilities = (count: number) => `${spokenNumber(count)} ${count === 1 ? 'facility' : 'facilities'}`

function pronounce(text: string) {
  return Object.entries(PRONUNCIATIONS).reduce((line, [word, spoken]) => line.replace(new RegExp(`\\b${word}\\b`, 'g'), spoken), text)
}

/** Facility number, place, then total and available square feet: the figures the stop's card shows. */
function stopLine(facility: TourFacility) {
  const place = facility.city ? `${facility.city}, ${facility.stateName}` : facility.stateName
  const { totalSquareFeet, available } = getFacilitySquareFootage(facility.id)
  const intro = `Facility ${spokenNumber(facility.number)}, in ${place}.`
  if (totalSquareFeet === undefined) return intro
  // Available is left out while it is unreported or unconfirmed, as on the card.
  const space = !hasReportedAvailableSpace(available)
    ? ''
    : available.squareFeet === 0
      ? ', with no space available right now'
      : `, with ${spokenNumber(available.squareFeet)} available`
  return `${intro} It offers ${spokenNumber(totalSquareFeet)} square feet${space}.`
}

/** Every line the tour speaks, in tour order. */
export function narrationLines(chapters: readonly TourChapter[]): NarrationLine[] {
  const stopCount = chapters.reduce((count, chapter) => count + chapter.stops.length, 0)
  const lines: NarrationLine[] = [{ key: 'opening', text: 'Welcome to the ITEM facility network.' }]
  for (const chapter of chapters) {
    lines.push({ key: `chapter:${chapter.regionId}`, text: `${chapter.label} has ${facilities(chapter.stops.length)}.` })
    for (const stop of chapter.stops) lines.push({ key: `stop:${stop.facility.id}`, text: stopLine(stop.facility) })
  }
  lines.push({ key: 'finale', text: `${capitalize(facilities(stopCount))} across ${spokenNumber(chapters.length)} regions. One network.` })
  return lines.map((line) => ({ ...line, text: pronounce(line.text) }))
}

/** The clip a line is stored under: a hash of the voice and the exact text, so any change to either needs a new clip. */
export function clipId(text: string, voice: string = NARRATION_VOICE) {
  // 32-bit FNV-1a, run twice with different offsets for 64 bits.
  const hash = (offset: number) => {
    let value = offset
    for (const char of `${voice}\n${text}`) {
      value ^= char.codePointAt(0)!
      value = Math.imul(value, 0x01000193)
    }
    return (value >>> 0).toString(16).padStart(8, '0')
  }
  return `${hash(0x811c9dc5)}${hash(0x050c5d1f)}`
}

/** Written by scripts/narration.mjs; `text` is there so reviewers can see what each clip says. */
export type NarrationManifest = { voice: string; clips: Record<string, { seconds: number; text?: string }> }

/**
 * Each line's clip and its length in seconds, keyed by line key. Lines without a clip for the current text and
 * voice are left out and stay silent.
 */
export function narrationClips(lines: readonly NarrationLine[], manifest: NarrationManifest) {
  const durations = new Map<string, { clip: string; seconds: number }>()
  for (const line of lines) {
    const clip = clipId(line.text)
    const entry = manifest.clips[clip]
    if (entry) durations.set(line.key, { clip, seconds: entry.seconds })
  }
  return durations
}
