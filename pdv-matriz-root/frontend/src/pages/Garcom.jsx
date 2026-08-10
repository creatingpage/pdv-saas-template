import { useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ComandaContext } from '../context/ComandaContext';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import CardComanda from '../components/CardComanda';
import Botao from '../components/Botao';
import { recalcular } from '../mockComandas';
import { SYSTEM_CONFIG } from '../config/theme';

const IS_MOCK = import.meta.env.VITE_MOCK_AUTH === 'true';

const CATEGORIAS = ['Todas', 'Bebidas', 'Lanches', 'Pratos', 'Sobremesas'];

function qtd(item) { return item.quantidade ?? item.quantity; }
function preco(item) { return item.preco ?? item.unitPrice; }
function nome(item) { return item.nome ?? item.product?.name ?? 'Produto'; }
function precoProduto(p) { return p.price ?? p.precoVenda; }

function calcularTotais(itens) {
  try {
    return recalcular?.(itens) || { total: 0, itensCount: 0 };
  } catch (e) {
    return { total: 0, itensCount: 0 };
  }
}

export default function Garcom() {
  const navigate = useNavigate();
  const ctxComanda = useContext(ComandaContext);
  const { logout, user } = useContext(AuthContext);

  function sair() {
    logout();
    navigate('/', { replace: true });
  }

  const { comandas, setComandas } = ctxComanda;
  const produtos = ctxComanda.produtos;
  const [comandaSelecionadaNumero, setComandaSelecionadaNumero] = useState(null);
  const [quantidades, setQuantidades] = useState({});
  const [filtroStatus, setFiltroStatus] = useState('TODAS');
  const [filtroCategoria, setFiltroCategoria] = useState('Todas');
  const [busca, setBusca] = useState('');
  const [alertMsg, setAlertMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  const alerta = useCallback((msg) => {
    setAlertMsg(msg);
    setTimeout(() => setAlertMsg(null), 4000);
  }, []);

  const comandaAtual = useMemo(
    () => comandas.find(c => c.number === comandaSelecionadaNumero) || null,
    [comandas, comandaSelecionadaNumero]
  );

  useEffect(() => {
    if (!IS_MOCK) {
      ctxComanda.carregarComandas();
      ctxComanda.carregarProdutos();
    }
  }, []);

  function abrirComanda(comanda) {
    setComandaSelecionadaNumero(comanda.number);
    setQuantidades({});
  }

  function itemExiste(i, produto) {
    return (
      (i.productId ?? i.product_id ?? null) === produto.id ||
      (i.id && produto.id && i.id === produto.id) ||
      nome(i) === produto.name
    );
  }

  function adicionarItem(produto) {
    if (!comandaAtual) return;

    const estoque = Number(produto.estoque ?? 0);
    const qtdAdicionar = Math.max(1, Number(quantidades[produto.id]) || 1);

    if (estoque <= 0) {
      alerta('Produto esgotado. Não é possível adicionar.');
      return;
    }

    if (comandaAtual.status === 'AGUARDANDO_PAGAMENTO') {
      alerta('Comanda em conferência no caixa. Bloqueada para novos pedidos');
      return;
    }

    const OrderItemsOrigem = comandaAtual.OrderItems || [];
    const existente = OrderItemsOrigem.find(i => itemExiste(i, produto));
    const quantidadeAtual = existente ? (Number(qtd(existente)) || 0) : 0;

    if (quantidadeAtual + qtdAdicionar > estoque) {
      alerta(`Estoque insuficiente para ${produto.name} (máx ${estoque} un)`);
      return;
    }

    setLoading(true);

    if (IS_MOCK) {
      setComandas(prev => prev.map(c => {
        if (c.number !== comandaAtual.number) return c;

        let novosItens;
        if (existente) {
          const novaQtd = quantidadeAtual + qtdAdicionar;
          novosItens = OrderItemsOrigem.map(i =>
            itemExiste(i, produto)
              ? { ...i, quantidade: novaQtd, quantity: novaQtd }
              : i
          );
        } else {
          novosItens = [
            ...OrderItemsOrigem,
            {
              id: `mock-${Date.now()}`,
              productId: produto.id,
              nome: produto.name,
              preco: precoProduto(produto),
              quantidade: qtdAdicionar,
              categoria: produto.category,
              quantity: qtdAdicionar,
              unitPrice: precoProduto(produto),
              product: { name: produto.name },
            },
          ];
        }

        const { total, itensCount } = calcularTotais(novosItens);
        const status = c.status === 'DISPONIVEL' ? 'ABERTA' : c.status;

        return { ...c, OrderItems: novosItens, total, itensCount, status };
      }));
      setQuantidades(prev => ({ ...prev, [produto.id]: 1 }));
      setLoading(false);
    } else {
      ctxComanda.adicionarItemComanda(comandaAtual.number, produto.id, qtdAdicionar)
        .then(() => setQuantidades(prev => ({ ...prev, [produto.id]: 1 })))
        .catch(err => alerta(err.response?.data?.error || 'Erro ao adicionar item'))
        .finally(() => setLoading(false));
    }
  }

  function packQtdItem(item, quantidade) {
    return { ...item, quantidade, quantity: quantidade };
  }

  function editarItem(itemId, acao) {
    if (!comandaAtual) return;

    const itemOrigem = (comandaAtual.OrderItems || []).find(i => i.id === itemId);
    if (!itemOrigem) return;

    if (acao === 'increase') {
      const produto = produtos.find(p =>
        (itemOrigem.productId ?? itemOrigem.product_id ?? null) === p.id ||
        nome(itemOrigem) === p.name
      );
      const estoque = Number(produto?.estoque ?? 0);
      if (estoque > 0 && qtd(itemOrigem) + 1 > estoque) {
        alerta(`Estoque insuficiente para ${nome(itemOrigem)} (máx ${estoque} un)`);
        return;
      }
    }

    setLoading(true);

    if (IS_MOCK) {
      setComandas(prev => prev.map(c => {
        if (c.number !== comandaAtual.number) return c;

        let OrderItems = (c.OrderItems || []).map(item => {
          if (item.id !== itemId) return item;
          if (acao === 'increase') return packQtdItem(item, qtd(item) + 1);
          if (acao === 'decrease') return packQtdItem(item, qtd(item) - 1);
          return item;
        });

        if (acao === 'remove') {
          OrderItems = OrderItems.filter(item => item.id !== itemId);
        } else if (acao === 'decrease') {
          OrderItems = OrderItems.filter(item => qtd(item) > 0);
        }

        const { total, itensCount } = calcularTotais(OrderItems);
        const status = OrderItems.length === 0 ? 'DISPONIVEL' : c.status;

        return { ...c, OrderItems, total, itensCount, status };
      }));
      setLoading(false);
    } else {
      setLoading(false);
      alerta('Edição de itens via API não implementada no backend');
    }
  }

  function handleAbrirComanda() {
    if (!comandaAtual) return;
    setLoading(true);

    if (IS_MOCK) {
      setComandas(prev => prev.map(c =>
        c.number === comandaAtual.number
          ? { ...c, status: 'ABERTA' }
          : c
      ));
      alerta('Comanda aberta com sucesso!');
      setLoading(false);
    } else {
      ctxComanda.mudarStatusComanda(comandaAtual.number, 'ABERTA')
        .then(() => alerta('Comanda aberta com sucesso!'))
        .catch(err => alerta(err.response?.data?.error || 'Erro ao abrir comanda'))
        .finally(() => setLoading(false));
    }
  }

  function solicitarPagamento() {
    if (!comandaAtual) return;
    setLoading(true);

    if (IS_MOCK) {
      setComandas(prev => prev.map(c =>
        c.number === comandaAtual.number
          ? { ...c, status: 'AGUARDANDO_PAGAMENTO' }
          : c
      ));
      setComandaSelecionadaNumero(null);
      alerta('Pagamento solicitado ao caixa!');
      setLoading(false);
    } else {
      ctxComanda.mudarStatusComanda(comandaAtual.number, 'AGUARDANDO_PAGAMENTO')
        .then(() => {
          setComandaSelecionadaNumero(null);
          alerta('Pagamento solicitado ao caixa!');
        })
        .catch(err => alerta(err.response?.data?.error || 'Erro ao solicitar pagamento'))
        .finally(() => setLoading(false));
    }
  }

  const comandasFiltradas = useMemo(() => {
    let lista = comandas;
    if (filtroStatus !== 'TODAS') lista = lista.filter(c => c.status === filtroStatus);
    if (busca) {
      const num = parseInt(busca);
      if (!isNaN(num)) lista = lista.filter(c => c.number === num);
    }
    return lista;
  }, [comandas, filtroStatus, busca]);

  const produtosFiltrados = useMemo(() => {
    const ativos = produtos.filter(p => p.active !== false);
    if (filtroCategoria === 'Todas') return ativos;
    return ativos.filter(p => p.category === filtroCategoria);
  }, [produtos, filtroCategoria]);

  const totalComanda = (comandaAtual?.OrderItems || []).reduce(
    (acc, i) => acc + qtd(i) * preco(i), 0
  );

  useEffect(() => {
    document.body.classList.toggle('modal-open', !!comandaAtual);
    return () => document.body.classList.remove('modal-open');
  }, [comandaAtual]);

  return (
    <div className="min-h-screen bg-slate-50">
      {alertMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-slate-800 text-white px-5 py-2.5 rounded-lg shadow-lg text-sm font-medium animate-[fadeIn_0.2s_ease-out]">
          {alertMsg}
        </div>
      )}

      {/* HEADER */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-sm font-bold" style={{ backgroundColor: SYSTEM_CONFIG.accentColor }}>P</div>
            <div>
              <h1 className="text-base font-bold leading-tight">{SYSTEM_CONFIG.appName}</h1>
              <p className="text-[11px] text-slate-400 leading-tight">Garçom · {user?.name || 'Carregando...'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 hidden sm:inline">
              {comandas.filter(c => c.status !== 'DISPONIVEL').length} ativas
            </span>
            <Botao
              variant="secondary"
              onClick={sair}
              className="!bg-slate-700 !text-slate-200 hover:!bg-slate-600 !text-xs !px-3 !py-1.5"
            >
              Sair
            </Botao>
          </div>
        </div>
      </header>

      {/* FILTROS */}
      <div className="max-w-7xl mx-auto px-4 pt-4 pb-2 space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { key: 'TODAS', label: 'Todas' },
            { key: 'DISPONIVEL', label: 'Livres' },
            { key: 'ABERTA', label: 'Abertas' },
            { key: 'AGUARDANDO_PAGAMENTO', label: 'Em Caixa' },
          ].map(s => (
            <button
              key={s.key}
              onClick={() => setFiltroStatus(s.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all select-none ${
                filtroStatus === s.key
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {s.label}
            </button>
          ))}
          <div className="flex-1" />
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar nº..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-28 sm:w-36 pl-3 pr-2 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
            />
          </div>
        </div>
      </div>

      {/* GRADE DE COMANDA */}
      <main className="max-w-7xl mx-auto px-4 pb-6">
        <div className="grid grid-cols-2 min-[420px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2.5">
          {comandasFiltradas.slice(0, 100).map(c => (
            <CardComanda key={c.number} comanda={c} onClick={abrirComanda} compacto />
          ))}
          {comandasFiltradas.length === 0 && (
            <p className="col-span-full text-center text-slate-400 text-sm py-12">
              Nenhuma comanda encontrada.
            </p>
          )}
        </div>
      </main>

      {/* MODAL DE COMANDA */}
      {comandaAtual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setComandaSelecionadaNumero(null)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90svh] animate-[fadeIn_0.2s_ease-out]">

            <div className="shrink-0 bg-slate-900 text-white px-5 py-4 flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 className="text-lg font-bold">Comanda #{comandaAtual.number}</h2>
                <span className={`
                  inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider
                  ${comandaAtual.status === 'ABERTA' ? 'bg-blue-500 text-white' :
                    comandaAtual.status === 'AGUARDANDO_PAGAMENTO' ? 'bg-amber-500 text-white' :
                    'bg-emerald-500 text-white'}
                `}>
                  {comandaAtual.status === 'ABERTA' ? 'Aberta' :
                   comandaAtual.status === 'AGUARDANDO_PAGAMENTO' ? 'Em Caixa' : 'Livre'}
                </span>
              </div>
              <button
                onClick={() => setComandaSelecionadaNumero(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 text-lg shrink-0 select-none"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* ITENS CONSUMIDOS */}
              {(comandaAtual.status === 'ABERTA' || (comandaAtual.OrderItems?.length ?? 0) > 0) && (
                <section>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Itens consumidos
                  </h3>
                  <div className="space-y-1">
                    {(comandaAtual.OrderItems || []).map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="flex items-center gap-1.5 py-1.5 px-2 bg-slate-50 rounded-lg text-sm"
                      >
                        <div className="flex-1 min-w-0 flex items-center gap-1.5">
                          <span className="font-medium text-slate-400 tabular-nums shrink-0">{qtd(item)}x</span>
                          <span className="truncate text-slate-700">{nome(item)}</span>
                        </div>

                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            onClick={() => editarItem(item.id, 'decrease')}
                            disabled={loading}
                            className="w-6 h-6 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors disabled:opacity-40 select-none"
                          >-</button>
                          <button
                            onClick={() => editarItem(item.id, 'increase')}
                            disabled={loading}
                            className="w-6 h-6 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors disabled:opacity-40 select-none"
                          >+</button>
                          <button
                            onClick={() => editarItem(item.id, 'remove')}
                            disabled={loading}
                            className="w-6 h-6 rounded bg-red-50 border border-red-200 text-red-500 hover:bg-red-100 text-xs font-bold transition-colors disabled:opacity-40 flex items-center justify-center select-none"
                            title="Remover item"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                          <span className="font-semibold text-slate-800 tabular-nums ml-1 w-14 text-right text-[13px]">
                            R$ {(qtd(item) * preco(item)).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-baseline">
                    <span className="text-sm font-medium text-slate-500">Total</span>
                    <span className="text-xl font-bold text-slate-900 tabular-nums">
                      R$ {totalComanda.toFixed(2)}
                    </span>
                  </div>
                </section>
              )}

              {comandaAtual.status === 'DISPONIVEL' ? (
                <section className="text-center py-10">
                  <div className="text-5xl mb-4">🔓</div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1">Comanda Livre</h3>
                  <p className="text-sm text-slate-500 mb-6">
                    Esta comanda está livre. Abra para começar a registrar pedidos.
                  </p>
                  <Botao
                    variant="primary"
                    className="w-full py-3 text-sm !bg-emerald-600 hover:!bg-emerald-700"
                    onClick={handleAbrirComanda}
                    loading={loading}
                  >
                    ABRIR COMANDA
                  </Botao>
                </section>
              ) : comandaAtual.status === 'AGUARDANDO_PAGAMENTO' ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                  <p className="text-sm font-medium text-amber-800">
                    🛑 Comanda em conferência no caixa
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    Bloqueada para novos pedidos.
                  </p>
                </div>
              ) : (
                <>
                  <section>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Cardápio
                      </h3>
                      <div className="flex gap-1 overflow-x-auto pb-0.5">
                        {CATEGORIAS.map(cat => (
                          <button
                            key={cat}
                            onClick={() => setFiltroCategoria(cat)}
                            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors shrink-0 select-none ${
                              filtroCategoria === cat
                                ? 'bg-slate-900 text-white'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {produtosFiltrados.map(p => {
                        const estoque = p.estoque ?? 0;
                        const esgotado = estoque <= 0;
                        const baixo = !esgotado && estoque <= 5;
                        const qtdSel = quantidades[p.id] || 1;
                        return (
                          <div
                            key={p.id}
                            className={`flex items-center gap-2 py-2 px-3 bg-white border rounded-lg transition-colors ${esgotado ? 'border-red-200 opacity-70' : 'border-slate-100 hover:border-slate-200'}`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                                {esgotado ? (
                                  <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-red-100 text-red-600">Esgotado</span>
                                ) : baixo ? (
                                  <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700">Estoque {estoque}</span>
                                ) : (
                                  <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700">Estoque {estoque}</span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400">{p.category}</p>
                              <p className="text-sm font-bold text-emerald-700">
                                R$ {Number(precoProduto(p)).toFixed(2)}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => setQuantidades(prev => ({
                                  ...prev, [p.id]: Math.max(1, (prev[p.id] || 1) - 1)
                                }))}
                                disabled={esgotado}
                                className="w-7 h-7 rounded-md bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed select-none"
                              >-</button>
                              <span className="w-6 text-center text-sm font-bold tabular-nums text-slate-800 select-none">
                                {qtdSel}
                              </span>
                              <button
                                onClick={() => setQuantidades(prev => ({
                                  ...prev, [p.id]: Math.min((prev[p.id] || 1) + 1, estoque)
                                }))}
                                disabled={esgotado || qtdSel >= estoque}
                                className="w-7 h-7 rounded-md bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed select-none"
                              >+</button>
                              <button
                                onClick={() => adicionarItem(p)}
                                disabled={loading || esgotado}
                                className="ml-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 select-none"
                              >
                                {loading ? '...' : esgotado ? 'Esgotado' : 'Add'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {comandaAtual.status === 'ABERTA' && (
                    <Botao
                      variant="primary"
                      className="w-full py-3 text-sm"
                      onClick={solicitarPagamento}
                      loading={loading}
                    >
                      Solicitar Pagamento
                    </Botao>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, -10px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
}
