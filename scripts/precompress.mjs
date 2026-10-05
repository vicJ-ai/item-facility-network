// Writes .br and .gz copies next to every compressible file in dist/, so a server can send them
// without compressing on the fly (nginx: gzip_static; brotli needs its module or a CDN).
// Runs as the last step of `npm run build`.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { brotliCompressSync, constants, gzipSync } from 'node:zlib'

const DIST = new URL('../dist/', import.meta.url)
const COMPRESSIBLE = /\.(?:js|mjs|css|html|json|svg|xml|wasm|txt|map)$/i
// Below this size the compressed copy saves too little to be worth a request header lookup.
const MIN_BYTES = 1024

function* files(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) yield* files(path)
    else yield path
  }
}

let count = 0
let before = 0
let afterBrotli = 0
let afterGzip = 0
for (const path of files(DIST.pathname.replace(/^\/([A-Za-z]:)/, '$1'))) {
  if (!COMPRESSIBLE.test(path) || statSync(path).size < MIN_BYTES) continue
  const source = readFileSync(path)
  const brotli = brotliCompressSync(source, { params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: source.length } })
  const gzip = gzipSync(source, { level: 9 })
  writeFileSync(`${path}.br`, brotli)
  writeFileSync(`${path}.gz`, gzip)
  count += 1
  before += source.length
  afterBrotli += brotli.length
  afterGzip += gzip.length
}

const mb = (bytes) => `${(bytes / 1_048_576).toFixed(2)} MB`
console.log(`precompressed ${count} files: ${mb(before)} → ${mb(afterBrotli)} brotli, ${mb(afterGzip)} gzip`)
