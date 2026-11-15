export function downloadTextFile(
  fileName: string,
  text: string,
  mimeType = 'application/json;charset=utf-8',
): void {
  const blob = new Blob([text], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = fileName
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
