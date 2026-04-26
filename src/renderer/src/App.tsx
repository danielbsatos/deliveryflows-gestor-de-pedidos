import { useEffect, useState } from 'react'
import { Printer, MonitorSmartphone, Plus, Trash2, CheckCircle2, Save, Tags } from 'lucide-react'

interface PrintRoute {
  id: string;
  name: string;
  printer: string;
  categories: string[];
}

function App() {
  const [printers, setPrinters] = useState<any[]>([])
  const [storeCategories, setStoreCategories] = useState<any[]>([])
  const [routes, setRoutes] = useState<PrintRoute[]>([])
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    // @ts-ignore
    window.electronAPI.getPrinters().then(setPrinters)
    // @ts-ignore
    window.electronAPI.getStoreCategories().then(setStoreCategories)
    // @ts-ignore
    window.electronAPI.getConfig().then((config) => {
      if (!config || config.length === 0 || !Array.isArray(config)) {
        setRoutes([{ id: 'default', name: 'Caixa / Balcão', printer: '', categories: [] }])
      } else {
        setRoutes(config)
      }
    })
  }, [])

  const addRoute = () => {
    const newRoute = { id: Math.random().toString(36).substring(7), name: 'Nova Rota (Ex: Cozinha)', printer: '', categories: [] }
    setRoutes([...routes, newRoute])
  }

  const updateRoute = (id: string, field: 'name' | 'printer', value: string) => {
    setRoutes(routes.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  const toggleCategory = (routeId: string, categoryId: string) => {
    setRoutes(routes.map(r => {
      if (r.id !== routeId) return r
      const newCats = r.categories.includes(categoryId)
        ? r.categories.filter(c => c !== categoryId) 
        : [...r.categories, categoryId] 
      return { ...r, categories: newCats }
    }))
  }

  const removeRoute = (id: string) => {
    if (id === 'default') return
    setRoutes(routes.filter(r => r.id !== id))
  }

  const saveAll = () => {
    // @ts-ignore
    window.electronAPI.saveConfig(routes).then(() => {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  return (
    // Altere a primeira div para este estilo:
<div style={{ padding: '40px', fontFamily: '"Inter", sans-serif', backgroundColor: '#f8fafc', height: '100vh', overflowY: 'auto', boxSizing: 'border-box',  color: '#0f172a' }}>
      
      {/* HEADER PREMIUM */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '40px', paddingBottom: '24px', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ backgroundColor: '#2563eb', padding: '14px', borderRadius: '14px', color: 'white', boxShadow: '0 4px 14px 0 rgba(37, 99, 235, 0.39)' }}>
            <MonitorSmartphone size={32} strokeWidth={1.5} />
          </div>
          <div>
            <h1 style={{ margin: 0, color: '#0f172a', fontSize: '1.75rem', fontWeight: '800', letterSpacing: '-0.025em' }}>Roteamento de Produção</h1>
            <span style={{ color: '#64748b', fontSize: '0.95rem', fontWeight: '500' }}>Configure para onde cada item do pedido deve ser impresso.</span>
          </div>
        </div>
        
        <button 
          onClick={saveAll}
          style={{ backgroundColor: '#0f172a', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e293b'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0f172a'}
        >
          <Save size={18} /> Salvar Roteamento
        </button>
      </div>

      {/* LISTA DE ROTAS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {routes.map((route) => (
          <div key={route.id} style={{ border: '1px solid #e2e8f0', backgroundColor: 'white', padding: '32px', borderRadius: '16px', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.05), 0 1px 2px -1px rgba(0,0,0,0.05)' }}>
            
            <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', marginBottom: '24px' }}>
              
              <div style={{ flex: 1 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: '700', marginBottom: '8px' }}>
                  <Tags size={14} /> Nome do Setor
                </label>
                <input 
                  type="text" 
                  value={route.name}
                  onChange={(e) => updateRoute(route.id, 'name', e.target.value)}
                  disabled={route.id === 'default'}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: route.id === 'default' ? '#f8fafc' : 'white', fontWeight: '600', fontSize: '1rem', color: '#0f172a', transition: 'border-color 0.2s' }}
                  onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                  onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                />
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: '700', marginBottom: '8px' }}>
                  <Printer size={14} /> Máquina Destino (Cabo USB/Rede)
                </label>
                <select 
                  value={route.printer} 
                  onChange={(e) => updateRoute(route.id, 'printer', e.target.value)}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: 'white', fontWeight: '500', fontSize: '1rem', color: '#0f172a', cursor: 'pointer', appearance: 'none' }}
                >
                  <option value="">🚫 Não Imprimir Fisicamente</option>
                  <option value="default">🖨️ Usar Impressora Padrão do Windows</option>
                  {printers.map(p => <option key={p.name} value={p.name}>🖨️ {p.name}</option>)}
                </select>
              </div>

              {route.id !== 'default' && (
                <div style={{ paddingTop: '26px' }}>
                  <button 
                    onClick={() => removeRoute(route.id)} 
                    style={{ background: 'white', border: '1px solid #fecaca', color: '#ef4444', padding: '12px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; e.currentTarget.style.borderColor = '#ef4444'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.borderColor = '#fecaca'; }}
                    title="Excluir Rota"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              )}
            </div>

            {/* SELEÇÃO DE CATEGORIAS (ESTILO PILL/BADGE) */}
            <div style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#334155', fontWeight: '600', marginBottom: '16px' }}>
                Selecione quais categorias do cardápio serão impressas nesta máquina:
              </label>
              
              {route.id === 'default' ? (
                <div style={{ fontSize: '0.9rem', color: '#64748b', backgroundColor: '#e2e8f0', padding: '12px 16px', borderRadius: '8px', display: 'inline-block' }}>
                  🔒 <b>Fixa:</b> A rota do Caixa sempre imprime o cupom completo (todas as categorias) com valores e dados do cliente.
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  {storeCategories.length === 0 ? (
                    <span style={{ fontSize: '0.9rem', color: '#ef4444', backgroundColor: '#fef2f2', padding: '8px 16px', borderRadius: '20px' }}>
                      Nenhuma categoria encontrada. Verifique sua conexão.
                    </span>
                  ) : (
                    storeCategories.map(cat => {
                      const isSelected = route.categories.includes(cat.id);
                      return (
                        <div 
                          key={cat.id} 
                          onClick={() => toggleCategory(route.id, cat.id)}
                          style={{ 
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', 
                            borderRadius: '24px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', 
                            userSelect: 'none', transition: 'all 0.2s',
                            backgroundColor: isSelected ? '#eff6ff' : 'white',
                            color: isSelected ? '#2563eb' : '#64748b',
                            border: `1px solid ${isSelected ? '#93c5fd' : '#cbd5e1'}`,
                            boxShadow: isSelected ? '0 0 0 1px #2563eb inset' : 'none'
                          }}
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

      <button 
        onClick={addRoute} 
        style={{ marginTop: '24px', backgroundColor: 'transparent', color: '#0f172a', border: '2px dashed #cbd5e1', padding: '20px', borderRadius: '16px', width: '100%', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '1rem', transition: 'all 0.2s' }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.backgroundColor = '#f8fafc'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        <Plus size={24} /> Criar Novo Setor de Impressão
      </button>

      {/* TOAST DE SUCESSO NATIVO */}
      {saved && (
        <div style={{ position: 'fixed', bottom: '40px', right: '40px', backgroundColor: '#10b981', color: 'white', padding: '16px 24px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '600', boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.4)', animation: 'slideIn 0.3s ease-out' }}>
          <CheckCircle2 size={24} /> Configurações salvas no sistema!
        </div>
      )}
    </div>
  )
}

export default App