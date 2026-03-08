const slugNonIdentifierPattern = /[^a-zA-Z0-9_]+/g
const repeatedUnderscorePattern = /_+/g

function slugifyIdentifier(value: string): string {
  const normalized = value.trim().toLowerCase()
  if (!normalized) return 'selection'

  const slug = normalized
    .replace(slugNonIdentifierPattern, '_')
    .replace(/^_+|_+$/g, '')
    .replace(repeatedUnderscorePattern, '_')

  return slug || 'selection'
}

function extractTableStem(value: string): string {
  let stem = value

  while (true) {
    const match = stem.match(/\.[^./\\]{1,10}$/)
    if (!match) break
    stem = stem.slice(0, -match[0].length)
  }

  return stem
}

function fnv32aHash(value: string): number {
  let hash = 0x811c9dc5

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }

  return hash >>> 0
}

function shortSelectionHash(value: string): string {
  return fnv32aHash(value).toString(16).slice(0, 4)
}

function normalizeSelectionPath(value: string): string {
  return value.trim().replace(/\\/g, '/').replace(/\/+$/, '').replace(/^\.\//, '')
}

function buildUniqueSelectionName(
  candidate: string,
  rawPath: string,
  existingNames: Set<string>
): string {
  if (!existingNames.has(candidate)) {
    return candidate
  }

  return `${candidate}_${shortSelectionHash(rawPath)}`
}

export function applySourceAlias(tableName: string, alias?: string): string {
  const normalizedAlias = alias?.trim()
  if (!normalizedAlias) return tableName

  const prefix = `${normalizedAlias}_`
  return tableName.startsWith(prefix) ? tableName : `${prefix}${tableName}`
}

export function computeLocalFileSelectionTableName(
  selectionPath: string,
  existingNames: Set<string> = new Set()
): string {
  const normalizedPath = normalizeSelectionPath(selectionPath)
  if (!normalizedPath) {
    return buildUniqueSelectionName('selection', selectionPath, existingNames)
  }

  const rawTrimmedPath = selectionPath.trim()
  const isFolderSelection = rawTrimmedPath.endsWith('/') || rawTrimmedPath.endsWith('\\')

  const pathParts = normalizedPath.split('/').filter(Boolean)
  const leaf = pathParts[pathParts.length - 1] || 'selection'
  const leafBaseName = isFolderSelection ? leaf : extractTableStem(leaf)
  const candidate = slugifyIdentifier(leafBaseName)

  if (!existingNames.has(candidate)) {
    return candidate
  }

  const parentLeaf = pathParts.length > 1 ? pathParts[pathParts.length - 2] : ''
  const parentCandidate = slugifyIdentifier(`${parentLeaf}_${leafBaseName}`)
  if (parentLeaf && !existingNames.has(parentCandidate)) {
    return parentCandidate
  }

  return buildUniqueSelectionName(parentCandidate || candidate, selectionPath, existingNames)
}

export function computeS3PrefixTableName(prefix: string): string {
  const normalizedPrefix = prefix.trim().replace(/\/+$/, '')
  if (!normalizedPrefix) return 'root'
  return slugifyIdentifier(normalizedPrefix)
}

export function computeS3ObjectTableName(objectKey: string): string {
  return slugifyIdentifier(extractTableStem(objectKey.trim()))
}
