export function normalizeConnectionType(type: string): string {
  return type.toLowerCase()
}

export function isSameConnectionType(type1: string, type2: string): boolean {
  return normalizeConnectionType(type1) === normalizeConnectionType(type2)
}
