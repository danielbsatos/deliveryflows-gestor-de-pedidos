# Changelog

## [2.0.0] — 2026-06-15

### Refatoração completa do código-base

#### Tipagem e Segurança
- Criado `src/shared/types.ts` com interfaces compartilhadas (`PrintRoute`, `StoreCategory`, `PrinterInfo`, `ElectronAPI`)
- `window.electronAPI` totalmente tipado — removidos todos os `@ts-ignore`
- Substituídos todos os `any` por tipos concretos em handlers IPC e estado da UI
- Adicionados tipos de retorno explícitos em todas as funções

#### Testes
- Configurado Vitest como framework de testes
- Implementado `MemoryCache` com 12 testes unitários (inserção, expiração TTL, tipos, limpeza)
- Adicionados 4 testes de integração (cache hit/miss, invalidação, concorrência)

#### Cache
- Classe `MemoryCache` genérica com TTL e instância única exportada
- Cache integrado nos handlers: `get-printers` (5min), `get-config` (10min), `get-categories` (10min)
- Cache invalidado automaticamente em operações de escrita (`save-config`, `sync-categories`)

#### Interface do Usuário
- Migrado de estilos inline para **CSS Modules** (`App.module.css`)
- Removidos handlers `onMouseEnter`/`onMouseLeave` (substituídos por pseudo-classes CSS)
- Adicionados componentes `Spinner` e `ErrorBanner` com estados de loading/erro
- Adicionado suporte a `:focus-visible` para navegação por teclado

#### Validação e Segurança
- CSP corrigido: adicionado `connect-src` para Supabase e SaaS
- Validação de payload no handler `print-order` (rejeita requisições malformadas)
- Criado `.env.example` com documentação das variáveis necessárias
- Adicionado `.env` ao `.gitignore`

#### Limpeza
- Removido código boilerplate não utilizado: `Versions.tsx`, SVGs, CSS morto
- Formatado todo o projeto com Prettier

#### Build e Distribuição
- Auto-update configurado para GitHub Releases
- Adicionados scripts `test` e `test:watch` ao `package.json`

### Checklist de Qualidade
- [x] `npm run lint` — 0 erros, 0 warnings
- [x] `npm run typecheck` — aprovado (node + web)
- [x] `npm test` — 16 testes, 100% passando
