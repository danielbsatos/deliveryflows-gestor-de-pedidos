import type { ElectronAPI } from '@electron-toolkit/preload'
import type { ElectronAPI as AppElectronAPI } from '../shared/types'

declare global {
  interface Window {
    electron: ElectronAPI
    api: unknown
    electronAPI: AppElectronAPI
  }
}
