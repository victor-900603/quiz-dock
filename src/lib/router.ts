export function getBasename(baseUrl: string) {
  if (!baseUrl || baseUrl === '/') return '/'

  // Keep the trailing slash so root links stay inside the PWA scope.
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
}
