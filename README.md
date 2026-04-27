# 📖 Documentação Oficial: Delivery Flows - Gestor Desktop

## 1. Visão Geral do Projeto

O **Delivery Flows Gestor** é uma aplicação Desktop desenvolvida para Windows, projetada para servir como uma ponte (*Hardware Bridge*) entre a aplicação web em nuvem (app.deliveryflows.com.br) e os periféricos físicos do lojista (neste caso, Impressoras Térmicas Não-Fiscais de 80mm e 58mm).

**Por que criamos este App?**

Navegadores comuns (Chrome, Safari) possuem fortes bloqueios de segurança que impedem a impressão silenciosa (sem a caixa de diálogo de confirmação) e o roteamento inteligente para múltiplas impressoras (ex: imprimir Bebidas no Bar e Comidas na Cozinha). O Electron resolve este problema, empacotando o site oficial e concedendo-lhe "superpoderes" nativos do sistema operativo.

## 2. Stack Tecnológico

- **Core:** Electron JS (v39+)
- **Linguagem:** TypeScript
- **Interface Local (Configurações):** React + CSS in JS (Tailwind-inspired)
- **Empacotador / Build:** Electron-Vite & Electron-Builder
- **Comunicação:** IPC (Inter-Process Communication)

## 3. Arquitetura do Sistema (Como Funciona)

A aplicação utiliza o padrão seguro de 3 camadas do Electron moderno:

- **Main Process** (`src/main/index.ts`): O "Cérebro". Roda no Node.js. É ele quem cria as janelas, lê o disco rígido (arquivos JSON de configuração) e envia comandos diretos para as impressoras físicas.
- **Preload Script** (`src/preload/index.ts`): A "Ponte Segura". Devido ao `contextIsolation: true`, o site web não pode acessar o Node.js diretamente. O Preload cria um túnel seguro chamado `window.electronAPI` expondo apenas funções permitidas (ex: `getPrinters`, `printReceipt`).
- **Renderer Process** (Web): A "Cara".
  - A janela principal carrega diretamente a URL do SaaS na nuvem.
  - A janela de configurações carrega o nosso código React embutido (`src/renderer/src/App.tsx`).

## 4. Estrutura de Arquivos Crítica
```
📦 gestor-delivery-flows
┣ 📂 build/ # Ícone do Instalador (icon.ico - mín 256x256px)
┣ 📂 resources/ # Ícone da Janela da App (icon.png)
┣ 📂 src/
┃ ┣ 📂 main/ # Motor do App
┃ ┃ ┗ 📜 index.ts # (ARQUIVO MAIS IMPORTANTE) Lógica de janelas e impressão silenciosa
┃ ┣ 📂 preload/
┃ ┃ ┗ 📜 index.ts # Ponte de comunicação IPC
┃ ┗ 📂 renderer/
┃ ┗ 📂 src/
┃ ┗ 📜 App.tsx # UI React da Tela de Configuração Local
┣ 📜 electron-builder.yml # Configurações de compilação (Nome, Empresa, Ícone)
┗ 📜 package.json # Dependências e Metadados
```

## 5. Dossiê de Impressão Térmica (A Tríade de Ouro)

A maior dificuldade superada neste projeto foi domar os drivers de impressoras térmicas no Windows. Se no futuro for necessário alterar o layout do cupom, respeite esta Tríade de Ouro:

### Regra 1: O CSS Blindado (Na Web `printer.ts`)

O HTML do cupom nunca deve usar `100%` livre, `margin: 0 auto` ou `width: 80mm`. A medida mágica para 80mm é **270px** (72mm de área imprimível).

```css
/* Obrigatório no topo do HTML a ser impresso */
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
  padding: 5px !important; /* Segurança nas bordas */
  box-sizing: border-box;
  text-align: left; /* Ancoragem esquerda absoluta */
}
```

### Regra 2: A Janela Fantasma (No App main/index.ts)

O Electron não pode criar a janela invisível com o tamanho padrão (800px), senão ele encolherá o cupom.

```typescript
const printWindow = new BrowserWindow({ 
  show: false, 
  width: 300, // Força a janela a ter largura próxima à bobina
  webPreferences: { nodeIntegration: false } 
})
```

### Regra 3: O PageSize Cirúrgico (No App main/index.ts)

Para evitar que o Electron assuma que o papel é um A4, devemos informar os microns exatos da folha (80mm x 300mm) no momento do disparo.

```typescript
printWindow.webContents.print({
  silent: true, 
  deviceName: printerName, 
  margins: { marginType: 'none' },
  pageSize: { width: 80000, height: 300000 } // Em mícrons!
})
```

## 6. Histórico de Problemas Resolvidos (Troubleshooting)


Problema |	Causa Raiz |	Solução Aplicada
| :--- | :--- | :--- |
Erro TypeScript no `npm run build` (baseUrl) |	Configuração legada no `tsconfig.web.json`. |	Removido `baseUrl` e substituído os paths por caminhos relativos (`./src/...`).
Erro `winCodeSign` (Privilégios) ao gerar .exe |	Windows bloqueia criação de links simbólicos por segurança. |	Executar o VS Code como Administrador OU ativar o Modo Desenvolvedor do Windows.
Erro `image must be at least 256x256` |	O `icon.ico` da pasta `build/` era pequeno demais. |	Substituído por um `.ico` de alta resolução (512x512).
Cupom saindo cortado na direita |	O padding somava à largura devido à falta de `box-sizing`. |	Aplicado box-sizing: `border-box` em todo o HTML.
Cupom minúsculo espremido no canto |	Janela virtual do Electron estava em modo A4 e com 800px. |	Adicionado `width: 300` na janela e `pageSize: {width: 80000}` no método print.
Cupom cortando letras do lado direito (Final) |	`margin: 0 auto` empurrava o texto, e `300px` excedia os 72mm reais. |	Reduzido para `270px` cravados, com ancoragem total à esquerda (`margin: 0 !important; text-align: left`).

## 7. Guia de Desenvolvimento

### Para testar alterações de código em tempo real (sem gerar .exe):

```bash
npm run dev
```

### Gerar a Versão Final (Build de Produção)

Quando quiser gerar um novo instalador para os clientes:

Atualize a "version" no arquivo package.json (ex: de "1.0.0" para "1.0.1").

Abra o terminal (como Administrador) e rode:

```bash
npm run build:win
```

O ficheiro de instalação estará na pasta dist/ pronto para ser enviado para a Nuvem (AWS S3, Cloudflare R2, etc.).

## "Desenvolvido com suor, TypeScript e muitas bobinas de papel térmico." 🚀
