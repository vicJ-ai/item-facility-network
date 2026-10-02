import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from 'pdf-lib'
import type { Facility } from '../data/facilities'
import { formatCeilingHeight, formatLoadingDocks, getFacilityBuildingDetails } from '../data/facility-building'
import { formatOperatingHours, type FacilityOperatingHours } from '../data/facility-hours'
import type { FacilityMedia } from '../data/facility-media'
import type { FacilityContact, FacilityOperations } from '../data/facility-operations'
import { displayFactUnit, sitePlanProvenanceLabel, type FacilitySitePlan, type FacilitySitePlanFact } from '../data/facility-site-plans'
import { formatAvailableSpace, formatBulkSquareFeet, formatTotalSquareFeet, getFacilityBulkRack, getFacilitySquareFootage, hasReportedAvailableSpace } from '../data/facility-space'
import type { UserProvidedFacilityPhoto, UserProvidedFacilityPhotos } from '../data/facility-user-photos'

export type FacilityProfileData = {
  facility: Facility
  facilityTitle: string
  operatingHours?: FacilityOperatingHours
  media?: FacilityMedia
  operations?: FacilityOperations
  sitePlan?: FacilitySitePlan
  userPhotos?: UserProvidedFacilityPhotos
}

type Fonts = {
  regular: PDFFont
  bold: PDFFont
  italic: PDFFont
}

type EmbeddedAsset = {
  image: PDFImage
  width: number
  height: number
}

const PAGE_WIDTH = 612
const PAGE_HEIGHT = 792
const MARGIN = 42
const NAVY = rgb(0.035, 0.12, 0.22)
const NAVY_SOFT = rgb(0.075, 0.19, 0.31)
const RED = rgb(0.82, 0.055, 0.075)
const INK = rgb(0.08, 0.12, 0.18)
const MUTED = rgb(0.38, 0.43, 0.49)
const LINE = rgb(0.84, 0.86, 0.88)
const PALE = rgb(0.955, 0.962, 0.97)
const WHITE = rgb(1, 1, 1)

function facilityNumber(facility: Facility) {
  return String(facility.number).padStart(2, '0')
}

export function getFacilityProfileFilename(facility: Facility) {
  return `facility-${facilityNumber(facility)}-${facility.id}-profile.pdf`
}

function formatFact(fact: FacilitySitePlanFact) {
  const value = typeof fact.value === 'number' ? fact.value.toLocaleString('en-US') : fact.value
  return `${value}${fact.unit ? ` ${displayFactUnit(fact.unit)}` : ''}`
}

function splitText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.replace(/\s+/g, ' ').trim().split(' ')
  if (!words[0]) return []
  const lines: string[] = []
  let line = words[0]
  for (const word of words.slice(1)) {
    const candidate = `${line} ${word}`
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate
    } else {
      lines.push(line)
      line = word
    }
  }
  lines.push(line)
  return lines
}

function drawWrappedText(page: PDFPage, text: string, options: {
  x: number
  y: number
  width: number
  font: PDFFont
  size: number
  color?: ReturnType<typeof rgb>
  lineHeight?: number
  maxLines?: number
}) {
  const lineHeight = options.lineHeight ?? options.size * 1.25
  const lines = splitText(text, options.font, options.size, options.width)
  const visible = options.maxLines ? lines.slice(0, options.maxLines) : lines
  visible.forEach((line, index) => {
    page.drawText(line, {
      x: options.x,
      y: options.y - index * lineHeight,
      size: options.size,
      font: options.font,
      color: options.color ?? INK,
    })
  })
  return options.y - visible.length * lineHeight
}

function drawHeader(page: PDFPage, fonts: Fonts, section: string) {
  page.drawText('UNIS', { x: MARGIN, y: 747, size: 25, font: fonts.bold, color: RED })
  page.drawText('FACILITY NETWORK', { x: MARGIN + 78, y: 753, size: 7.5, font: fonts.bold, color: NAVY })
  page.drawText(section.toUpperCase(), {
    x: PAGE_WIDTH - MARGIN - fonts.bold.widthOfTextAtSize(section.toUpperCase(), 8),
    y: 753,
    size: 8,
    font: fonts.bold,
    color: NAVY,
  })
  page.drawLine({ start: { x: MARGIN, y: 735 }, end: { x: PAGE_WIDTH - MARGIN, y: 735 }, thickness: 2, color: RED })
}

function drawFooter(page: PDFPage, fonts: Fonts, pageNumber: number, source: string) {
  page.drawLine({ start: { x: MARGIN, y: 42 }, end: { x: PAGE_WIDTH - MARGIN, y: 42 }, thickness: 0.7, color: LINE })
  drawWrappedText(page, source, { x: MARGIN, y: 28, width: 390, font: fonts.regular, size: 6.5, color: MUTED, maxLines: 1 })
  const footer = `UNIS FACILITY PROFILE / ${String(pageNumber).padStart(2, '0')}`
  page.drawText(footer, { x: PAGE_WIDTH - MARGIN - fonts.bold.widthOfTextAtSize(footer, 7), y: 28, size: 7, font: fonts.bold, color: NAVY })
}

function drawSectionTitle(page: PDFPage, fonts: Fonts, eyebrow: string, title: string, y: number) {
  page.drawText(eyebrow.toUpperCase(), { x: MARGIN, y, size: 7, font: fonts.bold, color: RED })
  drawWrappedText(page, title, { x: MARGIN, y: y - 25, width: PAGE_WIDTH - MARGIN * 2, font: fonts.bold, size: 22, color: NAVY, lineHeight: 24, maxLines: 2 })
}

function drawContainedImage(page: PDFPage, asset: EmbeddedAsset, box: { x: number; y: number; width: number; height: number }, background = PALE) {
  page.drawRectangle({ ...box, color: background, borderColor: LINE, borderWidth: 0.7 })
  const scale = Math.min(box.width / asset.width, box.height / asset.height)
  const width = asset.width * scale
  const height = asset.height * scale
  page.drawImage(asset.image, {
    x: box.x + (box.width - width) / 2,
    y: box.y + (box.height - height) / 2,
    width,
    height,
  })
}

function drawImagePlaceholder(page: PDFPage, fonts: Fonts, box: { x: number; y: number; width: number; height: number }, title: string, detail: string) {
  page.drawRectangle({ ...box, color: PALE, borderColor: LINE, borderWidth: 0.8 })
  const titleWidth = fonts.bold.widthOfTextAtSize(title, 13)
  page.drawText(title, { x: box.x + (box.width - titleWidth) / 2, y: box.y + box.height / 2 + 6, size: 13, font: fonts.bold, color: NAVY })
  const detailWidth = fonts.regular.widthOfTextAtSize(detail, 8)
  page.drawText(detail, { x: box.x + Math.max(12, (box.width - detailWidth) / 2), y: box.y + box.height / 2 - 12, size: 8, font: fonts.regular, color: MUTED })
}

function drawFactCard(page: PDFPage, fonts: Fonts, fact: { label: string; value: string; note?: string }, box: { x: number; y: number; width: number; height: number }) {
  page.drawRectangle({ ...box, color: PALE, borderColor: LINE, borderWidth: 0.6 })
  page.drawText(fact.label.toUpperCase(), { x: box.x + 11, y: box.y + box.height - 16, size: 6.6, font: fonts.bold, color: MUTED })
  drawWrappedText(page, fact.value, { x: box.x + 11, y: box.y + box.height - 35, width: box.width - 22, font: fonts.bold, size: 13, color: NAVY, maxLines: 1 })
  if (fact.note) drawWrappedText(page, fact.note, { x: box.x + 11, y: box.y + 12, width: box.width - 22, font: fonts.regular, size: 6.6, color: MUTED, lineHeight: 8, maxLines: 2 })
}

async function decodeImage(blob: Blob) {
  if ('createImageBitmap' in window) {
    const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' })
    return {
      width: bitmap.width,
      height: bitmap.height,
      draw: (context: CanvasRenderingContext2D, width: number, height: number) => context.drawImage(bitmap, 0, 0, width, height),
      close: () => bitmap.close(),
    }
  }

  const objectUrl = URL.createObjectURL(blob)
  const image = new Image()
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('The image could not be decoded.'))
      image.src = objectUrl
    })
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      draw: (context: CanvasRenderingContext2D, width: number, height: number) => context.drawImage(image, 0, 0, width, height),
      close: () => URL.revokeObjectURL(objectUrl),
    }
  } catch (error) {
    URL.revokeObjectURL(objectUrl)
    throw error
  }
}

async function normalizePhoto(blob: Blob, maxDimension = 1800) {
  const decoded = await decodeImage(blob)
  try {
    const scale = Math.min(1, maxDimension / Math.max(decoded.width, decoded.height))
    const width = Math.max(1, Math.round(decoded.width * scale))
    const height = Math.max(1, Math.round(decoded.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas image conversion is unavailable.')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)
    decoded.draw(context, width, height)
    const output = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Image conversion failed.')), 'image/jpeg', 0.86)
    })
    return { bytes: new Uint8Array(await output.arrayBuffer()), width, height }
  } finally {
    decoded.close()
  }
}

function isPng(bytes: Uint8Array) {
  return bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
}

function isJpeg(bytes: Uint8Array) {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
}

async function fetchLocalAsset(assetUrl: string) {
  const resolved = new URL(assetUrl, window.location.origin)
  if (resolved.origin !== window.location.origin) throw new Error('Only same-origin facility assets can be embedded.')
  const response = await fetch(resolved.href)
  if (!response.ok) throw new Error(`Asset request failed (${response.status}).`)
  return response.blob()
}

function createAssetLoader(pdf: PDFDocument) {
  const cache = new Map<string, Promise<EmbeddedAsset | null>>()
  return (assetUrl: string, kind: 'photo' | 'plan') => {
    const key = `${kind}:${assetUrl}`
    const existing = cache.get(key)
    if (existing) return existing
    const pending = (async () => {
      try {
        const blob = await fetchLocalAsset(assetUrl)
        if (kind === 'photo') {
          const normalized = await normalizePhoto(blob)
          const image = await pdf.embedJpg(normalized.bytes)
          return { image, width: normalized.width, height: normalized.height }
        }
        const bytes = new Uint8Array(await blob.arrayBuffer())
        if (isPng(bytes)) {
          const image = await pdf.embedPng(bytes)
          return { image, width: image.width, height: image.height }
        }
        if (isJpeg(bytes)) {
          const image = await pdf.embedJpg(bytes)
          return { image, width: image.width, height: image.height }
        }
        const normalized = await normalizePhoto(blob, 2400)
        const image = await pdf.embedJpg(normalized.bytes)
        return { image, width: normalized.width, height: normalized.height }
      } catch {
        return null
      }
    })()
    cache.set(key, pending)
    return pending
  }
}

function photoSource(data: FacilityProfileData) {
  if (data.userPhotos) return 'User-provided media'
  if (data.media?.verification === 'official-facility-sheet') return 'Official UNIS facility sheet media'
  if (data.media?.verification.startsWith('user-provided')) return 'User-provided screenshot media'
  if (data.media) return 'Official UNIS directory listing media'
  return 'No facility photo provided'
}

function operatingHoursText(hours?: FacilityOperatingHours) {
  return hours ? formatOperatingHours(hours) : 'Hours not provided'
}

function operatingHoursSource(hours?: FacilityOperatingHours) {
  if (!hours) return 'No operating hours supplied'
  return hours.status === 'confirmed'
    ? `User-confirmed · ${hours.sourceRowLabel}`
    : `User-provided · As supplied · ${hours.sourceRowLabel}`
}

// Page 1 shows the same key facts, values, and wording as the Overview, Dashboard preview, and Preview tour. Available
// appears only once a site reports it, and Bulk fills the fourth card otherwise.
function pageOneFacts(data: FacilityProfileData) {
  const { totalSquareFeet, available } = getFacilitySquareFootage(data.facility.id)
  const building = getFacilityBuildingDetails(data.facility.id)
  const facts: Array<{ label: string; value: string; note?: string }> = [
    { label: 'Total', value: formatTotalSquareFeet(totalSquareFeet) },
    ...(hasReportedAvailableSpace(available) ? [{ label: 'Available', value: formatAvailableSpace(available) }] : []),
    { label: 'Ceiling height', value: formatCeilingHeight(building, 'Pending') },
    { label: 'Loading docks', value: formatLoadingDocks(building, 'Pending') },
    { label: 'Bulk', value: formatBulkSquareFeet(getFacilityBulkRack(data.facility.id)) },
  ]
  return facts.slice(0, 4)
}

function contactPhoneText(contact: FacilityContact) {
  if (contact.phones?.length) return contact.phones.map((phone) => `${phone.label}: ${phone.display}`).join(' · ')
  if (contact.phone) return `Phone: ${contact.phone}`
  return ''
}

function drawContactDirectory(page: PDFPage, fonts: Fonts, data: FacilityProfileData, box: { x: number; y: number; width: number; height: number }) {
  page.drawRectangle({ ...box, color: NAVY_SOFT })
  page.drawText('CONTACT DIRECTORY', { x: box.x + 15, y: box.y + box.height - 22, size: 7, font: fonts.bold, color: rgb(0.76, 0.82, 0.88) })

  if (!data.operations) {
    page.drawText('Contacts pending review', { x: box.x + 15, y: box.y + box.height - 57, size: 15, font: fonts.bold, color: WHITE })
    drawWrappedText(page, 'No staff contacts were confidently matched to this facility.', {
      x: box.x + 15,
      y: box.y + box.height - 80,
      width: box.width - 30,
      font: fonts.regular,
      size: 8.5,
      color: rgb(0.84, 0.88, 0.92),
      maxLines: 2,
    })
    return
  }

  // The contact source note stays in the PDF's metadata keywords but is not printed on the page.
  // Three rows fit the box: two columns hold up to six contacts and three columns up to nine. Anything beyond that is
  // counted in a note rather than silently dropped.
  const MAX_CONTACTS = 9
  const contacts = data.operations.contacts.slice(0, MAX_CONTACTS)
  const hidden = data.operations.contacts.length - contacts.length
  const columns = contacts.length > 6 ? 3 : 2
  const rows = Math.ceil(contacts.length / columns)
  const columnGap = columns === 3 ? 14 : 18
  const columnWidth = (box.width - 30 - columnGap * (columns - 1)) / columns
  const cardsTop = box.y + box.height - 52
  const cardsBottom = box.y + 10
  const rowHeight = (cardsTop - cardsBottom) / Math.max(1, rows)

  contacts.forEach((contact, index) => {
    const column = Math.floor(index / rows)
    const row = index % rows
    const x = box.x + 15 + column * (columnWidth + columnGap)
    const top = cardsTop - row * rowHeight
    const phone = contactPhoneText(contact)
    // Long titles and phone lines may wrap to a second line in the narrower three-column layout.
    if (contact.role) drawWrappedText(page, contact.role, { x, y: top - 8, width: columnWidth, font: fonts.bold, size: 5.8, color: rgb(0.76, 0.82, 0.88), lineHeight: 6.4, maxLines: 2 })
    drawWrappedText(page, contact.name, { x, y: top - 25, width: columnWidth, font: fonts.bold, size: 8.8, color: WHITE, maxLines: 1 })
    if (contact.email) drawWrappedText(page, contact.email, { x, y: top - 37, width: columnWidth, font: fonts.regular, size: 6.3, color: rgb(0.88, 0.91, 0.94), maxLines: 1 })
    if (phone) drawWrappedText(page, phone, { x, y: contact.email ? top - 48 : top - 37, width: columnWidth, font: fonts.regular, size: 6.2, color: rgb(0.88, 0.91, 0.94), lineHeight: 7.2, maxLines: 2 })
    if (row < rows - 1) page.drawLine({ start: { x, y: top - rowHeight + 5 }, end: { x: x + columnWidth, y: top - rowHeight + 5 }, thickness: 0.45, color: rgb(0.27, 0.37, 0.47) })
  })

  for (let column = 1; column < Math.ceil(contacts.length / rows); column += 1) {
    const dividerX = box.x + 15 + column * (columnWidth + columnGap) - columnGap / 2
    page.drawLine({ start: { x: dividerX, y: cardsBottom }, end: { x: dividerX, y: cardsTop }, thickness: 0.45, color: rgb(0.27, 0.37, 0.47) })
  }
  if (hidden > 0) {
    page.drawText(`+${hidden} more in the Operations tab`, { x: box.x + box.width - 120, y: box.y + box.height - 22, size: 6.5, font: fonts.regular, color: rgb(0.76, 0.82, 0.88) })
  }
}

async function drawOverviewPage(pdf: PDFDocument, fonts: Fonts, data: FacilityProfileData, loadAsset: ReturnType<typeof createAssetLoader>) {
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  drawHeader(page, fonts, 'Overview')
  drawSectionTitle(page, fonts, `Facility ${facilityNumber(data.facility)}`, data.facilityTitle, 707)
  drawWrappedText(page, data.facility.fullAddress, { x: MARGIN, y: 650, width: PAGE_WIDTH - MARGIN * 2, font: fonts.regular, size: 10, color: MUTED, maxLines: 2 })

  const coverUrl = data.userPhotos?.photos.find((photo) => photo.id === data.userPhotos?.coverPhotoId)?.assetUrl ?? data.media?.detail.assetUrl
  const cover = coverUrl ? await loadAsset(coverUrl, 'photo') : null
  const heroBox = { x: MARGIN, y: 485, width: PAGE_WIDTH - MARGIN * 2, height: 130 }
  if (cover) drawContainedImage(page, cover, heroBox)
  else drawImagePlaceholder(page, fonts, heroBox, 'Photo not provided', 'Facility profile remains available without media.')

  page.drawRectangle({ x: MARGIN, y: 445, width: PAGE_WIDTH - MARGIN * 2, height: 40, color: NAVY })
  drawWrappedText(page, data.facility.fullAddress, { x: MARGIN + 15, y: 468, width: PAGE_WIDTH - MARGIN * 2 - 30, font: fonts.bold, size: 9.5, color: WHITE, maxLines: 2 })

  const facts = pageOneFacts(data)
  const gap = 8
  const cardWidth = (PAGE_WIDTH - MARGIN * 2 - gap) / 2
  facts.slice(0, 4).forEach((fact, index) => {
    const row = Math.floor(index / 2)
    const col = index % 2
    drawFactCard(page, fonts, fact, { x: MARGIN + col * (cardWidth + gap), y: 382 - row * 56, width: cardWidth, height: 52 })
  })

  drawContactDirectory(page, fonts, data, { x: MARGIN, y: 58, width: PAGE_WIDTH - MARGIN * 2, height: 254 })
  drawFooter(page, fonts, 1, `${photoSource(data)} · Generated from current portal data`)
}

async function drawSitePlanPage(pdf: PDFDocument, fonts: Fonts, data: FacilityProfileData, loadAsset: ReturnType<typeof createAssetLoader>) {
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  drawHeader(page, fonts, 'Site plan')
  drawSectionTitle(page, fonts, `Facility ${facilityNumber(data.facility)}`, 'Site plan', 707)
  drawWrappedText(page, data.facility.fullAddress, { x: MARGIN, y: 650, width: 528, font: fonts.regular, size: 9, color: MUTED, maxLines: 1 })

  const plan = data.sitePlan ? await loadAsset(data.sitePlan.assetUrl, 'plan') : null
  const planBox = { x: MARGIN, y: 298, width: PAGE_WIDTH - MARGIN * 2, height: 327 }
  if (plan) drawContainedImage(page, plan, planBox, WHITE)
  else drawImagePlaceholder(page, fonts, planBox, 'Site plan not provided', 'No site plan is associated with this facility.')

  if (data.sitePlan) {
    const facts = data.sitePlan.facts.slice(0, 6)
    const columns = facts.length <= 3 ? facts.length : 3
    const gap = 7
    const width = (PAGE_WIDTH - MARGIN * 2 - gap * (columns - 1)) / columns
    facts.forEach((fact, index) => {
      const row = Math.floor(index / columns)
      const col = index % columns
      drawFactCard(page, fonts, { label: fact.label, value: formatFact(fact), note: fact.note }, {
        x: MARGIN + col * (width + gap),
        y: 210 - row * 77,
        width,
        height: 68,
      })
    })
  }

  const source = data.sitePlan
    ? `${sitePlanProvenanceLabel(data.sitePlan)}${data.sitePlan.sourceNote ? ` · ${data.sitePlan.sourceNote}` : ''}`
    : 'Site plan not provided'
  drawFooter(page, fonts, 2, source)
}

function drawHighlightsPage(pdf: PDFDocument, fonts: Fonts, data: FacilityProfileData) {
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  drawHeader(page, fonts, 'Key advantages')
  drawSectionTitle(page, fonts, `Facility ${facilityNumber(data.facility)}`, 'Key advantages & location', 707)
  drawWrappedText(page, 'Facility advantages below reflect supplied property facts only.', { x: MARGIN, y: 640, width: 528, font: fonts.italic, size: 9, color: MUTED })

  const location = data.facility.city ? `${data.facility.city}, ${data.facility.stateName}` : data.facility.stateName
  const gap = 8
  const halfWidth = (PAGE_WIDTH - MARGIN * 2 - gap) / 2
  page.drawText('LOCATION CONTEXT', { x: MARGIN, y: 610, size: 7, font: fonts.bold, color: RED })
  drawFactCard(page, fonts, { label: 'Provided address', value: data.facility.fullAddress }, { x: MARGIN, y: 535, width: PAGE_WIDTH - MARGIN * 2, height: 58 })
  drawFactCard(page, fonts, { label: 'Location', value: location }, { x: MARGIN, y: 469, width: halfWidth, height: 58 })
  drawFactCard(page, fonts, {
    label: 'Operating hours',
    value: operatingHoursText(data.operatingHours),
    note: operatingHoursSource(data.operatingHours),
  }, { x: MARGIN + halfWidth + gap, y: 469, width: halfWidth, height: 58 })

  page.drawText('KEY ADVANTAGES', { x: MARGIN, y: 445, size: 7, font: fonts.bold, color: RED })
  const facts = data.sitePlan?.facts.slice(0, 6) ?? []
  if (facts.length > 0) {
    facts.forEach((fact, index) => {
      const row = Math.floor(index / 2)
      const col = index % 2
      drawFactCard(page, fonts, { label: fact.label, value: formatFact(fact), note: fact.note }, {
        x: MARGIN + col * (halfWidth + gap),
        y: 350 - row * 84,
        width: halfWidth,
        height: 76,
      })
    })
  } else {
    const box = { x: MARGIN, y: 182, width: PAGE_WIDTH - MARGIN * 2, height: 244 }
    page.drawRectangle({ ...box, color: PALE, borderColor: LINE, borderWidth: 0.7 })
    const title = 'Specific advantages not supplied'
    const detail = 'No site-plan or property facts are recorded for this facility.'
    page.drawText(title, { x: box.x + (box.width - fonts.bold.widthOfTextAtSize(title, 13)) / 2, y: box.y + 130, size: 13, font: fonts.bold, color: NAVY })
    page.drawText(detail, { x: box.x + (box.width - fonts.regular.widthOfTextAtSize(detail, 8)) / 2, y: box.y + 108, size: 8, font: fonts.regular, color: MUTED })
  }

  const mediaSummary = data.userPhotos
    ? `${data.userPhotos.photos.length} user-provided photo${data.userPhotos.photos.length === 1 ? '' : 's'}`
    : photoSource(data)
  const planSummary = data.sitePlan ? sitePlanProvenanceLabel(data.sitePlan) : 'Site plan not provided'
  page.drawRectangle({ x: MARGIN, y: 66, width: PAGE_WIDTH - MARGIN * 2, height: 52, color: NAVY })
  page.drawText('PROFILE SOURCES', { x: MARGIN + 14, y: 96, size: 6.5, font: fonts.bold, color: rgb(0.73, 0.8, 0.87) })
  drawWrappedText(page, `${mediaSummary} · ${planSummary}`, { x: MARGIN + 14, y: 80, width: PAGE_WIDTH - MARGIN * 2 - 28, font: fonts.bold, size: 8.5, color: WHITE, maxLines: 1 })
  drawFooter(page, fonts, 3, 'Location context and supplied facility facts from current portal data')
}

function photoLayout(count: number) {
  if (count <= 1) return [{ x: MARGIN, y: 122, width: 528, height: 500 }]
  if (count === 2) return [
    { x: MARGIN, y: 376, width: 528, height: 246 },
    { x: MARGIN, y: 105, width: 528, height: 246 },
  ]
  if (count === 3) return [
    { x: MARGIN, y: 351, width: 528, height: 271 },
    { x: MARGIN, y: 105, width: 260, height: 221 },
    { x: 310, y: 105, width: 260, height: 221 },
  ]
  if (count === 4) return [
    { x: MARGIN, y: 365, width: 260, height: 257 },
    { x: 310, y: 365, width: 260, height: 257 },
    { x: MARGIN, y: 105, width: 260, height: 235 },
    { x: 310, y: 105, width: 260, height: 235 },
  ]
  return [
    { x: MARGIN, y: 363, width: 320, height: 259 },
    { x: 370, y: 491, width: 200, height: 131 },
    { x: 370, y: 335, width: 200, height: 131 },
    { x: MARGIN, y: 105, width: 260, height: 205 },
    { x: 310, y: 105, width: 260, height: 205 },
  ]
}

async function drawPhotosPage(pdf: PDFDocument, fonts: Fonts, data: FacilityProfileData, loadAsset: ReturnType<typeof createAssetLoader>) {
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  drawHeader(page, fonts, 'Photos')
  drawSectionTitle(page, fonts, `Facility ${facilityNumber(data.facility)}`, 'Facility photos', 707)
  drawWrappedText(page, data.facility.fullAddress, { x: MARGIN, y: 650, width: 528, font: fonts.regular, size: 9, color: MUTED, maxLines: 1 })

  const photos: Array<{ assetUrl: string; label: string; source: string }> = data.userPhotos
    ? data.userPhotos.photos.slice(0, 5).map((photo: UserProvidedFacilityPhoto) => ({ ...photo, source: 'User-provided' }))
    : data.media ? [{
      assetUrl: data.media.detail.assetUrl,
      label: data.media.verification === 'official-facility-sheet' ? 'Official facility sheet photo' : data.media.verification.startsWith('user-provided') ? 'Existing facility photo' : 'Official listing photo',
      source: data.media.verification === 'official-facility-sheet' ? 'Official UNIS facility sheet' : data.media.verification.startsWith('user-provided') ? 'User-provided screenshot' : 'Official UNIS listing',
    }] : []

  if (photos.length === 0) {
    drawImagePlaceholder(page, fonts, { x: MARGIN, y: 155, width: 528, height: 467 }, 'Photos not provided', 'No facility photos are associated with this record.')
  } else {
    const boxes = photoLayout(photos.length)
    await Promise.all(photos.map(async (photo, index) => {
      const box = boxes[index]
      const asset = await loadAsset(photo.assetUrl, 'photo')
      if (asset) drawContainedImage(page, asset, box)
      else drawImagePlaceholder(page, fonts, box, 'Image unavailable', photo.label)
      const captionHeight = 25
      page.drawRectangle({ x: box.x, y: box.y, width: box.width, height: captionHeight, color: NAVY })
      const caption = `${photo.label} · ${photo.source}`
      drawWrappedText(page, caption, { x: box.x + 9, y: box.y + 9, width: box.width - 18, font: fonts.bold, size: 6.8, color: WHITE, maxLines: 1 })
    }))
  }
  drawFooter(page, fonts, 4, photoSource(data))
}

function metadataKeywords(data: FacilityProfileData) {
  const facts = data.sitePlan?.facts.flatMap((fact) => [fact.label, formatFact(fact), fact.note ?? '']) ?? []
  const photoLabels = data.userPhotos?.photos.map((photo) => photo.label) ?? []
  const contacts = data.operations
    ? [data.operations.source, ...data.operations.contacts.flatMap((contact) => [contact.role, contact.name, contact.email ?? '', contactPhoneText(contact)])]
    : ['Contacts pending review']
  return [
    `Facility ${facilityNumber(data.facility)}`,
    data.facility.id,
    data.facility.fullAddress,
    'Key advantages & location',
    data.sitePlan?.facts.length ? 'Sourced facility advantages' : 'Specific advantages not supplied',
    data.sitePlan ? sitePlanProvenanceLabel(data.sitePlan) : 'Site plan not provided',
    photoSource(data),
    operatingHoursText(data.operatingHours),
    operatingHoursSource(data.operatingHours),
    data.sitePlan?.sourceNote ?? '',
    ...facts,
    ...contacts,
    ...photoLabels,
  ].filter(Boolean)
}

export async function generateFacilityProfilePdf(data: FacilityProfileData) {
  const pdf = await PDFDocument.create()
  const fonts: Fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    italic: await pdf.embedFont(StandardFonts.HelveticaOblique),
  }
  const loadAsset = createAssetLoader(pdf)

  pdf.setTitle(`Facility ${facilityNumber(data.facility)} · ${data.facility.fullAddress}`)
  pdf.setAuthor('UNIS Facility Network')
  pdf.setSubject(data.facility.fullAddress)
  pdf.setKeywords(metadataKeywords(data))
  pdf.setCreator('UNIS Facility Network portal')
  pdf.setProducer('UNIS Facility Network portal')

  await drawOverviewPage(pdf, fonts, data, loadAsset)
  await drawSitePlanPage(pdf, fonts, data, loadAsset)
  drawHighlightsPage(pdf, fonts, data)
  await drawPhotosPage(pdf, fonts, data, loadAsset)

  return pdf.save({ useObjectStreams: false })
}
