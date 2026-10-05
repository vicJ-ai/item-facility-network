// Turns the tour script into a timed sequence. The camera is a pure function of timeline time, so
// pausing, seeking, skipping, and looping always land on the same shot.
import { bearing, flight, frameBounds, lerpPose, orbit, slide, type CameraPose } from './flight'
import { TIMING, type TourChapter, type TourStop } from './script'

export type Ease = 'inOut' | 'out' | 'none'
type Segment = { start: number; end: number; ease: Ease; pose: (t: number) => CameraPose }
type Window = { start: number; end: number }

/** A region's part of the tour: the region shot, its facilities, then the zoom back out to the region. */
export type ChapterCue = Window & { chapterIndex: number; intro: Window; outro: Window; outlineStart: number }
export type StopCue = Window & { stopIndex: number; chapterIndex: number; arrival: number; jumpTo: number }
/** When a narration line (keyed as in `narration.ts`) starts, and how long it runs. */
export type NarrationCue = { key: string; start: number; seconds: number }
export type Choreography = {
  duration: number
  chapters: ChapterCue[]
  stops: StopCue[]
  finale: Window
  narration: NarrationCue[]
  /** Long flights between stops, where coarser imagery is enough. */
  travel: Window[]
  cameraAt: (time: number) => CameraPose
}

/** The whole-planet shot the opening starts from and the finale returns to, so the loop is seamless. */
const HOME: CameraPose = { longitude: -70, latitude: 36, range: 17_500_000, heading: 0, pitch: -89.5 }
const OPENING_END: CameraPose = { ...HOME, longitude: -104 }
const NETWORK: CameraPose = { longitude: -97, latitude: 38, range: 6_800_000, heading: 0, pitch: -84 }
const STOP_RANGE = 5_200
// Steep enough that the horizon stays out of frame.
const STOP_PITCH = -45
const REGION_PITCH = -70
const OUTLINE_DRAW = 1.6
// Every stay turns the camera by the same amount, so hops and flights look alike.
const STAY_ORBIT_DEGREES = 24
/** The finale's title appears this long before the loop ends; its narration starts with it. */
export const FINALE_TITLE_LEAD = 6.5
// Silence after each narration line before the tour moves on.
const NARRATION_PAD = 0.6

const EASES: Record<Ease, (t: number) => number> = {
  inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
  out: (t) => 1 - (1 - t) ** 3,
  none: (t) => t,
}

function stopPose(stop: TourStop, from: { longitude: number; latitude: number } | null): CameraPose {
  const [latitude, longitude] = stop.facility.coordinates
  const here = { longitude, latitude }
  return { ...here, range: STOP_RANGE, pitch: STOP_PITCH, heading: from ? bearing(from, here) : 0 }
}

function regionPose(chapter: TourChapter, fallback: CameraPose): CameraPose {
  if (!chapter.boundary) return { ...fallback, range: 400_000, pitch: REGION_PITCH }
  const frame = frameBounds(chapter.boundary.map((polygon) => polygon[0]))
  // The title block sits on the left, so the region is framed a little to the right of centre.
  const outline = chapter.boundary.flatMap((polygon) => polygon[0])
  const span = Math.max(...outline.map(([longitude]) => longitude)) - Math.min(...outline.map(([longitude]) => longitude))
  return { longitude: frame.longitude - span * 0.16, latitude: frame.latitude, range: frame.range, heading: 0, pitch: REGION_PITCH }
}

/**
 * `narration` maps line keys (see `narration.ts`) to clip lengths in seconds. Each narrated moment holds for at
 * least its clip plus a short pause; moments without a clip keep the usual timing.
 */
export function choreograph(tour: TourChapter[], { reducedMotion, narration = new Map() }: { reducedMotion: boolean; narration?: ReadonlyMap<string, number> }): Choreography {
  const segments: Segment[] = []
  const chapters: ChapterCue[] = []
  const stops: StopCue[] = []
  const travel: Window[] = []
  const spoken: NarrationCue[] = []
  let time = 0
  let pose = HOME

  /** Queues `key`'s line at the current time and returns how long the moment must hold for it. */
  const speak = (key: string, usual: number) => {
    const seconds = narration.get(key)
    if (seconds === undefined) return usual
    spoken.push({ key, start: time, seconds })
    return Math.max(usual, seconds + NARRATION_PAD)
  }

  const hold = (duration: number, shot: (t: number) => CameraPose, ease: Ease = 'none') => {
    segments.push({ start: time, end: time + duration, ease, pose: shot })
    time += duration
    pose = shot(1)
  }
  const cut = (to: CameraPose, duration: number) => hold(duration, () => to)
  const flyTo = (to: CameraPose) => {
    const path = flight(pose, to, { minDuration: TIMING.travelMin, maxDuration: TIMING.travelMax })
    travel.push({ start: time, end: time + path.duration })
    hold(path.duration, path.at, 'inOut')
  }

  if (reducedMotion) cut(OPENING_END, speak('opening', 2))
  else hold(speak('opening', TIMING.opening * 0.5), (t) => lerpPose(HOME, OPENING_END, t), 'inOut')

  let previousPoint: { longitude: number; latitude: number } | null = null
  let orbitDirection = 1
  tour.forEach((chapter, chapterIndex) => {
    const chapterStart = time
    // Every region opens on the region itself: the camera frames it while its outline draws on.
    const frame = regionPose(chapter, pose)
    if (!reducedMotion) flyTo(frame)
    const introLength = speak(`chapter:${chapter.regionId}`, TIMING.chapterIntro)
    const intro = { start: time, end: time + introLength }
    if (reducedMotion) cut(frame, introLength)
    else hold(introLength, orbit(frame, 4, 0.96))

    chapter.stops.forEach((stop, stopInChapter) => {
      // The first stop is dived into from the region shot, so its heading follows that descent.
      const from = stopInChapter === 0 ? { longitude: pose.longitude, latitude: pose.latitude } : previousPoint
      const target = stopPose(stop, from)
      const stopStart = time
      let arrival: number
      let jumpTo: number
      if (reducedMotion) {
        jumpTo = time
        arrival = time
        cut(target, speak(`stop:${stop.facility.id}`, TIMING.reducedStay))
      } else {
        // A hop slides over from a nearby stop in the same region; anything else is a flight.
        if (stop.kind === 'hop' && stopInChapter > 0) {
          jumpTo = time
          hold(TIMING.hopSlide, slide(pose, target), 'inOut')
        } else {
          // Lift off before leaving a stop, as if taking a breath; the region shot needs no lift-off.
          if (stopInChapter > 0) {
            const liftFrom = pose
            hold(TIMING.liftOff, (t) => lerpPose(liftFrom, { ...liftFrom, range: liftFrom.range * 1.2, pitch: liftFrom.pitch - 8 }, t), 'out')
          }
          const approach = { ...target, range: target.range * 1.35, pitch: target.pitch - 15 }
          flyTo(approach)
          jumpTo = time
          hold(TIMING.arrive, (t) => lerpPose(approach, target, t), 'out')
        }
        arrival = time
        orbitDirection *= -1
        // The line starts once the camera has settled, where the tour also waits for sharp imagery.
        hold(speak(`stop:${stop.facility.id}`, TIMING.stay), orbit(target, STAY_ORBIT_DEGREES * orbitDirection))
      }
      stops.push({ stopIndex: stop.index, chapterIndex, start: stopStart, end: time, arrival, jumpTo })
      previousPoint = { longitude: target.longitude, latitude: target.latitude }
    })

    // Every region closes by zooming back out to the region before the tour moves on.
    const outroStart = time
    if (reducedMotion) cut(frame, TIMING.regionOutro)
    else {
      flyTo(frame)
      hold(TIMING.regionOutro, orbit(frame, -3, 1.02))
    }
    chapters.push({ chapterIndex, start: chapterStart, end: time, intro, outro: { start: outroStart, end: time }, outlineStart: intro.start })
  })

  const finaleStart = time
  if (reducedMotion) cut(NETWORK, TIMING.finale)
  else {
    flyTo(NETWORK)
    hold(TIMING.finale - 2, orbit(NETWORK, 0, 0.97))
    hold(2, (t) => lerpPose(pose, HOME, t), 'inOut')
  }
  const finale = { start: finaleStart, end: time }
  // The finale line starts with its title, which is placed from the end of the loop.
  const finaleLine = narration.get('finale')
  if (finaleLine !== undefined) spoken.push({ key: 'finale', start: Math.max(finaleStart, time - FINALE_TITLE_LEAD), seconds: finaleLine })

  const cameraAt = (at: number) => {
    const clamped = Math.min(Math.max(at, 0), time)
    // A segment owns [start, end), so a stop's start time shows that stop, not the previous one.
    const segment = segments.find((candidate) => clamped < candidate.end) ?? segments[segments.length - 1]
    const span = segment.end - segment.start
    const progress = span > 0 ? (clamped - segment.start) / span : 1
    return segment.pose(EASES[segment.ease](progress))
  }

  return { duration: time, chapters, stops, finale, narration: spoken, travel, cameraAt }
}

/**
 * How strongly the region highlight shows for a camera `range`: full at region scale, gone near the
 * ground, where the coarse boundary would cut hard edges across the view.
 */
export function highlightOpacity(range: number) {
  const t = Math.min(1, Math.max(0, (range - 40_000) / (250_000 - 40_000)))
  return t * t * (3 - 2 * t)
}

/** How much of the region outline is drawn at `time` (0–1). */
export function outlineProgress(cue: { outlineStart: number }, time: number) {
  return Math.min(1, Math.max(0, (time - cue.outlineStart) / OUTLINE_DRAW))
}
