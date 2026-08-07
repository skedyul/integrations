export function getHeaderValue(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const direct = headers[name] ?? headers[name.toLowerCase()]
  if (Array.isArray(direct)) {
    return direct[0]
  }
  return direct
}
