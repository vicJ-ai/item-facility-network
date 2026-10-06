import assert from 'node:assert/strict'
import { brotliDecompressSync, gunzipSync } from 'node:zlib'
import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'

const privateMarkers = [
  'michelle.topete@unisco.com',
  'john.diaz@unisco.com',
  'Ruben Jauregui',
  'User-provided facility contact sheet',
  '/api/operations/portraits/john-diaz.png',
  '/api/operations/portraits/compact-john-diaz.jpg',
  '/media/operations/people/john-diaz.png',
]

test('built public assets, gzip, and brotli copies contain no Operations registry or portrait paths', async () => {
  assert.equal(existsSync('public/media/operations'), false)
  const entries = await readdir('dist', { recursive: true, withFileTypes: true })
  const files = entries.filter((entry) => entry.isFile()).map((entry) => path.join(entry.parentPath, entry.name)).filter((file) => /\.(?:js|map)(?:\.gz|\.br)?$/.test(file))
  assert.ok(files.length > 0)
  for (const file of files) {
    const bytes = await readFile(file)
    const decoded = file.endsWith('.gz') ? gunzipSync(bytes) : file.endsWith('.br') ? brotliDecompressSync(bytes) : bytes
    const text = decoded.toString('utf8')
    for (const marker of privateMarkers) assert.equal(text.includes(marker), false, `${marker} leaked through ${file}`)
  }
})

test('private portrait bytes live only outside the static public tree', async () => {
  const files = await readdir('private-media/operations', { recursive: true, withFileTypes: true })
  const portraits = files.filter((entry) => entry.isFile() && /\.(?:png|jpe?g)$/i.test(entry.name))
  assert.equal(portraits.length, 88)
  // basename, not a '/'-suffix check, so the folder match also works with Windows '\' separators.
  assert.equal(portraits.filter((entry) => path.basename(entry.parentPath) === 'account-managers').length, 17)
  assert.equal(portraits.filter((entry) => path.basename(entry.parentPath) === 'compact').length, 40)
})
