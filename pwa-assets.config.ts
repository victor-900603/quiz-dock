import { defineConfig, minimal2023Preset as preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  preset: {
    ...preset,
    maskable: {
      ...preset.maskable,
      resizeOptions: { ...preset.maskable.resizeOptions, background: '#f6f1e7' },
    },
    apple: {
      ...preset.apple,
      resizeOptions: { ...preset.apple.resizeOptions, background: '#f6f1e7' },
    },
  },
  images: ['public/favicon.svg'],
})
