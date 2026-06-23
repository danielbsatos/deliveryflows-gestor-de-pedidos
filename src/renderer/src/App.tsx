import { useState, useEffect } from 'react'
import { Printer, MonitorSmartphone, Plus, Trash2, CheckCircle2, Save, Tags } from 'lucide-react'
import type { PrintRoute, StoreCategory, PrinterInfo } from '../../shared/types'
import styles from './App.module.css'

interface AppState {
  printers: PrinterInfo[]
  storeCategories: StoreCategory[]
  routes: PrintRoute[]
  loading: boolean
  error: string | null
}

function buildDefaultRoutes(): PrintRoute[] {
  return [{ id: 'default', name: 'Caixa / Balcão', printer: '', categories: [] }]
}

function Spinner(): React.JSX.Element {
  return (
    <div className={styles.spinner}>
      <div className={styles.spinnerCircle} />
      Carregando...
    </div>
  )
}

function ErrorBanner({ message }: { message: string }): React.JSX.Element {
  return <div className={styles.errorBanner}>{message}</div>
}

function App(): React.JSX.Element {
  const [saved, setSaved] = useState<boolean>(false)
  const [state, setState] = useState<AppState>({
    printers: [],
    storeCategories: [],
    routes: buildDefaultRoutes(),
    loading: true,
    error: null
  })

  useEffect(() => {
    let cancelled = false
    async function loadAll(): Promise<void> {
      try {
        const [printers, storeCategories, config] = await Promise.all([
          window.electronAPI.getPrinters(),
          window.electronAPI.getStoreCategories(),
          window.electronAPI.getConfig()
        ])
        if (cancelled) return
        const routes = config && config.length > 0 ? config : buildDefaultRoutes()
        setState({ printers, storeCategories, routes, loading: false, error: null })
      } catch (err: unknown) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'Erro ao carregar dados'
        setState((prev) => ({ ...prev, loading: false, error: message }))
      }
    }
    loadAll()
    return () => {
      cancelled = true
    }
  }, [])

  const addRoute = (): void => {
    const newRoute: PrintRoute = {
      id: Math.random().toString(36).substring(7),
      name: 'Nova Rota (Ex: Cozinha)',
      printer: '',
      categories: []
    }
    setState((prev) => ({ ...prev, routes: [...prev.routes, newRoute] }))
  }

  const updateRoute = (id: string, field: 'name' | 'printer', value: string): void => {
    setState((prev) => ({
      ...prev,
      routes: prev.routes.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    }))
  }

  const toggleCategory = (routeId: string, categoryId: string): void => {
    setState((prev) => ({
      ...prev,
      routes: prev.routes.map((r) => {
        if (r.id !== routeId) return r
        const newCats = r.categories.includes(categoryId)
          ? r.categories.filter((c) => c !== categoryId)
          : [...r.categories, categoryId]
        return { ...r, categories: newCats }
      })
    }))
  }

  const removeRoute = (id: string): void => {
    if (id === 'default') return
    setState((prev) => ({ ...prev, routes: prev.routes.filter((r) => r.id !== id) }))
  }

  const saveAll = (): void => {
    window.electronAPI.saveConfig(state.routes).then(() => {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  if (state.loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner />
      </div>
    )
  }

  if (state.error) {
    return (
      <div className={styles.loadingContainer}>
        <ErrorBanner message={state.error} />
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.iconBox}>
            <MonitorSmartphone size={32} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className={styles.title}>Roteamento de Produção</h1>
            <span className={styles.subtitle}>
              Configure para onde cada item do pedido deve ser impresso.
            </span>
          </div>
        </div>

        <button onClick={saveAll} className={styles.saveButton}>
          <Save size={18} /> Salvar Roteamento
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {state.routes.map((route) => (
          <div key={route.id} className={styles.routeCard}>
            <div className={styles.routeRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>
                  <Tags size={14} /> Nome do Setor
                </label>
                <input
                  type="text"
                  value={route.name}
                  onChange={(e) => updateRoute(route.id, 'name', e.target.value)}
                  disabled={route.id === 'default'}
                  className={styles.input}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>
                  <Printer size={14} /> Máquina Destino (Cabo USB/Rede)
                </label>
                <select
                  value={route.printer}
                  onChange={(e) => updateRoute(route.id, 'printer', e.target.value)}
                  className={styles.select}
                >
                  <option value="">🚫 Não Imprimir Fisicamente</option>
                  <option value="default">🖨️ Usar Impressora Padrão do Windows</option>
                  {state.printers.map((p) => (
                    <option key={p.name} value={p.name}>
                      🖨️ {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {route.id !== 'default' && (
                <div style={{ paddingTop: '26px' }}>
                  <button
                    onClick={() => removeRoute(route.id)}
                    className={styles.deleteButton}
                    title="Excluir Rota"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              )}
            </div>

            <div className={styles.categoriesBox}>
              <label className={styles.categoriesLabel}>
                Selecione quais categorias do cardápio serão impressas nesta máquina:
              </label>

              {route.id === 'default' ? (
                <div className={styles.defaultTag}>
                  🔒 <b>Fixa:</b> A rota do Caixa sempre imprime o cupom completo (todas as
                  categorias) com valores e dados do cliente.
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  {state.storeCategories.length === 0 ? (
                    <span className={styles.emptyCategories}>
                      Nenhuma categoria encontrada. Verifique sua conexão.
                    </span>
                  ) : (
                    state.storeCategories.map((cat) => {
                      const isSelected = route.categories.includes(cat.id)
                      return (
                        <div
                          key={cat.id}
                          onClick={() => toggleCategory(route.id, cat.id)}
                          className={`${styles.pill} ${isSelected ? styles.pillSelected : ''}`}
                        >
                          {isSelected && <CheckCircle2 size={16} />}
                          {cat.name}
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <button onClick={addRoute} className={styles.addRouteButton}>
        <Plus size={24} /> Criar Novo Setor de Impressão
      </button>

      {saved && (
        <div className={styles.toast}>
          <CheckCircle2 size={24} /> Configurações salvas no sistema!
        </div>
      )}
    </div>
  )
}

export default App
