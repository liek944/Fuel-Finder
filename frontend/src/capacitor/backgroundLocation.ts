import { Capacitor, registerPlugin } from '@capacitor/core'

export interface StartOptions {
  intervalMs?: number
  minDistanceM?: number
  lat?: number
  lng?: number
  radiusM?: number
}

export interface DestinationOptions {
  lat: number
  lng: number
  radiusM?: number
}

interface NativeBackgroundLocationPlugin {
  setDestination(options: DestinationOptions): Promise<void>
  clearDestination(): Promise<void>
  startTracking(options: StartOptions): Promise<void>
  stopTracking(): Promise<void>
  checkPermissions(): Promise<{ location: boolean; background: boolean; notifications: boolean }>
  requestPermissions(): Promise<{ location: boolean; background: boolean; notifications: boolean }>
}

const NativePlugin = registerPlugin<NativeBackgroundLocationPlugin>('BackgroundLocation', {
  web: () => ({
    setDestination: async () => {},
    clearDestination: async () => {},
    startTracking: async () => {},
    stopTracking: async () => {},
    checkPermissions: async () => ({ location: true, background: true, notifications: true }),
    requestPermissions: async () => ({ location: true, background: true, notifications: true })
  }) as any
})

const isNative = Capacitor.getPlatform() !== 'web'

async function ensurePermissions(): Promise<boolean> {
  const s = await NativePlugin.checkPermissions()
  if (s.location && s.background && s.notifications) return true
  const r = await NativePlugin.requestPermissions()
  return !!(r.location && r.background && r.notifications)
}

async function setDestination(opts: DestinationOptions): Promise<void> {
  if (!isNative) return
  await NativePlugin.setDestination(opts)
}

async function clearDestination(): Promise<void> {
  if (!isNative) return
  await NativePlugin.clearDestination()
}

async function startTracking(opts: StartOptions = {}): Promise<void> {
  if (!isNative) return
  await NativePlugin.startTracking({ intervalMs: 2000, minDistanceM: 5, ...opts })
}

async function stopTracking(): Promise<void> {
  if (!isNative) return
  await NativePlugin.stopTracking()
}

export const backgroundLocation = {
  ensurePermissions,
  setDestination,
  clearDestination,
  startTracking,
  stopTracking,
}
