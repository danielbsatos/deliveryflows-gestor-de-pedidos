import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // Dispara a impressão
  printReceipt: (htmlContent: string, target: string) => {
    ipcRenderer.send('print-order', { html: htmlContent, target })
  },
  
  // Lê impressoras físicas do PC
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  
  // Salva e Lê as rotas configuradas pelo lojista
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config: any) => ipcRenderer.invoke('save-config', config),
  
  // 🔥 AS NOVAS FUNÇÕES PARA AS CATEGORIAS DO SUPABASE
  syncStoreCategories: (categories: any[]) => ipcRenderer.send('sync-categories', categories),
  getStoreCategories: () => ipcRenderer.invoke('get-categories')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electronAPI = api
}