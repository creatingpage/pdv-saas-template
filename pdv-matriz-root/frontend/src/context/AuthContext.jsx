import { createContext, useState, useEffect, useCallback, useRef } from 'react';

export const AuthContext = createContext({});

const LS_KEY_USUARIOS = 'pdv_usuarios';
const LS_KEY_TOKEN = '@PDV:token';
const LS_KEY_USER = '@PDV:user';

const SENHA_PADRAO = '12345678';

const USUARIOS_DEMO = [
  { id: 'u-gestor', name: 'Gestor Demo', email: 'gestor@demo.com', password: SENHA_PADRAO, role: 'ADMIN', active: true },
  { id: 'u-caixa', name: 'Caixa Demo', email: 'caixa@demo.com', password: SENHA_PADRAO, role: 'CAIXA', active: true },
  { id: 'u-garcom', name: 'Garçom Demo', email: 'garcom@demo.com', password: SENHA_PADRAO, role: 'GARCOM', active: true },
];

function carregarUsuariosIniciais() {
  try {
    const saved = localStorage.getItem(LS_KEY_USUARIOS);
    if (saved) {
      let parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Force reset: se não contém gestor@demo.com, substituir pelos dados demo
        const temGestor = parsed.some(
          u => u.email && u.email.trim().toLowerCase() === 'gestor@demo.com'
        );
        if (!temGestor) {
          localStorage.setItem(LS_KEY_USUARIOS, JSON.stringify(USUARIOS_DEMO));
          return USUARIOS_DEMO;
        }

        const limpos = parsed.filter(u =>
          u.email !== 'pdv@gestor.com' && u.id !== 'root'
        );
        if (limpos.length !== parsed.length) {
          parsed = limpos;
          localStorage.setItem(LS_KEY_USUARIOS, JSON.stringify(limpos));
        }
        if (parsed.length > 0) return parsed;
      }
    }
  } catch (e) { /* ignore */ }
  localStorage.setItem(LS_KEY_USUARIOS, JSON.stringify(USUARIOS_DEMO));
  return USUARIOS_DEMO;
}

function carregarSessaoLocal() {
  try {
    const token = localStorage.getItem(LS_KEY_TOKEN);
    if (!token) {
      localStorage.removeItem(LS_KEY_USER);
      return null;
    }
    const userStorage = localStorage.getItem(LS_KEY_USER);
    if (!userStorage) return null;
    const parsed = JSON.parse(userStorage);
    if (parsed && parsed.id && parsed.email && parsed.role) return parsed;
  } catch (e) { /* ignore */ }
  localStorage.removeItem(LS_KEY_TOKEN);
  localStorage.removeItem(LS_KEY_USER);
  return null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(carregarSessaoLocal);
  const [loading, setLoading] = useState(false);
  const [usuarios, setUsuariosState] = useState(carregarUsuariosIniciais);

  const channelRef = useRef(null);

  useEffect(() => {
    try {
      channelRef.current = new BroadcastChannel('pdv_channel');
      channelRef.current.onmessage = (event) => {
        if (event.data?.type === 'SYNC_USUARIOS') {
          const payload = event.data.payload;
          setUsuariosState(payload);
          try { localStorage.setItem(LS_KEY_USUARIOS, JSON.stringify(payload)); } catch (e) { /* ignore */ }
        }
      };
    } catch (e) { /* BroadcastChannel não suportado */ }

    const onStorage = (event) => {
      if (event.key === LS_KEY_USUARIOS && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          if (Array.isArray(parsed)) setUsuariosState(parsed);
        } catch (e) { /* ignore */ }
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      try { channelRef.current?.close(); } catch (e) { /* ignore */ }
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const setUsuarios = useCallback((updater) => {
    setUsuariosState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem(LS_KEY_USUARIOS, JSON.stringify(next));
        channelRef.current?.postMessage({ type: 'SYNC_USUARIOS', payload: next });
      } catch (e) { /* ignore */ }
      return next;
    });
  }, []);

  const adicionarUsuario = useCallback((dados) => {
    const novo = { id: `u${Date.now()}`, active: true, ...dados };
    setUsuarios(prev => [...prev, novo]);
    return novo;
  }, [setUsuarios]);

  function login(inputEmail, inputSenha) {
    const found = usuarios.find(u =>
      u.email && u.active &&
      u.email.trim().toLowerCase() === String(inputEmail).trim().toLowerCase() &&
      String(u.password).trim() === String(inputSenha).trim()
    );
    if (!found) {
      const err = new Error('E-mail ou senha incorretos.');
      err.code = 'INVALID_CREDENTIALS';
      throw err;
    }
    const sessao = { id: found.id, name: found.name, email: found.email, role: found.role };
    const tokenSimulado = `local-${found.id}-${Date.now()}`;
    localStorage.setItem(LS_KEY_TOKEN, tokenSimulado);
    localStorage.setItem(LS_KEY_USER, JSON.stringify(sessao));
    setUser(sessao);
    return found.role;
  }

  function logout() {
    localStorage.removeItem(LS_KEY_TOKEN);
    localStorage.removeItem(LS_KEY_USER);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{
      user, login, logout, loading,
      usuarios, setUsuarios, adicionarUsuario,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
