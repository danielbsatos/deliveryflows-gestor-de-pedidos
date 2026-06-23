# Delivery Flows Gestor

Aplicação desktop Electron + React + TypeScript que atua como ponte (_Hardware Bridge_) entre o SaaS [app.deliveryflows.com.br](https://app.deliveryflows.com.br) e impressoras térmicas não-fiscais (80mm e 58mm) no Windows.

Navegadores comuns bloqueiam impressão silenciosa e roteamento inteligente para múltiplas impressoras. O Electron resolve isso com acesso nativo ao sistema.

---

## Stack Tecnológico

| Camada       | Tecnologia                                      |
|-------------|-------------------------------------------------|
| Core        | Electron 39+                                    |
| Linguagem   | TypeScript (estrito, sem `any`)                 |
| UI (Local)  | React 19 + CSS Modules                          |
| Ícones      | Lucide React                                    |
| Build       | Electron-Vite + Electron-Builder                |
| Testes      | Vitest (16 testes, 100% passando)               |
| Backend     | Supabase (client-side)                          |
| Auto-update | GitHub Releases (electron-updater)              |

---

## Pré-requisitos

- Node.js 20+
- npm 9+
- Windows 10/11 (para suporte a impressoras térmicas)
- VS Code (recomendado) executado como **Administrador** para builds

---

## Configuração do Ambiente

```bash
# Clone o repositório
git clone https://github.com/deliveryflows/gestor-desktop.git
cd gestor-delivery-flows

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais do Supabase
```

### Variáveis de Ambiente (`.env`)

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

> **Importante**: O arquivo `.env` está no `.gitignore` e nunca deve ser commitado.

---

## Scripts Disponíveis

| Comando                | Descrição                                    |
|------------------------|----------------------------------------------|
| `npm run dev`          | Desenvolvimento com hot-reload               |
| `npm run build`        | Build de produção (typecheck + electron-vite)|
| `npm run lint`         | Verificação de código (ESLint)               |
| `npm run typecheck`    | Verificação de tipos (TypeScript)            |
| `npm test`             | Executa testes (Vitest)                      |
| `npm run test:watch`   | Testes em modo watch                         |
| `npm run format`       | Formata código com Prettier                  |
| `npm run build:win`    | Gera instalador Windows (.exe)               |
| `npm run build:mac`    | Gera instalador macOS (.dmg)                 |
| `npm run build:linux`  | Gera instalador Linux (.AppImage/.deb/.snap) |

---

## Estrutura do Projeto

```
gestor-delivery-flows/
├── build/                    # Ícone do instalador (icon.ico)
├── resources/                # Ícone da janela (icon.png)
├── src/
│   ├── shared/
│   │   └── types.ts          # Tipos compartilhados (PrintRoute, ElectronAPI, etc.)
│   ├── main/
│   │   ├── index.ts          # Processo principal: janelas, IPC, impressão
│   │   ├── lib/
│   │   │   └── cache.ts      # MemoryCache com TTL
│   │   └── __tests__/        # Testes do cache
│   ├── preload/
│   │   ├── index.ts          # Ponte segura (contextBridge)
│   │   └── index.d.ts        # Declaração global de tipos
│   └── renderer/
│       └── src/
│           ├── App.tsx        # UI de configuração (React)
│           ├── App.module.css # Estilos (CSS Modules)
│           ├── main.tsx       # Entry point React
│           └── lib/
│               └── supabase.ts # Cliente Supabase
├── docs/
│   ├── ARCHITECTURE.md        # Diagrama e fluxo da arquitetura
│   └── CHANGELOG.md           # Histórico de versões
├── electron-builder.yml       # Configuração de build
├── vitest.config.ts           # Configuração de testes
├── .env.example               # Template de variáveis de ambiente
└── package.json
```

---

## Arquitetura

A aplicação usa o padrão seguro de 3 camadas do Electron moderno:

### 1. Main Process (`src/main/index.ts`)
O "cérebro". Roda em Node.js. Cria janelas, lê/grava arquivos de configuração no disco (`printer-config.json`, `store-categories.json`) e controla a impressão. Possui um **sistema de cache em memória** (`MemoryCache`) que reduz chamadas ao disco e ao sistema de impressoras.

### 2. Preload Script (`src/preload/index.ts`)
A "ponte segura". Com `contextIsolation: true`, expõe apenas funções autorizadas via `window.electronAPI`:
- `getPrinters()` — lista impressoras do sistema
- `getConfig()` / `saveConfig()` — gerencia rotas de impressão
- `getStoreCategories()` / `syncStoreCategories()` — categorias do cardápio
- `printReceipt(html, target)` — dispara impressão silenciosa

### 3. Renderer Process (`src/renderer/src/App.tsx`)
A interface de configuração em React com:
- **Spinner** durante carregamento inicial
- **ErrorBanner** em caso de falha de IPC
- Gerenciamento de rotas de impressão (CRUD)
- Seleção de categorias por rota (seleção por pills)

> A janela principal carrega diretamente o SaaS web (`app.deliveryflows.com.br`).  
> A janela de configurações carrega o React local.

### Cache (MemoryCache)

O cache em memória com TTL evita leituras repetitivas do disco:

```
get-printers   → TTL 5 minutos
get-config     → TTL 10 minutos (invalidado ao salvar)
get-categories → TTL 10 minutos (invalidado ao sincronizar)
```

```typescript
import { cache } from '../main/lib/cache'

// Armazenar com TTL de 5 minutos
cache.set('printers', data, 5 * 60 * 1000)

// Recuperar (retorna null se expirado)
const data = cache.get<PrinterInfo[]>('printers')
```

---

## Dossiê de Impressão Térmica (A Tríade de Ouro)

A maior dificuldade do projeto é domar drivers de impressoras térmicas no Windows.

### Regra 1: O CSS Blindado

O HTML do cupom nunca deve usar `100%` livre. A medida mágica para 80mm é **270px**:

```css
@page { margin: 0; }
html, body {
  width: 270px !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow-x: hidden;
}
.ticket {
  width: 270px !important;
  max-width: 270px !important;
  margin: 0 !important;
  padding: 5px !important;
  box-sizing: border-box;
  text-align: left;
}
```

### Regra 2: A Janela Fantasma

```typescript
const printWindow = new BrowserWindow({
  show: false,
  width: 300, // Força largura próxima à bobina
  webPreferences: { nodeIntegration: false }
})
```

### Regra 3: O PageSize Cirúrgico

```typescript
printWindow.webContents.print({
  silent: true,
  deviceName: printerName,
  margins: { marginType: 'none' },
  pageSize: { width: 80000, height: 300000 } // Em mícrons!
})
```

---

## Contribuição

1. Faça um fork do repositório
2. Crie uma branch: `git checkout -b minha-feature`
3. Faça suas alterações
4. Garanta que os testes passem: `npm test`
5. Garanta que lint e typecheck estejam limpos:
   ```bash
   npm run lint
   npm run typecheck
   ```
6. Abra um Pull Request

---

## Troubleshooting

| Problema | Causa Raiz | Solução |
|----------|------------|---------|
| `winCodeSign` ao gerar .exe | Windows bloqueia links simbólicos | Executar VS Code como Administrador ou ativar Modo Desenvolvedor |
| `image must be at least 256x256` | Icon.ico pequeno | Usar .ico de 512x512 |
| Cupom cortado na direita | Padding sem `box-sizing` | Aplicar `box-sizing: border-box` |
| Cupom espremido no canto | Janela em modo A4 | `width: 300` + `pageSize` em mícrons |
| Cupom cortando letras | `margin: 0 auto` + 300px | Reduzir para 270px, ancoragem à esquerda |

---

## Pré‑requisitos importantes

Build do renderer: normalmente o script build já compila o React/Vite antes. Se você usa um comando separado, lembre‑se de rodar primeiro:

```
bash
npm run build   # compila o renderer
npm run dist    # empacota o app
Windows apenas: o processo deve ser executado no Windows (a menos que use CI/CD com cross‑compilation, mas não é trivial para módulos nativos de impressão).```

Ícone: certifique‑se de que o ícone está configurado no electron-builder.yml (campo icon) para evitar o ícone padrão.

📦 Exemplo do comando final
```
bash
npm run build:win
# ou
npm run dist
```

> "Desenvolvido com suor, TypeScript e muitas bobinas de papel térmico." 🚀
