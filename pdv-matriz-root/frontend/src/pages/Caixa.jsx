import { useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ComandaContext } from '../context/ComandaContext';
import { AuthContext } from '../context/AuthContext';

import api from '../services/api';
import CardComanda from '../components/CardComanda';
import Botao from '../components/Botao';
import { SYSTEM_CONFIG } from '../config/theme';

const IS_MOCK = import.meta.env.VITE_MOCK_AUTH === 'true';
const TAXA_SERVICO_PADRAO = 0.10;

const METODOS_PAGAMENTO = [
  { key: 'PIX', label: 'PIX', icon: '📱' },
  { key: 'CARTAO_CREDITO', label: 'Crédito', icon: '💳' },
  { key: 'CARTAO_DEBITO', label: 'Débito', icon: '💳' },
  { key: 'DINHEIRO', label: 'Dinheiro', icon: '💵' },
];

export default function Caixa() {
  const navigate = useNavigate();
  const ctxComanda = useContext(ComandaContext);
  const { logout, user } = useContext(AuthContext);

  function sair() {
    logout();
    navigate('/', { replace: true });
  }

  const { comandas, setComandas, adicionarVenda, baixarEstoques } = ctxComanda;
  const [comandaDetalhada, setComandaDetalhada] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [taxaServico] = useState(TAXA_SERVICO_PADRAO);
  const [alertMsg, setAlertMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mobileDrawer, setMobileDrawer] = useState(false);

  useEffect(() => {
    document.body.classList.toggle('modal-open', !!comandaDetalhada && mobileDrawer);
    return () => document.body.classList.remove('modal-open');
  }, [comandaDetalhada, mobileDrawer]);

  const alerta = useCallback((msg) => {
    setAlertMsg(msg);
    setTimeout(() => setAlertMsg(null), 4000);
  }, []);

  useEffect(() => {
    if (!IS_MOCK) ctxComanda.carregarComandas();
  }, []);

  function abrirComanda(comanda) {
    if (IS_MOCK) {
      setComandaDetalhada(comanda);
    } else {
      api.get(`/comandas/${comanda.number}`)
        .then(res => setComandaDetalhada(res.data))
        .catch(() => alerta('Erro ao carregar comanda'));
    }
    setPaymentMethod('PIX');
    setMobileDrawer(true);
  }

  function fecharDetalhe() {
    setMobileDrawer(false);
    setComandaDetalhada(null);
  }

  async function handleMudarStatus(status) {
    if (!comandaDetalhada) return;
    setLoading(true);
    try {
      if (IS_MOCK) {
        setComandaDetalhada(prev => ({ ...prev, status }));
        setComandas(prev => prev.map(c =>
          c.number === comandaDetalhada.number ? { ...c, status } : c
        ));
        alerta(`Status alterado para ${status === 'AGUARDANDO_PAGAMENTO' ? 'Em Caixa' : status}`);
      } else {
        await ctxComanda.mudarStatusComanda(comandaDetalhada.number, status);
        const { data } = await api.get(`/comandas/${comandaDetalhada.number}`);
        setComandaDetalhada(data);
        alerta(`Status alterado para ${status === 'AGUARDANDO_PAGAMENTO' ? 'Em Caixa' : status}`);
      }
    } catch (err) {
      alerta(err.response?.data?.error || 'Erro ao alterar status');
    } finally {
      setLoading(false);
    }
  }

  async function handleFechar() {
    if (!comandaDetalhada) return;
    const metodoApi = paymentMethod === 'CARTAO_CREDITO' || paymentMethod === 'CARTAO_DEBITO'
      ? 'CARTAO' : paymentMethod;
    setLoading(true);
    try {
      if (IS_MOCK) {
        const items = (comandaDetalhada.OrderItems || []).map(item => ({
          productId: item.productId || `p-${item.id}`,
          nome: item.product?.name || item.nome || 'Produto',
          quantity: item.quantity,
          unitPrice: item.unitPrice || item.preco,
          unitCost: item.unitCost || item.precoCusto || 0,
        }));
        const faturamento = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
        const cmv = items.reduce((s, i) => s + i.quantity * i.unitCost, 0);
        const venda = {
          id: `venda-${Date.now()}`,
          orderNumber: comandaDetalhada.number,
          paymentMethod: metodoApi,
          closedAt: new Date().toISOString(),
          items,
          total: faturamento,
          totalCost: cmv,
          lucro: faturamento - cmv,
        };
        adicionarVenda(venda);
        baixarEstoques(items);
        setComandas(prev => prev.map(c =>
          c.number === comandaDetalhada.number
            ? { number: c.number, status: 'DISPONIVEL', OrderItems: [], total: 0, itensCount: 0 }
            : c
        ));
        fecharDetalhe();
        alerta('Conta fechada com sucesso!');
      } else {
        await ctxComanda.fecharComanda(comandaDetalhada.number, metodoApi);
        fecharDetalhe();
        alerta('Conta fechada com sucesso!');
      }
    } catch (err) {
      alerta(err.response?.data?.error || 'Erro ao fechar conta');
    } finally {
      setLoading(false);
    }
  }

  const comandasOrdenadas = useMemo(() => {
    return [...comandas]
      .filter(c =>
        c.status === 'AGUARDANDO_PAGAMENTO' &&
        c.total > 0 &&
        c.itensCount > 0
      );
  }, [comandas]);

  const subtotal = comandaDetalhada?.OrderItems?.reduce(
    (acc, i) => acc + i.quantity * i.unitPrice, 0
  ) || 0;
  const valorTaxa = subtotal * taxaServico;
  const totalFinal = subtotal + valorTaxa;

  const temItens = (comandaDetalhada?.OrderItems?.length ?? 0) > 0;

  const detales = comandaDetalhada && (
    <div className="h-full flex flex-col">
      <div className="shrink-0 flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Comanda #{comandaDetalhada.number}
          </h2>
          {temItens && (
            <span className={`
              inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider
              ${comandaDetalhada.status === 'AGUARDANDO_PAGAMENTO' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}
            `}>
              {comandaDetalhada.status === 'AGUARDANDO_PAGAMENTO' ? 'Em Caixa' : 'Aberta'}
            </span>
          )}
        </div>
        <button
          onClick={fecharDetalhe}
          className="lg:hidden w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 select-none"
        >
          &times;
        </button>
      </div>

      {temItens ? (
        <div className="flex-1 overflow-y-auto space-y-5">
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Itens consumidos
            </h3>
            <div className="space-y-1">
              {comandaDetalhada.OrderItems.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium text-slate-400 tabular-nums shrink-0">{item.quantity}x</span>
                    <span className="truncate text-slate-700">{item.product?.name || 'Produto'}</span>
                  </div>
                  <span className="font-semibold text-slate-800 tabular-nums shrink-0 ml-3">
                    R$ {(item.quantity * item.unitPrice).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-slate-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Subtotal</span>
              <span className="tabular-nums">R$ {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Taxa de serviço ({(taxaServico * 100).toFixed(0)}%)</span>
              <span className="tabular-nums">R$ {valorTaxa.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
              <span>Total</span>
              <span className="tabular-nums text-emerald-700">R$ {totalFinal.toFixed(2)}</span>
            </div>
          </section>

          <section>
            {comandaDetalhada.status !== 'AGUARDANDO_PAGAMENTO' && (
              <Botao
                variant="primary"
                onClick={() => handleMudarStatus('AGUARDANDO_PAGAMENTO')}
                loading={loading}
                className="w-full mb-2"
              >
                Bloquear para Pagamento
              </Botao>
            )}

            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-4">
              Forma de Pagamento
            </h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {METODOS_PAGAMENTO.map(m => (
                  <button
                    key={m.key}
                    onClick={() => setPaymentMethod(m.key)}
                    className={`
                      flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-semibold border-2 transition-all select-none
                      ${paymentMethod === m.key
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white'
                      }
                    `}
                  >
                    <span>{m.icon}</span>
                    <span>{m.label}</span>
                  </button>
              ))}
            </div>

            <Botao
              variant="success"
              onClick={handleFechar}
              loading={loading}
              className="w-full py-3 text-sm"
            >
              Finalizar Conta — R$ {totalFinal.toFixed(2)}
            </Botao>
          </section>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
          Comanda vazia ou já finalizada.
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {alertMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-slate-800 text-white px-5 py-2.5 rounded-lg shadow-lg text-sm font-medium">
          {alertMsg}
        </div>
      )}

      <header className="bg-slate-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-sm font-bold" style={{ backgroundColor: SYSTEM_CONFIG.accentColor }}>C</div>
            <div>
              <h1 className="text-base font-bold leading-tight">{SYSTEM_CONFIG.appName}</h1>
              <p className="text-[11px] text-slate-400 leading-tight">Frente de Caixa · {user?.name || 'Carregando...'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 hidden sm:inline">
              {comandasOrdenadas.length} pendentes
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

      <main className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex gap-6">
          <div className={`${comandaDetalhada ? 'hidden lg:block' : 'block'} w-full lg:w-72 xl:w-80 shrink-0`}>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Comandas com consumo
            </h2>
            {comandasOrdenadas.length === 0 ? (
              <p className="text-slate-400 text-sm">Nenhuma comanda pendente.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2.5">
                {comandasOrdenadas.map(c => (
                  <CardComanda
                    key={c.number}
                    comanda={c}
                    onClick={abrirComanda}
                    destacado={c.status === 'AGUARDANDO_PAGAMENTO'}
                    compacto
                  />
                ))}
              </div>
            )}
          </div>

          <div className="hidden lg:block flex-1 min-w-0">
            {comandaDetalhada ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 h-full">
                {detales}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 flex items-center justify-center h-full min-h-[300px]">
                <p className="text-slate-400 text-sm">Selecione uma comanda ao lado</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {comandaDetalhada && mobileDrawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={fecharDetalhe} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col animate-[slideUp_0.25s_ease-out]">
            <div className="shrink-0 flex items-center justify-center pt-3 pb-1 select-none">
              <div className="w-10 h-1 rounded-full bg-slate-300" />
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-6 pt-2">
              {detales}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
