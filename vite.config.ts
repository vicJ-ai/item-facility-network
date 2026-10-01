import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// CesiumJS loads its web workers, textures, and third-party modules at runtime from this path.
const cesiumSource = 'node_modules/cesium/Build/Cesium'
const cesiumBaseUrl = 'cesium'

// https://vite.dev/config/
export default defineConfig({
  define: { CESIUM_BASE_URL: JSON.stringify(`/${cesiumBaseUrl}/`) },
  plugins: [
    react(),
    viteStaticCopy({
      targets: ['ThirdParty', 'Workers', 'Assets', 'Widgets'].map((folder) => ({ src: `${cesiumSource}/${folder}`, dest: cesiumBaseUrl, rename: { stripBase: 4 } })),
    }),
  ],
  // Source PDFs dropped into extra_resources are never imported; watching them can crash the dev server while Windows still has them locked mid-copy.
  server: { host: '0.0.0.0', port: 5173, watch: { ignored: ['**/extra_resources/**'] } },
  preview: { host: '0.0.0.0', port: 4173, allowedHosts: true },
})
