import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI } from '../shared/types'

const api: ElectronAPI = {
  printReceipt: (htmlContent: string, target: string): void => {
    ipcRenderer.send('print-order', { html: htmlContent, target })
  },

  getPrinters: () => ipcRenderer.invoke('get-printers'),

  getConfig: () => ipcRenderer.invoke('get-config'),

  saveConfig: (config) => ipcRenderer.invoke('save-config', config),

  syncStoreCategories: (categories) => ipcRenderer.send('sync-categories', categories),

  getStoreCategories: () => ipcRenderer.invoke('get-categories')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-expect-error - fallback para contextIsolation=false
  window.electronAPI = api
}
