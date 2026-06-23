# Arquitetura do Delivery Flows Gestor

## Visão Geral

```
┌─────────────────────────────────────────────────────┐
│                   Main Process                      │
│                  (Node.js + Electron)               │
│                                                     │
│  ┌──────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │ Janela SaaS  │  │  Settings   │  │  Print      │ │
│  │  (Web)       │  │  (React)    │  │  Window     │ │
│  └──────────────┘  └──────┬──────┘  │ (invisível) │ │
│                           │         └────────────┘ │
│                    ┌──────┴──────┐                  │
│                    │   IPC       │                  │
│                    │  Handlers   │                  │
│                    └──────┬──────┘                  │
│                           │                         │
│              ┌────────────┴────────────┐            │
│              │      MemoryCache        │            │
│              │   (TTL: 5-10 min)       │            │
│              └─────────────────────────┘            │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │  Config FS (printer-config.json)             │   │
│  │  Categories FS (store-categories.json)       │   │
│  └──────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────┘
                       │ contextBridge (seguro)
┌──────────────────────┴──────────────────────────────┐
│                  Preload Script                     │
│           (expõe apenas funções permitidas)         │
│         window.electronAPI = { ... }                │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────┐
│               Renderer Process                      │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │  App.tsx (Configurações)                     │   │
│  │  ┌─────────┐ ┌──────────┐ ┌───────────────┐ │   │
│  │  │ Spinner │ │  Error   │ │ Route Cards   │ │   │
│  │  │         │ │  Banner  │ │ + Categories  │ │   │
│  │  └─────────┘ └──────────┘ └───────────────┘ │   │
│  │  CSS: App.module.css                         │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## Fluxo de Dados (IPC)

### Leitura de Configuração
```
Renderer                    Main Process
   │                            │
   │── getConfig() ────────────>│
   │                            ├── cache.get('config') ?
   │                            ├── sim → retorna cache
   │                            ├── não → fs.readFile()
   │                            │       → cache.set()
   │<── PrintRoute[] ───────────│
```

### Impressão de Pedido
```
Renderer (via SaaS web)        Main Process
   │                            │
   │── printOrder(html,target)> │
   │                            ├── validatePayload()
   │                            ├── loadConfig()
   │                            ├── findPrinterName()
   │                            ├── cria BrowserWindow(300px)
   │                            ├── loadURL(data:text/html)
   │                            ├── webContents.print()
   │                            │   { silent, deviceName,
   │                            │     pageSize: 80mm x 300mm }
   │                            └── close()
```

### Cache e Atualização
- **Leitura**: verifica cache antes de acessar disco ou sistema
- **Escrita**: (`save-config`, `sync-categories`) → persiste no disco + invalida cache
- **TTLs**: impressoras = 5 min, config/categorias = 10 min

## Módulos Principais

### `src/shared/types.ts`
Interfaces compartilhadas entre Main, Preload e Renderer:
- `PrintRoute`, `StoreCategory`, `PrinterInfo`, `ElectronAPI`, `CacheEntry<T>`

### `src/main/lib/cache.ts`
Cache em memória com expiração por TTL:
- `set<T>(key, data, ttlMs)` — armazena valor
- `get<T>(key)` — retorna valor ou `null` (se expirado)
- `delete(key)` / `has(key)` / `clear()` / `size`

### `src/main/index.ts`
Handlers IPC:
- `get-printers` — enumera impressoras do SO (com cache 5min)
- `get-config` / `save-config` — persistência de rotas
- `get-categories` / `sync-categories` — categorias do Supabase
- `print-order` — motor de impressão silenciosa (com validação de payload)

### `src/renderer/src/App.tsx`
Interface de configuração em React com:
- Estados: loading → Spinner, erro → ErrorBanner, sucesso → Toast
- Gerenciamento de rotas (CRUD local, salva via IPC)
- Seleção de categorias por rota (pill toggle)

### `src/renderer/src/App.module.css`
Estilos em CSS Modules:
- Sem estilos inline ou handlers JS para hover/focus
- Suporte a `:focus-visible` para acessibilidade por teclado

## Fluxo de Impressão Térmica

Ver seção "Dossiê de Impressão Térmica" no `README.md` para detalhes sobre:
1. CSS blindado (270px fixos)
2. Janela fantasma (300px)
3. PageSize em mícrons (80000 x 300000)
