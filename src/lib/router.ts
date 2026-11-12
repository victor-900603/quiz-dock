export function getBasename(baseUrl: string) {
  return baseUrl.replace(/\/$/, '') || '/'
}
