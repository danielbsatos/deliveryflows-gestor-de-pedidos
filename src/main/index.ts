import { app, shell, BrowserWindow, ipcMain, Menu } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import fs from 'fs'
import type { PrintRoute } from '../shared/types'
import { cache } from './lib/cache'
import icon from '../../resources/icon.png?asset'

/** TTL do cache de impressoras: 5 minutos */
const PRINTERS_CACHE_TTL = 5 * 60 * 1000
/** TTL do cache de configuração: 10 minutos */
const CONFIG_CACHE_TTL = 10 * 60 * 1000
/** TTL do cache de categorias: 10 minutos */
const CATEGORIES_CACHE_TTL = 10 * 60 * 1000

const configPath = join(app.getPath('userData'), 'printer-config.json')
const categoriesPath = join(app.getPath('userData'), 'store-categories.json')

/** Carrega as rotas de impressão do arquivo JSON no diretório userData. */
function loadConfig(): PrintRoute[] {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    }
  } catch (e) {
    console.error(e)
  }
  return []
}

let settingsWindow: BrowserWindow | null = null

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    autoHideMenuBar: false,
    title: 'Delivery Flows - Gestor de Pedidos',
    icon: icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true
    }
  })

  const menu = Menu.buildFromTemplate([
    {
      label: '⚙️ Hardware e Impressoras',
      click: () => openSettingsWindow()
    },
    {
      label: 'Atualizar Sistema',
      role: 'reload'
    }
  ])
  Menu.setApplicationMenu(menu)

  mainWindow.on('ready-to-show', () => mainWindow.show())

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  mainWindow.loadURL('https://app.deliveryflows.com.br/admin/login')
}

function openSettingsWindow(): void {
  if (settingsWindow) {
    settingsWindow.focus()
    return
  }

  settingsWindow = new BrowserWindow({
    width: 700,
    height: 750,
    title: 'Configurações de Impressão - Delivery Flows',
    autoHideMenuBar: true,
    icon: icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true
    }
  })

  settingsWindow.setMenu(null)

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    settingsWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    settingsWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  settingsWindow.on('closed', () => {
    settingsWindow = null
  })
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('br.com.deliveryflows.gestor')
  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))
  createWindow()
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('get-printers', async (event) => {
  const cached = cache.get<Electron.PrinterInfo[]>('printers')
  if (cached) return cached
  const printers = await event.sender.getPrintersAsync()
  cache.set('printers', printers, PRINTERS_CACHE_TTL)
  return printers
})

ipcMain.handle('get-config', () => {
  const cached = cache.get<PrintRoute[]>('config')
  if (cached) return cached
  const config = loadConfig()
  cache.set('config', config, CONFIG_CACHE_TTL)
  return config
})

ipcMain.handle('save-config', (_event, newConfig: PrintRoute[]) => {
  fs.writeFileSync(configPath, JSON.stringify(newConfig))
  cache.set('config', newConfig, CONFIG_CACHE_TTL)
  return true
})

ipcMain.on('sync-categories', (_event, categories: unknown[]) => {
  try {
    fs.writeFileSync(categoriesPath, JSON.stringify(categories))
    cache.delete('categories')
  } catch (error) {
    console.error('Erro ao salvar categorias:', error)
  }
})

ipcMain.handle('get-categories', () => {
  const cached = cache.get<Record<string, unknown>[]>('categories')
  if (cached) return cached
  try {
    if (fs.existsSync(categoriesPath)) {
      const data = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'))
      cache.set('categories', data, CATEGORIES_CACHE_TTL)
      return data
    }
  } catch (e) {
    console.error(e)
  }
  return []
})

/** Valida o payload recebido do renderer via IPC `print-order`.
 *  Rejeita requisições sem HTML ou sem destino (target). */
function validatePrintPayload(payload: unknown): payload is { html: string; target: string } {
  if (!payload || typeof payload !== 'object') return false
  const p = payload as Record<string, unknown>
  return typeof p.html === 'string' && p.html.length > 0 && typeof p.target === 'string'
}

/** Percorre as rotas configuradas e retorna o nome da impressora
 *  correspondente ao setor (target). Se não encontrar, tenta a rota padrão. */
function findPrinterName(routes: PrintRoute[], target: string): string | undefined {
  const routeInfo = routes.find((r) => r.name.toLowerCase() === (target || '').toLowerCase())
  if (routeInfo && routeInfo.printer !== '') {
    return routeInfo.printer
  }
  const defaultRoute = routes.find((r) => r.id === 'default')
  if (defaultRoute && defaultRoute.printer !== '') {
    return defaultRoute.printer
  }
  return undefined
}

ipcMain.on('print-order', (_event, payload: unknown) => {
  if (!validatePrintPayload(payload)) {
    console.error('print-order: payload inválido recebido', payload)
    return
  }

  const routes = loadConfig()
  const printerName = findPrinterName(routes, payload.target)

  const printWindow = new BrowserWindow({
    show: false,
    width: 300,
    webPreferences: { nodeIntegration: false }
  })

  printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(payload.html)}`)

  printWindow.webContents.on('did-finish-load', () => {
    printWindow.webContents.print(
      {
        silent: true,
        deviceName: printerName,
        margins: { marginType: 'none' },
        pageSize: { width: 80000, height: 300000 },
        printBackground: true
      },
      () => printWindow.close()
    )
  })
})
