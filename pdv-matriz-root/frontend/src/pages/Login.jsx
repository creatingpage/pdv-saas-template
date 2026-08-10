import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Store, Mail, Lock, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import Botao from '../components/Botao';
import { sanitizarEmail } from '../utils/sanitize';
import { SYSTEM_CONFIG } from '../config/theme';

const IS_DEV = import.meta.env.DEV;

const ROTAS_POR_ROLE = {
  GARCOM: '/garcom',
  CAIXA: '/caixa',
  ADMIN: '/gestor',
};

const CREDENCIAIS_DEMO = [
  { label: 'Gestor Demo', email: 'gestor@demo.com' },
  { label: 'Caixa Demo', email: 'caixa@demo.com' },
  { label: 'Garçom Demo', email: 'garcom@demo.com' },
];

export default function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const emailLimpo = sanitizarEmail(email);
    if (!emailLimpo) {
      setError('Informe um e-mail válido.');
      return;
    }
    if (!password) {
      setError('Informe a senha.');
      return;
    }

    setLoading(true);
    try {
      const role = login(emailLimpo, password);
      navigate(ROTAS_POR_ROLE[role] || '/login');
    } catch (err) {
      setError('E-mail ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  }

  const inputClass = 'w-full min-w-0 pl-11 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-900/40 mb-4 select-none">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{SYSTEM_CONFIG.appName}</h1>
          <p className="text-sm text-slate-400 mt-1">Acesse sua conta para continuar</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 border border-slate-100">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="gestor@demo.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <input
                  id="login-password"
                  type={mostrarSenha ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={inputClass}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(s => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors select-none"
                  aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  tabIndex={-1}
                >
                  {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3.5 py-2.5 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Botao type="submit" loading={loading} className="w-full py-3 text-base">
              <LogIn className="w-4 h-4" />
              Entrar
            </Botao>
          </form>
        </div>

        {IS_DEV && (
          <div className="mt-4 rounded-xl bg-slate-800/80 border border-slate-700 px-4 py-3">
            <p className="text-[11px] text-slate-400 mb-2">Contas de demonstração — senha padrão <code className="text-blue-300">12345678</code></p>
            <ul className="text-xs space-y-1">
              {CREDENCIAIS_DEMO.map(c => (
                <li key={c.email} className="flex items-center justify-between gap-2 text-slate-200">
                  <span className="text-slate-400">{c.label}</span>
                  <code className="text-blue-300">{c.email}</code>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-center text-[11px] text-slate-500 mt-4">
          Acesso restrito. Use suas credenciais de colaborador.
        </p>
      </div>
    </div>
  );
}
