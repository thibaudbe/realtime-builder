export function sliceId(id: string) {
  return id.slice(0, 7)
}

export function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleString()
}
