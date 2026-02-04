import { STORAGE_KEYS, getStorageValue, setStorageValue } from '@/constants/storageKeys'

function generateRandomHex(bytesLength = 16): string {
  const bytes = new Uint8Array(bytesLength)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256)
    }
  }
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function generateInstallId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return generateRandomHex()
}

export function getOrCreateInstallId(): string {
  const existing = getStorageValue(STORAGE_KEYS.INSTALL_ID, '')
  if (existing) {
    return existing
  }

  const installId = generateInstallId()
  setStorageValue(STORAGE_KEYS.INSTALL_ID, installId)
  return installId
}
