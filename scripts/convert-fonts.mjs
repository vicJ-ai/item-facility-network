// Converts the Satoshi TTF fonts in public/fonts to WOFF2, which is about a third of the size.
// Run manually after replacing a font: node scripts/convert-fonts.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import wawoff2 from 'wawoff2'

const FONTS = new URL('../public/fonts/', import.meta.url)

for (const name of readdirSync(FONTS).filter((file) => file.endsWith('.ttf'))) {
  const source = readFileSync(new URL(name, FONTS))
  const woff2 = await wawoff2.compress(source)
  const target = name.replace(/\.ttf$/, '.woff2')
  writeFileSync(new URL(target, FONTS), woff2)
  console.log(`${name} ${source.length} B → ${target} ${woff2.length} B`)
}
