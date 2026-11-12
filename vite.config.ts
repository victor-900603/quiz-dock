import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const isUserSite = repoName?.endsWith('.github.io')

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: repoName && !isUserSite ? `/${repoName}/` : '/',
})
