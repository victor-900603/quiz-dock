import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const isUserSite = repoName?.endsWith('.github.io')

function vendorChunk(id: string): string | undefined {
  if (!id.includes('node_modules')) return undefined

  if (/[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/.test(id)) {
    return 'react-vendor'
  }

  if (id.includes('@supabase')) return 'supabase-vendor'
  if (id.includes('@tanstack')) return 'query-vendor'

  return undefined
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: repoName && !isUserSite ? `/${repoName}/` : '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: vendorChunk,
      },
    },
  },
})
