import { useContext, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ComandaContext } from '../context/ComandaContext';
import Botao from '../components/Botao';
import { sanitizarString, sanitizarNumero, sanitizarEmail, sanitizarInteiro } from '../utils/sanitize';
import { SYSTEM_CONFIG } from '../config/theme';

const IS_MOCK = import.meta.env.VITE_MOCK_AUTH === 'true';

const SENHA_PADRAO = '12345678';

const TAB_DASHBOARD = 'dashboard';
const TAB_PRODUTOS = 'produtos';
const TAB_FUNCIONARIOS = 'funcionarios';

function fmt(n) {
  return `R$ ${Number(n).toFixed(2)}`;
}

const ROLE_BADGE = {
  GARCOM: 'bg-blue-100 text-blue-700',
  CAIXA: 'bg-amber-100 text-amber-700',
  ADMIN: 'bg-purple-100 text-purple-700',
};

const ROLE_LABEL = {
  GARCOM: 'Garçom',
  CAIXA: 'Caixa',
  ADMIN: 'Gestor',
};

export default function Gestor() {
  const navigate = useNavigate();
  const { logout, user, usuarios, setUsuarios, adicionarUsuario } = useContext(AuthContext);
  const { vendas, produtos, setProdutos, adicionarProduto } = useContext(ComandaContext);
  const [aba, setAba] = useState(TAB_DASHBOARD);

  function sair() {
    logout();
    navigate('/', { replace: true });
  }

  const [buscaProduto, setBuscaProduto] = useState('');
  const [showFormProduto, setShowFormProduto] = useState(false);
  const [editProduto, setEditProduto] = useState(null);

  const [showAbastecer, setShowAbastecer] = useState(false);
  const [buscaAbastecimento, setBuscaAbastecimento] = useState('');
  const [produtoAbastecimento, setProdutoAbastecimento] = useState(null);
  const [qtdAbastecimento, setQtdAbastecimento] = useState('');
  const [formProduto, setFormProduto] = useState({ name: '', precoVenda: '', precoCusto: '', category: 'Bebidas', estoque: 0, active: true });

  const funcionarios = usuarios;
  const [buscaFunc, setBuscaFunc] = useState('');

  const [showFormFunc, setShowFormFunc] = useState(false);
  const [formFunc, setFormFunc] = useState({ name: '', email: '', role: 'GARCOM', password: '12345678', active: true });

  const [editFunc, setEditFunc] = useState(null);
  const [formEditFunc, setFormEditFunc] = useState({ name: '', email: '', role: 'GARCOM', active: true });
  const [deleteFunc, setDeleteFunc] = useState(null);

  const [alertMsg, setAlertMsg] = useState(null);
  const [vendaSelecionada, setVendaSelecionada] = useState(null);
  const [showAlertaEstoque, setShowAlertaEstoque] = useState(false);

  useEffect(() => {
    setEditProduto(null);
    setShowFormProduto(false);
    setShowFormFunc(false);
    setEditFunc(null);
    setDeleteFunc(null);
    setShowAbastecer(false);
    setProdutoAbastecimento(null);
    setQtdAbastecimento('');
    setBuscaAbastecimento('');
  }, [aba]);

  useEffect(() => {
    const aberto = showFormProduto || showFormFunc || editFunc || deleteFunc || showAbastecer || vendaSelecionada || showAlertaEstoque;
    document.body.classList.toggle('modal-open', !!aberto);
    return () => document.body.classList.remove('modal-open');
  }, [showFormProduto, showFormFunc, editFunc, deleteFunc, showAbastecer, vendaSelecionada, showAlertaEstoque]);

  function alerta(msg) {
    setAlertMsg(msg);
    setTimeout(() => setAlertMsg(null), 4000);
  }

  function abrirFormNovo() {
    setEditProduto(null);
    setFormProduto({ name: '', precoVenda: '', precoCusto: '', category: 'Bebidas', estoque: 0, active: true });
    setShowFormProduto(true);
  }

  function abrirFormEditar(p) {
    setEditProduto(p);
    setFormProduto({ name: p.name, precoVenda: String(p.precoVenda), precoCusto: String(p.precoCusto), category: p.category, estoque: p.estoque ?? 0, active: p.active });
    setShowFormProduto(true);
  }

  function handleSalvarProduto(e) {
    e.preventDefault();
    if (!formProduto.name || !formProduto.precoVenda || !formProduto.precoCusto) {
      alerta('Preencha nome, preço de venda e preço de custo');
      return;
    }
    if (!IS_MOCK) return;
    const nome = sanitizarString(formProduto.name);
    const precoVenda = sanitizarNumero(formProduto.precoVenda, 0.01, 99999);
    const precoCusto = sanitizarNumero(formProduto.precoCusto, 0, 99999);
    const estoque = sanitizarInteiro(formProduto.estoque, 0, 999999);
    if (!nome || precoVenda <= 0) {
      alerta('Nome inválido ou preço de venda deve ser maior que zero');
      return;
    }
    if (editProduto) {
      setProdutos(prev => prev.map(p =>
        p.id === editProduto.id
          ? { ...p, name: nome, precoVenda, precoCusto, estoque, category: formProduto.category, active: formProduto.active }
          : p
      ));
      alerta('Produto atualizado');
    } else {
      setProdutos(prev => [...prev, {
        id: `p${Date.now()}`,
        name: nome,
        precoVenda,
        precoCusto,
        estoque,
        category: formProduto.category,
        active: formProduto.active,
      }]);
      alerta('Produto criado');
    }
    setShowFormProduto(false);
    setEditProduto(null);
  }

  function abrirAbastecer() {
    setProdutoAbastecimento(null);
    setQtdAbastecimento('');
    setBuscaAbastecimento('');
    setShowAbastecer(true);
  }

  function selecionarProdutoAbastecimento(p) {
    setProdutoAbastecimento(p);
    setQtdAbastecimento('');
  }

  function confirmarAbastecimento(e) {
    e.preventDefault();
    if (!produtoAbastecimento) return;
    const qtd = sanitizarInteiro(qtdAbastecimento, 1, 999999);
    if (!qtd) {
      alerta('Informe uma quantidade válida para adicionar');
      return;
    }
    if (!IS_MOCK) return;
    setProdutos(prev => prev.map(p =>
      p.id === produtoAbastecimento.id
        ? { ...p, estoque: (p.estoque ?? 0) + qtd }
        : p
    ));
    const nome = produtoAbastecimento.name;
    alerta(`Estoque de "${nome}" abastecido em +${qtd} un`);
    setShowAbastecer(false);
    setProdutoAbastecimento(null);
    setQtdAbastecimento('');
    setBuscaAbastecimento('');
  }

  function abrirFormNovoFunc() {
    setFormFunc({ name: '', email: '', role: 'GARCOM', password: SENHA_PADRAO, active: true });
    setShowFormFunc(true);
  }

  function handleSalvarFunc(e) {
    e.preventDefault();
    if (!formFunc.name.trim() || !formFunc.email.trim()) {
      alerta('Preencha nome e e-mail');
      return;
    }
    if (!IS_MOCK) return;
    const nome = sanitizarString(formFunc.name);
    const email = sanitizarEmail(formFunc.email);
    if (!nome || !email) {
      alerta('Dados inválidos');
      return;
    }
    const duplicado = funcionarios.find(f => f.email === email);
    if (duplicado) {
      alerta(`Já existe um usuário com o e-mail "${email}"`);
      return;
    }
    const senha = (formFunc.password || '').trim() || SENHA_PADRAO;
    adicionarUsuario({ name: nome, email, password: senha, role: formFunc.role, active: formFunc.active });
    alerta(`Usuário(a) ${nome} cadastrado(a) com sucesso! Senha definida.`);
    setShowFormFunc(false);
  }

  function abrirFormEditarFunc(f) {
    setEditFunc(f);
    setFormEditFunc({
      name: f.name,
      email: f.email,
      role: f.role,
      active: f.active,
    });
  }

  function handleSalvarEditFunc(e) {
    e.preventDefault();
    const nome = sanitizarString(formEditFunc.name);
    const email = sanitizarEmail(formEditFunc.email);
    if (!nome || !email) {
      alerta('Preencha nome e e-mail válidos');
      return;
    }
    if (!IS_MOCK) return;
    const duplicado = funcionarios.find(f => f.email === email && f.id !== editFunc.id);
    if (duplicado) {
      alerta(`Já existe outro usuário com o e-mail "${email}"`);
      return;
    }
    setUsuarios(prev => prev.map(f =>
      f.id === editFunc.id
        ? {
            ...f,
            name: nome,
            email,
            role: formEditFunc.role,
            active: formEditFunc.active,
          }
        : f
    ));
    alerta('Funcionário atualizado');
    setEditFunc(null);
  }

  function handleConfirmDeleteFunc() {
    if (!deleteFunc) return;
    if (!IS_MOCK) return;
    setUsuarios(prev => prev.filter(f => f.id !== deleteFunc.id));
    alerta(`Acesso de ${deleteFunc.name} removido`);
    setDeleteFunc(null);
  }

  const produtosFiltrados = produtos.filter(p =>
    !buscaProduto || p.name.toLowerCase().includes(buscaProduto.toLowerCase())
  );

  const produtosAbastecerFiltrados = produtos.filter(p =>
    !buscaAbastecimento || p.name.toLowerCase().includes(buscaAbastecimento.toLowerCase())
  );

  const funcFiltrados = funcionarios.filter(f =>
    !buscaFunc || f.name.toLowerCase().includes(buscaFunc.toLowerCase()) || f.email.toLowerCase().includes(buscaFunc.toLowerCase())
  );

  const metricas = useMemo(() => {
    let faturamentoBruto = 0;
    let custoTotal = 0;
    for (const c of vendas) {
      for (const item of c.items) {
        faturamentoBruto += item.quantity * item.unitPrice;
        custoTotal += item.quantity * item.unitCost;
      }
    }
    const lucroReal = faturamentoBruto - custoTotal;
    const margemLucro = faturamentoBruto > 0 ? (lucroReal / faturamentoBruto) * 100 : 0;
    return { faturamentoBruto, custoTotal, lucroReal, margemLucro };
  }, [vendas]);

  const ESTOQUE_CRITICO_LIMITE = 5;

  const estoqueCritico = useMemo(() => {
    const lista = produtos
      .filter(p => (p.estoque ?? 0) <= ESTOQUE_CRITICO_LIMITE)
      .sort((a, b) => (a.estoque ?? 0) - (b.estoque ?? 0));
    return { contagem: lista.length, lista };
  }, [produtos]);

  const vendasRecentes = useMemo(() =>
    [...vendas]
      .map(c => ({
        id: c.id,
        orderNumber: c.orderNumber,
        total: c.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0),
        paymentMethod: c.paymentMethod,
        closedAt: c.closedAt,
        items: c.items,
      }))
      .sort((a, b) => (b.closedAt || '').localeCompare(a.closedAt || '')),
  [vendas]);

  const topProdutos = useMemo(() => {
    const agg = {};
    vendas.forEach(c => {
      c.items.forEach(i => {
        const key = i.productId || i.nome || 'desconhecido';
        if (!agg[key]) {
          const p = produtos.find(x => x.id === i.productId);
          agg[key] = { name: p?.name || i.nome || 'Desconhecido', qtd: 0, total: 0 };
        }
        agg[key].qtd += i.quantity;
        agg[key].total += i.quantity * i.unitPrice;
      });
    });
    return Object.values(agg).sort((a, b) => b.qtd - a.qtd).slice(0, 5);
  }, [vendas, produtos]);

  const pagamentoBreakdown = useMemo(() => {
    const agg = {};
    vendas.forEach(c => {
      if (!agg[c.paymentMethod]) agg[c.paymentMethod] = 0;
      agg[c.paymentMethod] += c.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    });
    const total = Object.values(agg).reduce((s, v) => s + v, 0);
    const labelMap = { PIX: 'PIX', CARTAO: 'Cartão', DINHEIRO: 'Dinheiro' };
    const colorMap = { PIX: 'text-blue-700', CARTAO: 'text-purple-700', DINHEIRO: 'text-emerald-700' };
    return Object.entries(agg).map(([method, value]) => ({
      label: labelMap[method] || method,
      total: value,
      color: colorMap[method] || 'text-slate-700',
      pct: total > 0 ? Math.round((value / total) * 100) : 0,
    }));
  }, [vendas]);

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
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-sm font-bold" style={{ backgroundColor: SYSTEM_CONFIG.accentColor }}>G</div>
            <div>
              <h1 className="text-base font-bold leading-tight">{SYSTEM_CONFIG.appName}</h1>
              <p className="text-[11px] text-slate-400 leading-tight">Painel do Gestor · {user?.name || 'Carregando...'}</p>
            </div>
          </div>
          <Botao
            variant="secondary"
            onClick={sair}
            className="!bg-slate-700 !text-slate-200 hover:!bg-slate-600 !text-xs !px-3 !py-1.5"
          >
            Sair
          </Botao>
        </div>
      </header>

      {/* NAV DE ABAS */}
      <div className="max-w-7xl mx-auto px-4 pt-4 pb-2">
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-slate-200 w-fit overflow-x-auto">
          {[
            { key: TAB_DASHBOARD, label: 'Dashboard' },
            { key: TAB_PRODUTOS, label: 'Produtos' },
            { key: TAB_FUNCIONARIOS, label: 'Funcionários' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setAba(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap select-none ${
                aba === t.key
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 pb-6">
        {/* ────────── ABA 1: DASHBOARD ────────── */}
        {aba === TAB_DASHBOARD && (
          <div className="space-y-6">
            {/* Métricas Financeiras */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Faturamento Bruto</p>
                <p className="text-2xl font-bold text-emerald-700 tabular-nums">{fmt(metricas.faturamentoBruto)}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Custo dos Produtos</p>
                <p className="text-2xl font-bold text-amber-700 tabular-nums">{fmt(metricas.custoTotal)}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Lucro Real</p>
                <p className={`text-2xl font-bold tabular-nums ${metricas.lucroReal >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {fmt(metricas.lucroReal)}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Margem de Lucro Média</p>
                <p className={`text-2xl font-bold tabular-nums ${metricas.margemLucro >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {metricas.margemLucro.toFixed(1)}%
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAlertaEstoque(true)}
                className={`text-left w-full rounded-xl shadow-sm border p-5 transition-all duration-200 cursor-pointer select-none active:scale-[0.98] ${
                  estoqueCritico.contagem > 0
                    ? 'bg-red-50 border-red-200 hover:bg-red-100 hover:shadow-md'
                    : 'bg-white border-slate-200 hover:bg-slate-50 hover:shadow-md'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Alerta de Estoque</p>
                  {estoqueCritico.contagem > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">CRÍTICO</span>
                  )}
                </div>
                <p className={`text-2xl font-bold tabular-nums ${estoqueCritico.contagem > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                  {estoqueCritico.contagem}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {estoqueCritico.contagem > 0
                    ? `produto(s) com estoque ≤ ${ESTOQUE_CRITICO_LIMITE}`
                    : 'estoque saudável'}
                </p>
              </button>
            </div>

            {/* Grid 2 colunas: Top Produtos + Últimas Vendas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Top Produtos Vendidos</h3>
                <div className="space-y-2">
                  {topProdutos.map((p, i) => (
                    <div key={p.name} className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-xs font-bold flex items-center justify-center text-slate-500 shrink-0">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                        <p className="text-[11px] text-slate-400">{p.qtd} unidades</p>
                      </div>
                      <span className="text-sm font-semibold text-slate-800 tabular-nums">{fmt(p.total)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Últimas Vendas Finalizadas</h3>
                <div className="space-y-2">
                  {vendasRecentes.map(v => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVendaSelecionada(v)}
                      className="w-full flex items-center justify-between py-2 border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50 transition-colors text-left select-none"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800">Comanda #{v.orderNumber}</p>
                        <p className="text-[11px] text-slate-400">
                          {v.closedAt.slice(11, 16)} — {v.paymentMethod === 'PIX' ? 'PIX' : v.paymentMethod === 'CARTAO' ? 'Cartão' : 'Dinheiro'}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-emerald-700 tabular-nums">{fmt(v.total)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Desempenho por forma de pagamento */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {pagamentoBreakdown.map(m => (
                <div key={m.label} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                  <p className="text-xs text-slate-500 mb-1">{m.label}</p>
                  <p className={`text-xl font-bold ${m.color}`}>{fmt(m.total)}</p>
                  <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${m.color.replace('text-', 'bg-')}`} style={{ width: `${m.pct}%` }} />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{m.pct}% do faturamento</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ────────── ABA 2: PRODUTOS ────────── */}
        {aba === TAB_PRODUTOS && (
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
              <input
                type="text"
                placeholder="Buscar produto..."
                value={buscaProduto}
                onChange={e => setBuscaProduto(e.target.value)}
                className="w-full sm:w-64 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
              />
              <div className="flex-1" />
              <div className="flex flex-wrap gap-2">
                <Botao
                  variant="secondary"
                  onClick={abrirAbastecer}
                  className="!text-xs !px-4 !py-2 !bg-emerald-100 !text-emerald-700 hover:!bg-emerald-200"
                >
                  📥 Abastecer Estoque
                </Botao>
                <Botao onClick={abrirFormNovo} className="!text-xs !px-4 !py-2">
                  + Novo Produto
                </Botao>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Nome</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden sm:table-cell">Categoria</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">Venda</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600 hidden sm:table-cell">Custo</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600">Estoque</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Status</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {produtosFiltrados.map(p => {
                      const estoque = p.estoque ?? 0;
                      const alertaEstoque = estoque <= 5;
                      return (
                        <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${alertaEstoque ? 'bg-red-50/60' : ''}`}>
                          <td className={`px-4 py-3 font-medium ${alertaEstoque ? 'text-red-700' : 'text-slate-800'}`}>{p.name}</td>
                          <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">{p.category}</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-800 tabular-nums">{fmt(p.precoVenda)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-600 tabular-nums hidden sm:table-cell">{fmt(p.precoCusto)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums ${
                              estoque === 0 ? 'bg-red-100 text-red-700' :
                              alertaEstoque ? 'bg-amber-100 text-amber-700' :
                              'bg-emerald-100 text-emerald-700'
                            }`}>
                              {estoque === 0 ? 'Zerado' : estoque}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center hidden md:table-cell">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              p.active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {p.active ? 'Disponível' : 'Esgotado'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => abrirFormEditar(p)}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium select-none"
                            >
                              Editar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {produtosFiltrados.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                          Nenhum produto encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Novo / Editar Produto */}
            {showFormProduto && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/30" onClick={() => setShowFormProduto(false)} />
                <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90svh] overflow-y-auto p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">
                    {editProduto ? 'Editar Produto' : 'Novo Produto'}
                  </h3>
                  <form onSubmit={handleSalvarProduto} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                      <input
                        type="text" required
                        value={formProduto.name}
                        onChange={e => setFormProduto(p => ({ ...p, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Preço de Venda (R$)</label>
                      <input
                        type="number" inputMode="decimal" step="0.01" min="0" required
                        value={formProduto.precoVenda}
                        onChange={e => setFormProduto(p => ({ ...p, precoVenda: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Preço de Custo (R$)</label>
                      <input
                        type="number" inputMode="decimal" step="0.01" min="0" required
                        value={formProduto.precoCusto}
                        onChange={e => setFormProduto(p => ({ ...p, precoCusto: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Quantidade em Estoque</label>
                      <input
                        type="number" inputMode="numeric" min="0" step="1" required
                        value={formProduto.estoque}
                        onChange={e => setFormProduto(p => ({ ...p, estoque: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                      <select
                        value={formProduto.category}
                        onChange={e => setFormProduto(p => ({ ...p, category: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                      >
                        <option value="Bebidas">Bebidas</option>
                        <option value="Lanches">Lanches</option>
                        <option value="Pratos">Pratos</option>
                        <option value="Sobremesas">Sobremesas</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                      <select
                        value={formProduto.active ? 'Disponivel' : 'Esgotado'}
                        onChange={e => setFormProduto(p => ({ ...p, active: e.target.value === 'Disponivel' }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                      >
                        <option value="Disponivel">Disponível</option>
                        <option value="Esgotado">Esgotado</option>
                      </select>
                    </div>
                    <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                      <Botao type="button" variant="secondary" onClick={() => setShowFormProduto(false)} className="w-full sm:flex-1">
                        Cancelar
                      </Botao>
                      <Botao type="submit" className="w-full sm:flex-1">
                        {editProduto ? 'Salvar' : 'Criar'}
                      </Botao>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Modal Abastecer Estoque */}
            {showAbastecer && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/30" onClick={() => setShowAbastecer(false)} />
                <div data-modal-abastecer className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90svh] overflow-y-auto p-5 sm:p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">📥 Abastecer Estoque</h3>

                  {!produtoAbastecimento ? (
                    <>
                      <p className="text-sm text-slate-600 mb-3">Selecione o produto a ser abastecido:</p>
                      <input
                        type="text"
                        placeholder="Buscar produto..."
                        value={buscaAbastecimento}
                        onChange={e => setBuscaAbastecimento(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white mb-3"
                      />
                      <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 rounded-lg border border-slate-200">
                        {produtosAbastecerFiltrados.length === 0 && (
                          <p className="px-4 py-6 text-center text-slate-400 text-sm">Nenhum produto encontrado.</p>
                        )}
                        {produtosAbastecerFiltrados.map(p => {
                          const estoque = p.estoque ?? 0;
                          const critico = estoque <= ESTOQUE_CRITICO_LIMITE;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => selecionarProdutoAbastecimento(p)}
                              className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors select-none"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                                <p className="text-[11px] text-slate-400 truncate">{p.category}</p>
                              </div>
                              <span className={`shrink-0 text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full ${
                                estoque === 0 ? 'bg-red-100 text-red-700' :
                                critico ? 'bg-amber-100 text-amber-700' :
                                'bg-emerald-100 text-emerald-700'
                              }`}>
                                {estoque} un
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <form onSubmit={confirmarAbastecimento} className="space-y-4">
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{produtoAbastecimento.name}</p>
                            <p className="text-[11px] text-slate-400">{produtoAbastecimento.category}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setProdutoAbastecimento(null)}
                            className="shrink-0 text-xs text-blue-600 hover:text-blue-800 font-medium select-none"
                          >
                            Trocar produto
                          </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                          Estoque atual: <strong className="tabular-nums">{produtoAbastecimento.estoque ?? 0} un</strong>
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Quantidade a adicionar</label>
                        <input
                          type="number" inputMode="numeric" min="1" step="1" required autoFocus
                          placeholder="Ex: 250"
                          value={qtdAbastecimento}
                          onChange={e => setQtdAbastecimento(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                        />
                        {qtdAbastecimento && Number(qtdAbastecimento) > 0 && (
                          <p className="text-xs text-slate-500 mt-1.5">
                            Novo estoque: <strong className="tabular-nums">{(produtoAbastecimento.estoque ?? 0) + Number(qtdAbastecimento)} un</strong>
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                        <Botao type="button" variant="secondary" onClick={() => setShowAbastecer(false)} className="w-full sm:flex-1">
                          Cancelar
                        </Botao>
                        <Botao type="submit" className="w-full sm:flex-1">
                          Confirmar Entrada
                        </Botao>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ────────── ABA 3: FUNCIONÁRIOS ────────── */}
        {aba === TAB_FUNCIONARIOS && (
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
              <input
                type="text"
                placeholder="Buscar por nome ou email..."
                value={buscaFunc}
                onChange={e => setBuscaFunc(e.target.value)}
                className="w-full sm:w-64 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
              />
              <div className="flex-1" />
              <Botao onClick={abrirFormNovoFunc} className="!text-xs !px-4 !py-2">
                + Novo Funcionário
              </Botao>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-4 py-3 font-semibold text-slate-600">Nome</th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden sm:table-cell">E-mail</th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600">Cargo</th>
                        <th className="text-center px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Status</th>
                        <th className="text-right px-4 py-3 font-semibold text-slate-600">Ações</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {funcFiltrados.map(f => (
                      <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">{f.name}</td>
                        <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">{f.email}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${ROLE_BADGE[f.role] || 'bg-slate-100 text-slate-600'}`}>
                            {ROLE_LABEL[f.role] || f.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center hidden md:table-cell">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            f.active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {f.active ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => abrirFormEditarFunc(f)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors select-none"
                              title="Editar"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setDeleteFunc(f)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors select-none"
                              title="Excluir"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {funcFiltrados.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                          Nenhum funcionário encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ────────── MODAL NOVO FUNCIONÁRIO ────────── */}
        {showFormFunc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30" onClick={() => setShowFormFunc(false)} />
            <div data-modal-funcionario className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90svh] overflow-y-auto p-5 sm:p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Novo Funcionário</h3>
              <form onSubmit={handleSalvarFunc} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                  <input
                    type="text" required
                    value={formFunc.name}
                    onChange={e => setFormFunc(f => ({ ...f, name: e.target.value }))}
                    className="w-full min-w-0 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="Nome do funcionário"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">E-mail / Login</label>
                  <input
                    type="email" required
                    value={formFunc.email}
                    onChange={e => setFormFunc(f => ({ ...f, email: e.target.value }))}
                    className="w-full min-w-0 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="email@pdv.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cargo</label>
                  <select
                    value={formFunc.role}
                    onChange={e => setFormFunc(f => ({ ...f, role: e.target.value }))}
                    className="w-full min-w-0 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                  >
                    <option value="GARCOM">Garçom</option>
                    <option value="CAIXA">Caixa</option>
                    <option value="ADMIN">Gestor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status Inicial</label>
                  <select
                    value={formFunc.active ? 'Ativo' : 'Inativo'}
                    onChange={e => setFormFunc(f => ({ ...f, active: e.target.value === 'Ativo' }))}
                    className="w-full min-w-0 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Senha de Acesso (Padrão: {SENHA_PADRAO})</label>
                  <input
                    type="text"
                    autoComplete="new-password"
                    value={formFunc.password}
                    onChange={e => setFormFunc(f => ({ ...f, password: e.target.value }))}
                    placeholder={SENHA_PADRAO}
                    className="w-full min-w-0 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                  <Botao type="button" variant="secondary" onClick={() => setShowFormFunc(false)} className="w-full sm:flex-1">
                    Cancelar
                  </Botao>
                  <Botao type="submit" className="w-full sm:flex-1">
                    Salvar
                  </Botao>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ────────── MODAL EDITAR FUNCIONÁRIO ────────── */}
        {editFunc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30" onClick={() => setEditFunc(null)} />
            <div data-modal-funcionario className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90svh] overflow-y-auto p-5 sm:p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Editar Funcionário</h3>
              <form onSubmit={handleSalvarEditFunc} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                  <input
                    type="text" required
                    value={formEditFunc.name}
                    onChange={e => setFormEditFunc(f => ({ ...f, name: e.target.value }))}
                    className="w-full min-w-0 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="Nome do funcionário"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">E-mail / Login</label>
                  <input
                    type="email" required
                    value={formEditFunc.email}
                    onChange={e => setFormEditFunc(f => ({ ...f, email: e.target.value }))}
                    className="w-full min-w-0 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="email@pdv.com"
                  />
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <p className="text-xs text-slate-500 mb-1">Senha de acesso (padrão do sistema)</p>
                  <code className="text-sm font-mono text-slate-700 bg-white px-2 py-1 rounded border border-slate-200">{SENHA_PADRAO}</code>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cargo</label>
                  <select
                    value={formEditFunc.role}
                    onChange={e => setFormEditFunc(f => ({ ...f, role: e.target.value }))}
                    className="w-full min-w-0 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                  >
                    <option value="GARCOM">Garçom</option>
                    <option value="CAIXA">Caixa</option>
                    <option value="ADMIN">Gestor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={formEditFunc.active ? 'Ativo' : 'Inativo'}
                    onChange={e => setFormEditFunc(f => ({ ...f, active: e.target.value === 'Ativo' }))}
                    className="w-full min-w-0 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>
                <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                  <Botao type="button" variant="secondary" onClick={() => setEditFunc(null)} className="w-full sm:flex-1">
                    Cancelar
                  </Botao>
                  <Botao type="submit" className="w-full sm:flex-1">
                    Salvar Alterações
                  </Botao>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ────────── MODAL CONFIRMAR EXCLUSÃO ────────── */}
        {deleteFunc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setDeleteFunc(null)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[90svh] overflow-y-auto p-5 sm:p-6 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Excluir Funcionário</h3>
              <p className="text-sm text-slate-500 mb-6">
                Tem certeza que deseja remover o acesso de <strong>{deleteFunc.name}</strong>? Esta ação não poderá ser desfeita.
              </p>
              <div className="flex flex-col-reverse sm:flex-row gap-2">
                <Botao type="button" variant="secondary" onClick={() => setDeleteFunc(null)} className="w-full sm:flex-1">
                  Cancelar
                </Botao>
                <Botao
                  type="button"
                  onClick={handleConfirmDeleteFunc}
                  className="w-full sm:flex-1 !bg-red-600 hover:!bg-red-700 !text-white"
                >
                  Confirmar Exclusão
                </Botao>
              </div>
            </div>
          </div>
        )}

        {/* ────────── MODAL RESUMO DA VENDA ────────── */}
        {vendaSelecionada && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30" onClick={() => setVendaSelecionada(null)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5 sm:p-6">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Comanda #{vendaSelecionada.orderNumber}</h3>
                  <p className="text-xs text-slate-400">
                    Finalizada às {vendaSelecionada.closedAt.slice(11, 16)} · {vendaSelecionada.closedAt.slice(0, 10)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setVendaSelecionada(null)}
                  className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors select-none"
                  title="Fechar"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                vendaSelecionada.paymentMethod === 'PIX' ? 'bg-blue-100 text-blue-700' :
                vendaSelecionada.paymentMethod === 'CARTAO' ? 'bg-purple-100 text-purple-700' :
                'bg-emerald-100 text-emerald-700'
              }`}>
                {vendaSelecionada.paymentMethod === 'PIX' ? 'PIX' : vendaSelecionada.paymentMethod === 'CARTAO' ? 'Cartão' : 'Dinheiro'}
              </span>

              <p className="text-sm font-semibold text-slate-700 mt-4 mb-2">Itens Consumidos</p>
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {(vendaSelecionada.items || []).map((item, i) => {
                  const subtotal = item.quantity * item.unitPrice;
                  const nome = item.nome || item.name || `Produto #${i + 1}`;
                  return (
                    <div key={i} className="flex items-center justify-between gap-3 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{nome}</p>
                        <p className="text-[11px] text-slate-400 tabular-nums">
                          {item.quantity}x × {fmt(item.unitPrice)}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-slate-800 tabular-nums">{fmt(subtotal)}</span>
                    </div>
                  );
                })}
                {(vendaSelecionada.items || []).length === 0 && (
                  <p className="px-3 py-4 text-center text-slate-400 text-sm">Nenhum item registrado.</p>
                )}
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200">
                <p className="text-sm font-semibold text-slate-700">Valor Total</p>
                <p className="text-lg font-bold text-emerald-700 tabular-nums">{fmt(vendaSelecionada.total)}</p>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2 pt-4">
                <Botao
                  type="button"
                  variant="secondary"
                  onClick={() => setVendaSelecionada(null)}
                  className="w-full sm:flex-1"
                >
                  Fechar
                </Botao>
              </div>
            </div>
          </div>
        )}
      {showAlertaEstoque && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAlertaEstoque(false)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5 sm:p-6">
              <div className="flex items-start justify-between mb-1">
                <h3 className="text-lg font-bold text-slate-800">Itens com Estoque Baixo</h3>
                <button
                  type="button"
                  onClick={() => setShowAlertaEstoque(false)}
                  className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors select-none"
                  title="Fechar"
                  aria-label="Fechar"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {estoqueCritico.lista.length === 0 ? (
                <div className="mt-4 flex items-center gap-3 text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-4">
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium">Estoque sob controle! Nenhum produto em nível crítico.</p>
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {estoqueCritico.lista.map(p => {
                    const estoque = p.estoque ?? 0;
                    return (
                      <div key={p.id} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                          <p className="text-[11px] text-slate-400">{p.category}</p>
                        </div>
                        <span className={`shrink-0 text-xs font-semibold tabular-nums ${
                          estoque === 0 ? 'text-red-600' : 'text-red-500'
                        }`}>
                          {estoque === 0 ? 'Esgotado' : `Apenas ${estoque} un`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex pt-4">
                <Botao
                  type="button"
                  variant="secondary"
                  onClick={() => setShowAlertaEstoque(false)}
                  className="w-full"
                >
                  Fechar
                </Botao>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
