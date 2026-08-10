import { createContext, useState, useCallback, useEffect, useRef } from 'react';
import api from '../services/api';
import { PRODUTOS_SEED, gerarComandasSeed, gerarVendasSeed } from '../seedData';

const IS_MOCK = import.meta.env.VITE_MOCK_AUTH === 'true';

const LS_KEY_VENDAS = 'pdv_vendas';
const LS_KEY_PRODUTOS = 'pdv_produtos';
const LS_KEY_COMANDAS = 'pdv_comandas';

function carregarVendasIniciais() {
  try {
    const saved = localStorage.getItem(LS_KEY_VENDAS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) { /* ignore */ }
  const seed = gerarVendasSeed();
  try { localStorage.setItem(LS_KEY_VENDAS, JSON.stringify(seed)); } catch (e) { /* ignore */ }
  return seed;
}

function carregarProdutosIniciais() {
  try {
    const saved = localStorage.getItem(LS_KEY_PRODUTOS);
    if (saved) {
      let parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        let mudou = false;
        const porId = {};
        PRODUTOS_SEED.forEach(seed => { porId[seed.id] = seed.estoque; });
        parsed = parsed.map(p => {
          if (p.estoque === undefined && porId[p.id] !== undefined) {
            mudou = true;
            return { ...p, estoque: porId[p.id] };
          }
          return p;
        });
        if (mudou) {
          try { localStorage.setItem(LS_KEY_PRODUTOS, JSON.stringify(parsed)); } catch (e) { /* ignore */ }
        }
        return parsed;
      }
    }
  } catch (e) { /* ignore */ }
  try { localStorage.setItem(LS_KEY_PRODUTOS, JSON.stringify(PRODUTOS_SEED)); } catch (e) { /* ignore */ }
  return PRODUTOS_SEED;
}

function carregarComandasIniciais() {
  try {
    const saved = localStorage.getItem(LS_KEY_COMANDAS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) { /* ignore */ }
  const seed = gerarComandasSeed();
  try { localStorage.setItem(LS_KEY_COMANDAS, JSON.stringify(seed)); } catch (e) { /* ignore */ }
  return seed;
}

export const ComandaContext = createContext({});

export function ComandaProvider({ children }) {
  const [comandas, setComandasState] = useState(IS_MOCK ? carregarComandasIniciais() : []);
  const [produtos, setProdutosState] = useState(
    IS_MOCK ? carregarProdutosIniciais() : []
  );
  const [comandaSelecionada, setComandaSelecionada] = useState(null);
  const [vendas, setVendasState] = useState(
    IS_MOCK ? carregarVendasIniciais() : []
  );

  const channelRef = useRef(null);

  useEffect(() => {
    const onStorage = (event) => {
      if (!event.newValue) return;
      try {
        if (event.key === LS_KEY_COMANDAS) setComandasState(JSON.parse(event.newValue));
        else if (event.key === LS_KEY_PRODUTOS) setProdutosState(JSON.parse(event.newValue));
        else if (event.key === LS_KEY_VENDAS) setVendasState(JSON.parse(event.newValue));
      } catch (e) { /* ignore */ }
    };
    try {
      channelRef.current = new BroadcastChannel('pdv_channel');
      channelRef.current.onmessage = (event) => {
        const { type, payload } = event.data || {};
        if (type === 'SYNC_COMANDAS') {
          setComandasState(payload);
          try { localStorage.setItem(LS_KEY_COMANDAS, JSON.stringify(payload)); } catch (e) { /* ignore */ }
        }
        if (type === 'VENDA_FINALIZADA') {
          setVendasState(prev => {
            const next = [...prev, payload];
            try { localStorage.setItem(LS_KEY_VENDAS, JSON.stringify(next)); } catch (e) { /* ignore */ }
            return next;
          });
        }
        if (type === 'SYNC_PRODUTOS') {
          setProdutosState(payload);
          try { localStorage.setItem(LS_KEY_PRODUTOS, JSON.stringify(payload)); } catch (e) { /* ignore */ }
        }
      };
      window.addEventListener('storage', onStorage);
    } catch (e) { /* BroadcastChannel não suportado */ }
    return () => {
      try { channelRef.current?.close(); } catch (e) { /* ignore */ }
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const setComandas = useCallback((updater) => {
    setComandasState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem(LS_KEY_COMANDAS, JSON.stringify(next));
        channelRef.current?.postMessage({ type: 'SYNC_COMANDAS', payload: next });
      } catch (e) { /* ignore */ }
      return next;
    });
  }, []);

  const setVendas = useCallback((updater) => {
    setVendasState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try { localStorage.setItem(LS_KEY_VENDAS, JSON.stringify(next)); } catch (e) { /* ignore */ }
      return next;
    });
  }, []);

  const setProdutos = useCallback((updater) => {
    setProdutosState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem(LS_KEY_PRODUTOS, JSON.stringify(next));
        channelRef.current?.postMessage({ type: 'SYNC_PRODUTOS', payload: next });
      } catch (e) { /* ignore */ }
      return next;
    });
  }, []);

  const adicionarVenda = useCallback((venda) => {
    setVendasState(prev => {
      const next = [...prev, venda];
      try {
        localStorage.setItem(LS_KEY_VENDAS, JSON.stringify(next));
        channelRef.current?.postMessage({ type: 'VENDA_FINALIZADA', payload: venda });
      } catch (e) { /* ignore */ }
      return next;
    });
  }, []);

  const adicionarProduto = useCallback((dados) => {
    const novo = { id: `p${Date.now()}`, estoque: 0, ...dados };
    setProdutos(prev => [...prev, novo]);
    return novo;
  }, [setProdutos]);

  const baixarEstoques = useCallback((itens) => {
    setProdutos(prev => {
      const decrementos = {};
      (itens || []).forEach(i => {
        const id = i.productId;
        const qtd = Number(i.quantity ?? i.quantidade ?? 0);
        if (id && qtd > 0) decrementos[id] = (decrementos[id] || 0) + qtd;
      });
      const chaves = Object.keys(decrementos);
      if (chaves.length === 0) return prev;
      const next = prev.map(p =>
        decrementos[p.id]
          ? { ...p, estoque: Math.max(0, (p.estoque ?? 0) - decrementos[p.id]) }
          : p
      );
      try {
        localStorage.setItem(LS_KEY_PRODUTOS, JSON.stringify(next));
        channelRef.current?.postMessage({ type: 'SYNC_PRODUTOS', payload: next });
      } catch (e) { /* ignore */ }
      return next;
    });
  }, []);

  const carregarComandas = useCallback(async () => {
    try {
      const { data } = await api.get('/comandas');
      setComandas(data);
    } catch (e) { /* erro tratado pelo chamador */ }
  }, [setComandas]);

  const carregarProdutos = useCallback(async () => {
    if (IS_MOCK) return;
    try {
      const { data } = await api.get('/produtos');
      setProdutosState(data);
    } catch (e) { /* erro tratado pelo chamador */ }
  }, []);

  async function adicionarItemComanda(orderNumber, productId, quantity) {
    const { data } = await api.post(`/comandas/${orderNumber}/itens`, { productId, quantity });
    await carregarComandas();
    return data;
  }

  async function mudarStatusComanda(orderNumber, status) {
    const { data } = await api.put(`/comandas/${orderNumber}/status`, { status });
    await carregarComandas();
    return data;
  }

  async function fecharComanda(orderNumber, paymentMethod) {
    const { data } = await api.post('/vendas/fechar', { orderNumber, paymentMethod });
    await carregarComandas();
    return data;
  }

  return (
    <ComandaContext.Provider value={{
      comandas,
      produtos,
      comandaSelecionada,
      vendas,
      carregarComandas,
      carregarProdutos,
      adicionarItemComanda,
      mudarStatusComanda,
      fecharComanda,
      setComandaSelecionada,
      setComandas,
      setVendas,
      adicionarVenda,
      setProdutos,
      adicionarProduto,
      baixarEstoques,
    }}>
      {children}
    </ComandaContext.Provider>
  );
}
