import { app, shell, BrowserWindow, ipcMain, Menu } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import fs from 'fs'
import icon from '../../resources/icon.png?asset'

// ==========================================
// 1. CAMINHOS DOS ARQUIVOS INVISÍVEIS NO PC
// ==========================================
const configPath = join(app.getPath('userData'), 'printer-config.json')
const categoriesPath = join(app.getPath('userData'), 'store-categories.json')

function loadConfig() {
  try {
    if (fs.existsSync(configPath)) return JSON.parse(fs.readFileSync(configPath, 'utf-8'))
  } catch (e) { console.error(e) }
  return []
}

// ==========================================
// 2. CRIAÇÃO DAS JANELAS NATIVAS
// ==========================================
let settingsWindow: BrowserWindow | null = null

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    autoHideMenuBar: false, // Menu visível
    title: 'Delivery Flows - Gestor de Pedidos',
    icon: icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
    }
  })

  // MENU SUPERIOR NATIVO DO APLICATIVO
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

  // CARREGA O SITE OFICIAL
  mainWindow.loadURL('https://app.deliveryflows.com.br/admin/login')
}

// JANELA DAS CONFIGURAÇÕES
function openSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus()
    return
  }

  settingsWindow = new BrowserWindow({
    width: 700,
    height: 750,
    title: 'Configurações de Impressão - Delivery Flows', // Define o nome na barra
    autoHideMenuBar: true, // Esconde menus de sistema (File, Edit, etc)
    icon: icon, // Se já tiver o ícone importado
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
    }
  })

  // Remove o menu de sistema apenas desta janela para ficar mais limpo
  settingsWindow.setMenu(null)

  // Carrega o nosso React Local (App.tsx)
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    settingsWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    settingsWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  settingsWindow.on('closed', () => { settingsWindow = null })
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('br.com.deliveryflows.gestor')
  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))
  createWindow()
  app.on('activate', function () { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })

// ==========================================
// 3. SUPERPODERES: ROTAS, CATEGORIAS E HARDWARE
// ==========================================

// Lista impressoras físicas
ipcMain.handle('get-printers', async (event) => {
  return await event.sender.getPrintersAsync()
})

// Salva e Lê Configurações de Rotas
ipcMain.handle('get-config', () => loadConfig())
ipcMain.handle('save-config', (_, newConfig) => {
  fs.writeFileSync(configPath, JSON.stringify(newConfig))
  return true
})

// Salva e Lê as Categorias vindas do Site Web
ipcMain.on('sync-categories', (_event, categories) => {
  try {
    fs.writeFileSync(categoriesPath, JSON.stringify(categories))
  } catch (error) {
    console.error('Erro ao salvar categorias:', error)
  }
})
ipcMain.handle('get-categories', () => {
  try {
    if (fs.existsSync(categoriesPath)) return JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'))
  } catch (e) { console.error(e) }
  return []
})

// MOTOR DE IMPRESSÃO
ipcMain.on('print-order', (_event, { html, target }) => {
  const routes = loadConfig()
  let printerName: string | undefined = undefined

  if (Array.isArray(routes)) {
    const routeInfo = routes.find((r: any) => r.name.toLowerCase() === (target || '').toLowerCase())
    if (routeInfo && routeInfo.printer !== '') {
      printerName = routeInfo.printer
    } else {
      const defaultRoute = routes.find((r: any) => r.id === 'default')
      if (defaultRoute && defaultRoute.printer !== '') printerName = defaultRoute.printer
    }
  }

  console.log(`Imprimindo ticket de '${target}' na impressora: ${printerName || 'Padrão'}`)

  const printWindow = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false } })
  printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)

  printWindow.webContents.on('did-finish-load', () => {
    printWindow.webContents.print({
      silent: true, 
      deviceName: printerName, 
      margins: { marginType: 'none' } 
    }, () => printWindow.close())
  })
})