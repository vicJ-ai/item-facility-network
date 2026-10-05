import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from 'react'
import { usePersistentState } from './usePersistentState'

const DIRECTORY_WIDTH_STORAGE_KEY = 'facility-directory-width-v1'
const DEFAULT_DIRECTORY_RATIO = 0.36
const MIN_DIRECTORY_RATIO = 0.25
const MAX_DIRECTORY_RATIO = 0.55
const MIN_DIRECTORY_WIDTH = 420
const MAX_DIRECTORY_WIDTH = 760
const MIN_MAP_WIDTH = 360
// At or below this width the directory and map stack, so there is nothing to resize.
const STACKED_LAYOUT_MAX_WIDTH = 820

function directoryWidthBounds(totalWidth: number) {
  const min = Math.min(Math.max(MIN_DIRECTORY_WIDTH, totalWidth * MIN_DIRECTORY_RATIO), totalWidth - MIN_MAP_WIDTH)
  const max = Math.max(min, Math.min(MAX_DIRECTORY_WIDTH, totalWidth * MAX_DIRECTORY_RATIO, totalWidth - MIN_MAP_WIDTH))
  return { min: Math.round(min), max: Math.round(max) }
}

function clampDirectoryWidth(width: number, totalWidth: number) {
  const { min, max } = directoryWidthBounds(totalWidth)
  return Math.min(max, Math.max(min, Math.round(width)))
}

function loadDirectoryWidth(stored: string | null) {
  const totalWidth = window.innerWidth
  const saved = Number(stored)
  if (Number.isFinite(saved) && saved > 0) return clampDirectoryWidth(saved, totalWidth)
  return clampDirectoryWidth(totalWidth * DEFAULT_DIRECTORY_RATIO, totalWidth)
}

const saveDirectoryWidth = (width: number) => String(width)

/**
 * The width of the facility directory beside the map, set by dragging or with the arrow keys on the
 * separator. `separatorProps` holds the separator's ARIA values and handlers.
 */
export function useDirectoryResize(containerRef: RefObject<HTMLElement | null>) {
  const [width, setWidth] = usePersistentState(DIRECTORY_WIDTH_STORAGE_KEY, loadDirectoryWidth, saveDirectoryWidth)
  const [isResizing, setIsResizing] = useState(false)
  const drag = useRef<{ pointerId: number; startX: number; startWidth: number } | null>(null)

  // The container's width bounds the directory, so it is tracked as state for the separator's ARIA values.
  const [totalWidth, setTotalWidth] = useState(() => window.innerWidth)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    // The observer reports once when it starts, then whenever the container resizes.
    const observer = new ResizeObserver(() => {
      const nextTotalWidth = container.clientWidth
      setTotalWidth(nextTotalWidth)
      if (window.innerWidth > STACKED_LAYOUT_MAX_WIDTH) setWidth((current) => clampDirectoryWidth(current, nextTotalWidth))
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [containerRef, setWidth])

  useEffect(() => {
    if (!isResizing) return
    document.body.classList.add('is-resizing-explorer')
    return () => document.body.classList.remove('is-resizing-explorer')
  }, [isResizing])

  const resize = (nextWidth: number) => setWidth(clampDirectoryWidth(nextWidth, totalWidth))
  const bounds = directoryWidthBounds(totalWidth)

  const finish = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    drag.current = null
    setIsResizing(false)
  }

  const separatorProps = {
    'aria-valuemin': bounds.min,
    'aria-valuemax': bounds.max,
    'aria-valuenow': width,
    'aria-valuetext': `${Math.round((width / totalWidth) * 100)}% directory width`,
    onDoubleClick: () => resize(totalWidth * DEFAULT_DIRECTORY_RATIO),
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
      const step = event.shiftKey ? 64 : 24
      let nextWidth: number | null = null
      if (event.key === 'ArrowLeft') nextWidth = width - step
      if (event.key === 'ArrowRight') nextWidth = width + step
      if (event.key === 'Home') nextWidth = bounds.min
      if (event.key === 'End') nextWidth = bounds.max
      if (nextWidth === null) return
      event.preventDefault()
      resize(nextWidth)
    },
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      if (window.innerWidth <= STACKED_LAYOUT_MAX_WIDTH || event.button !== 0) return
      event.preventDefault()
      drag.current = { pointerId: event.pointerId, startX: event.clientX, startWidth: width }
      event.currentTarget.setPointerCapture(event.pointerId)
      setIsResizing(true)
    },
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
      const current = drag.current
      if (!current || current.pointerId !== event.pointerId) return
      resize(current.startWidth + event.clientX - current.startX)
    },
    onPointerUp: finish,
    onPointerCancel: finish,
  }

  return { width, isResizing, separatorProps }
}
