import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Pause, Play, SkipBack, SkipForward, X } from 'lucide-react'
import { gsap } from 'gsap'
import { SplitText } from 'gsap/SplitText'
import type { RegionBoundary } from '../data/region-boundaries'
import type { TourCameraApi } from '../lib/preview-tour/camera-api'
import { choreograph, highlightOpacity, outlineProgress } from '../lib/preview-tour/choreography'
import type { TourChapter, TourFacility, TourStopDetails } from '../lib/preview-tour/script'
import './PreviewTour.css'

gsap.registerPlugin(SplitText)

// Longest wait for sharp imagery at each arrival before the stay timer runs anyway.
const TILE_WAIT_MS = 1500
const EXIT_MS = 450
// A hop starts exactly where the previous stop ends, and GSAP rounds seek times, so jumps land this
// far inside the target to never fall back into the stop before it.
const SEEK_INSIDE = 0.02
// How long a title takes to appear after its stop begins: the fade starts 0.35 s in and runs ~0.9 s.
const TITLE_REVEAL = 1.3

type PreviewTourProps = {
  api: TourCameraApi | null
  chapters: TourChapter[]
  /** Element whose drags, clicks, and scrolls hand control back to the user. */
  interactionTarget: HTMLElement | null
  localTime: (facility: TourFacility) => string
  renderOpenState: (facility: TourFacility) => ReactNode
  /** Photo, square footage, and plan facts shown at each stop. */
  stopDetails: (facility: TourFacility) => TourStopDetails
  /** The regions to highlight (`null` for none); the finale lights all of them. */
  onFocusChange: (regionIds: readonly string[] | null) => void
  onExit: () => void
  /** Playback rate; tests raise it to run the tour quickly. */
  speed?: number
  /** Frame-rate cap; tests lower it so software WebGL leaves room for other test runs. */
  maxFps?: number
}

type Controls = {
  togglePause: () => void
  step: (direction: 1 | -1) => void
  jump: (stopIndex: number) => void
  jumpToRegion: (chapterIndex: number) => void
  jumpToFinale: () => void
  stop: () => void
}
/** What the progress bar is pointing at: a region, a facility, or the finale; `left` is a percentage. */
type ProgressHint = { left: number; kicker: string; label: string }

const pad = (value: number) => String(value).padStart(2, '0')
const stopTitle = (facility: TourFacility) => (facility.city ?? facility.stateName).toUpperCase()
const facilityCount = (count: number) => `${count} ${count === 1 ? 'facility' : 'facilities'}`
// Titles shrink until their longest word fits on one line, so names never break mid-word.
const titleFit = (title: string) => ({ '--title-chars': Math.max(...title.split(/\s+/).map((word) => word.length)) }) as CSSProperties

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function mergeBoundaries(boundaries: (RegionBoundary | null)[]): RegionBoundary {
  return boundaries.flatMap((boundary) => boundary ?? [])
}

/** The Dashboard's cinematic, looping tour of every region and facility. */
export default function PreviewTour({ api, chapters, interactionTarget, localTime, renderOpenState, stopDetails, onFocusChange, onExit, speed = 1, maxFps }: PreviewTourProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const announcerRef = useRef<HTMLDivElement>(null)
  const controls = useRef<Controls | null>(null)
  const callbacks = useRef({ onFocusChange, onExit })
  const maxFpsRef = useRef(maxFps)
  const [reducedMotion] = useState(prefersReducedMotion)
  const [paused, setPaused] = useState(false)
  const [closing, setClosing] = useState(false)
  const [hint, setHint] = useState<ProgressHint | null>(null)
  const choreography = useMemo(() => choreograph(chapters, { reducedMotion }), [chapters, reducedMotion])
  const stops = useMemo(() => chapters.flatMap((chapter) => chapter.stops), [chapters])
  const finaleBoundary = useMemo(() => mergeBoundaries(chapters.map((chapter) => chapter.boundary)), [chapters])

  useLayoutEffect(() => {
    callbacks.current = { onFocusChange, onExit }
  })

  useEffect(() => {
    const root = rootRef.current
    if (!api || !root) return
    let alive = true
    let waiting = false
    let userPaused = false
    let focusKey: string | null | undefined
    let currentStop = -1
    let progressLabel = ''
    // Only the fill element moves, so the progress bar never restyles the rest of the overlay.
    const progressFill = root.querySelector<HTMLElement>('.preview-progress-fill')
    const saved = api.saveView()
    const { duration, cameraAt, stops: stopCues, chapters: chapterCues, finale, travel } = choreography
    const tileWait = TILE_WAIT_MS / speed
    api.setContinuousRender(true, maxFpsRef.current)
    // Keep the tour on real time even when frames are slow; GSAP would otherwise stretch long frames.
    gsap.ticker.lagSmoothing(0)

    const ctx = gsap.context(() => {
      const timeline = gsap.timeline({ paused: true, repeat: -1, onUpdate: () => sync() })
      timeline.timeScale(speed)
      // Pins the loop length to the camera choreography.
      timeline.set({}, {}, duration)
      // Words stay whole, so long names such as "Southern California" wrap between words.
      const split = (selector: string) => new SplitText(root.querySelectorAll(`${selector} [data-split]`), { type: 'words,chars' })
      const reveal = (element: Element | null, chars: Element[], start: number, end: number) => {
        if (!element) return
        timeline.fromTo(element, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35, ease: 'power2.out' }, start)
        if (!reducedMotion && chars.length > 0) timeline.from(chars, { yPercent: 55, opacity: 0, duration: 0.6, stagger: 0.028, ease: 'power3.out' }, start + 0.05)
        timeline.to(element, { autoAlpha: 0, y: reducedMotion ? 0 : -12, duration: 0.35, ease: 'power2.in' }, Math.max(start + 0.4, end - 0.35))
      }

      chapterCues.forEach((cue) => {
        const intro = root.querySelector(`[data-chapter-intro="${cue.chapterIndex}"]`)
        reveal(intro, intro ? split(`[data-chapter-intro="${cue.chapterIndex}"]`).chars : [], cue.intro.start, cue.intro.end)
        reveal(root.querySelector(`[data-chapter-label="${cue.chapterIndex}"]`), [], cue.start, cue.end)
      })
      stopCues.forEach((cue) => {
        const selector = `[data-stop="${cue.stopIndex}"]`
        const block = root.querySelector(selector)
        const start = cue.jumpTo + (reducedMotion ? 0 : 0.35)
        reveal(block, block ? split(selector).chars : [], start, cue.end)
        if (block && !reducedMotion) timeline.from(block.querySelector('.preview-stop-number'), { yPercent: 60, opacity: 0, duration: 0.7, ease: 'power3.out' }, start)
        const card = block?.querySelector('.preview-stop-card')
        if (card && !reducedMotion) timeline.from(card, { y: 24, opacity: 0, duration: 0.8, ease: 'power3.out' }, start + 0.45)
        reveal(root.querySelector(`[data-stop-time="${cue.stopIndex}"]`), [], start, cue.end)
        timeline.call(() => {
          api.pulsePin(stops[cue.stopIndex].facility.id)
          waitForTiles()
        }, [], cue.arrival)
      })
      const finaleText = root.querySelector('[data-finale]')
      reveal(finaleText, finaleText ? split('[data-finale]').chars : [], finale.end - 6.5, finale.end - 0.8)
      reveal(root.querySelector('[data-finale-label]'), [], finale.start, finale.end)
      stops.forEach((stop, index) => timeline.call(() => api.pulsePin(stop.facility.id), [], finale.end - 6.2 + index * 0.1))

      const sync = () => {
        if (!alive) return
        const time = timeline.time()
        const pose = cameraAt(time)
        api.lookAt(pose)
        api.setHighlightOpacity(highlightOpacity(pose.range))
        // Coarser imagery while crossing between stops; full detail returns before each arrival.
        api.setFlightDetail(travel.some((window) => time >= window.start && time < window.end))
        const progress = time / duration
        if (progressFill) progressFill.style.transform = `scaleX(${progress.toFixed(4)})`
        const label = progress.toFixed(2)
        if (label !== progressLabel) {
          progressLabel = label
          root.dataset.progress = label
        }

        const chapter = chapterCues.find((cue) => time >= cue.start && time < cue.end)
        const inFinale = time >= finale.start
        const nextFocus = inFinale ? 'finale' : chapter ? chapters[chapter.chapterIndex].regionId : null
        if (nextFocus !== focusKey) {
          focusKey = nextFocus
          api.setOutline(inFinale ? finaleBoundary : chapter ? chapters[chapter.chapterIndex].boundary : null)
          callbacks.current.onFocusChange(inFinale ? chapters.map((item) => item.regionId) : chapter ? [chapters[chapter.chapterIndex].regionId] : null)
        }
        api.setOutlineProgress(inFinale ? outlineProgress({ outlineStart: finale.start }, time) : chapter ? outlineProgress(chapter, time) : 0)

        const stop = stopCues.find((cue) => time >= cue.start && time < cue.end)
        const stopIndex = stop ? stop.stopIndex : -1
        // Where the tour is: opening, a region's intro, a facility, the region's zoom-out, or the finale.
        const phase = inFinale ? 'finale' : stop ? 'stop' : chapter ? (time >= chapter.outro.start ? 'outro' : 'intro') : 'opening'
        if (root.dataset.previewPhase !== phase) root.dataset.previewPhase = phase
        const chapterId = chapter && !inFinale ? chapters[chapter.chapterIndex].regionId : ''
        if (root.dataset.previewChapter !== chapterId) root.dataset.previewChapter = chapterId
        if (stopIndex !== currentStop) {
          currentStop = stopIndex
          const facility = stop ? stops[stopIndex].facility : null
          root.dataset.previewStop = facility?.id ?? ''
          for (const tick of root.querySelectorAll<HTMLElement>('[data-tick]')) tick.classList.toggle('is-current', Number(tick.dataset.tick) === stopIndex)
          if (facility && announcerRef.current) announcerRef.current.textContent = `Facility ${pad(facility.number)}, ${facility.city ?? facility.stateName}, ${facility.stateName}`
        }
      }

      const waitForTiles = () => {
        if (waiting) return
        waiting = true
        timeline.pause()
        api.waitForTiles(tileWait).then(() => {
          waiting = false
          if (alive && !userPaused) timeline.play()
        })
      }

      // Jumps land where the camera has settled and the facility title is already up, so a jump
      // made while paused still shows which facility it is.
      const landing = (cue: (typeof stopCues)[number]) => Math.min(cue.end - SEEK_INSIDE, Math.max(cue.arrival, cue.jumpTo + TITLE_REVEAL) + SEEK_INSIDE)

      const seek = (time: number) => {
        timeline.seek(time, true)
        sync()
        waitForTiles()
      }

      controls.current = {
        togglePause: () => {
          userPaused = !userPaused
          setPaused(userPaused)
          if (userPaused) timeline.pause()
          else if (!waiting) timeline.play()
        },
        step: (direction) => {
          const time = timeline.time()
          const index = stopCues.findIndex((cue) => time < cue.end)
          const current = index === -1 ? stopCues.length : index
          const target = current + direction
          if (target >= stopCues.length) seek(finale.start + SEEK_INSIDE)
          else seek(target < 0 ? 0 : landing(stopCues[target]))
        },
        jump: (stopIndex) => seek(landing(stopCues[stopIndex])),
        // Lands on the region shot once its title is up and the outline has mostly drawn on.
        jumpToRegion: (chapterIndex) => {
          const { intro } = chapterCues[chapterIndex]
          seek(Math.min(intro.end - SEEK_INSIDE, intro.start + TITLE_REVEAL))
        },
        jumpToFinale: () => seek(finale.start + SEEK_INSIDE),
        stop: () => {
          if (!alive) return
          alive = false
          timeline.kill()
          api.setHighlightOpacity(1)
          api.setFlightDetail(false)
          api.setOutline(null)
          api.restoreView(saved)
          api.setContinuousRender(false)
          callbacks.current.onFocusChange(null)
          setClosing(true)
          window.setTimeout(() => callbacks.current.onExit(), reducedMotion ? 0 : EXIT_MS)
        },
      }

      sync()
      timeline.play()
    }, root)

    return () => {
      if (alive) {
        alive = false
        try {
          api.setHighlightOpacity(1)
          api.setFlightDetail(false)
          api.setOutline(null)
          api.restoreView(saved)
          api.setContinuousRender(false)
        } catch {
          // The globe is being torn down at the same time; there is no camera left to restore.
        }
      }
      controls.current = null
      ctx.revert()
      gsap.ticker.lagSmoothing(500, 33)
    }
  }, [api, choreography, chapters, stops, finaleBoundary, reducedMotion, speed])

  // A new frame-rate cap (for example after Automatic quality steps down) applies without restarting.
  useEffect(() => {
    maxFpsRef.current = maxFps
    if (api && !closing) api.setContinuousRender(true, maxFps)
  }, [api, closing, maxFps])

  // Esc stops; Space pauses; the arrow keys skip between facilities.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') controls.current?.stop()
      else if (event.key === ' ' && !(event.target instanceof HTMLButtonElement)) controls.current?.togglePause()
      else if (event.key === 'ArrowRight') controls.current?.step(1)
      else if (event.key === 'ArrowLeft') controls.current?.step(-1)
      else return
      event.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Any drag, scroll, or click on the map hands control back; pin clicks are handled by the pin.
  useEffect(() => {
    if (!interactionTarget) return
    const onInteract = (event: Event) => {
      const target = event.target as Element | null
      if (target?.closest('.preview-tour, .globe-pin, .leaflet-marker-icon')) return
      controls.current?.stop()
    }
    interactionTarget.addEventListener('pointerdown', onInteract)
    interactionTarget.addEventListener('wheel', onInteract, { passive: true })
    return () => {
      interactionTarget.removeEventListener('pointerdown', onInteract)
      interactionTarget.removeEventListener('wheel', onInteract)
    }
  }, [interactionTarget])

  const { stops: stopCues, chapters: chapterCues, finale, duration } = choreography
  const percent = (time: number) => (time / duration) * 100
  const finaleTitle = `${stops.length} FACILITIES · ${chapters.length} REGIONS`
  const showFinaleHint = () => setHint({ left: percent((finale.start + duration) / 2), kicker: 'Finale', label: 'All regions' })

  return (
    <div ref={rootRef} className={`preview-tour${closing ? ' is-closing' : ''}${api ? ' is-ready' : ''}`} data-testid="preview-tour" role="region" aria-label="Network preview" aria-roledescription="presentation">
      <div className="preview-bar preview-bar-top">
        <div className="preview-slot preview-chapter-labels">
          {chapters.map((chapter, index) => (
            <span key={chapter.regionId} data-chapter-label={index}>{chapter.label} · {facilityCount(chapter.stops.length)}</span>
          ))}
          <span data-finale-label>All regions · {stops.length} facilities</span>
        </div>
        <div className="preview-slot preview-local-times">
          {stops.map((stop) => <span key={stop.facility.id} data-stop-time={stop.index}>Local time {localTime(stop.facility)}</span>)}
        </div>
      </div>

      <div className="preview-titles">
        {chapters.map((chapter, index) => (
          <div key={chapter.regionId} className="preview-title preview-chapter-intro" data-chapter-intro={index}>
            <h2 data-split style={titleFit(chapter.label)}>{chapter.label.toUpperCase()}</h2>
            <p>{facilityCount(chapter.stops.length)}</p>
          </div>
        ))}
        {stops.map((stop) => {
          const details = stopDetails(stop.facility)
          return (
            <div key={stop.facility.id} className="preview-title preview-stop" data-stop={stop.index}>
              <span className="preview-stop-number" aria-hidden="true">{pad(stop.facility.number)}</span>
              <h2 data-split style={titleFit(stopTitle(stop.facility))}>{stopTitle(stop.facility)}</h2>
              {stop.facility.city && <p className="preview-stop-state">{stop.facility.stateName.toUpperCase()}</p>}
              <p className="preview-stop-detail"><span>{stop.facility.fullAddress}</span>{renderOpenState(stop.facility)}</p>
              <div className="preview-stop-card" data-testid="preview-stop-card">
                {details.photo && <img className="preview-stop-photo" src={details.photo.src} alt={details.photo.alt} decoding="async" />}
                <dl className="preview-stop-facts">
                  {details.totalSquareFeet !== undefined && <div><dt>Total</dt><dd>{details.totalSquareFeet.toLocaleString('en-US')} SQF</dd></div>}
                  {details.available && <div data-testid="preview-stop-available"><dt>Available</dt><dd>{details.available}</dd></div>}
                  {details.facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}
                </dl>
              </div>
            </div>
          )
        })}
        <div className="preview-title preview-finale" data-finale>
          <h2 data-split style={titleFit(finaleTitle)}>{finaleTitle}</h2>
          <p>One network</p>
        </div>
      </div>

      <div className="preview-bar preview-bar-bottom">
        <div className="preview-progress" role="group" aria-label="Tour progress">
          <i className="preview-progress-fill" aria-hidden="true" />
          {chapterCues.map((cue) => {
            const chapter = chapters[cue.chapterIndex]
            const show = () => setHint({ left: percent((cue.start + cue.end) / 2), kicker: facilityCount(chapter.stops.length), label: chapter.label })
            return (
              <button
                key={cue.chapterIndex}
                type="button"
                className="preview-segment"
                style={{ left: `${percent(cue.start)}%`, width: `${percent(cue.end - cue.start)}%` }}
                aria-label={`Jump to region ${chapter.label}, ${facilityCount(chapter.stops.length)}`}
                onClick={() => controls.current?.jumpToRegion(cue.chapterIndex)}
                onPointerEnter={show}
                onPointerLeave={() => setHint(null)}
                onFocus={show}
                onBlur={() => setHint(null)}
              />
            )
          })}
          <button
            type="button"
            className="preview-finale-zone"
            style={{ left: `${percent(finale.start)}%`, width: `${percent(duration - finale.start)}%` }}
            aria-label="Jump to finale"
            onClick={() => controls.current?.jumpToFinale()}
            onPointerEnter={showFinaleHint}
            onPointerLeave={() => setHint(null)}
            onFocus={showFinaleHint}
            onBlur={() => setHint(null)}
          />
          {stopCues.map((cue) => {
            const facility = stops[cue.stopIndex].facility
            const show = () => setHint({ left: percent(cue.arrival), kicker: `Facility ${pad(facility.number)}`, label: facility.city ? `${facility.city}, ${facility.state}` : facility.stateName })
            return (
              <button
                key={facility.id}
                type="button"
                className="preview-tick"
                data-tick={cue.stopIndex}
                style={{ left: `${percent(cue.arrival)}%` }}
                aria-label={`Jump to facility ${pad(facility.number)}, ${facility.city ?? facility.stateName}`}
                onClick={() => controls.current?.jump(cue.stopIndex)}
                onPointerEnter={show}
                onPointerLeave={() => setHint(null)}
                onFocus={show}
                onBlur={() => setHint(null)}
              />
            )
          })}
          {hint && (
            <div className="preview-progress-hint" aria-hidden="true" style={{ left: `clamp(80px, ${hint.left}%, calc(100% - 80px))` }}>
              <small>{hint.kicker}</small>
              <strong>{hint.label}</strong>
            </div>
          )}
        </div>
        <div className="preview-controls">
          <button type="button" aria-label="Previous facility" onClick={() => controls.current?.step(-1)}><SkipBack size={16} /></button>
          <button type="button" aria-label={paused ? 'Play preview' : 'Pause preview'} onClick={() => controls.current?.togglePause()}>{paused ? <Play size={16} /> : <Pause size={16} />}</button>
          <button type="button" aria-label="Next facility" onClick={() => controls.current?.step(1)}><SkipForward size={16} /></button>
          <button type="button" className="preview-stop-button" aria-label="Stop preview" onClick={() => controls.current?.stop()}><X size={16} /><span>Stop</span></button>
        </div>
        <img className="preview-logo" src="/brand/item-logo-fullcolor-whitetxt.svg" alt="ITEM" />
      </div>
      <div ref={announcerRef} className="sr-only" aria-live="polite" />
    </div>
  )
}
