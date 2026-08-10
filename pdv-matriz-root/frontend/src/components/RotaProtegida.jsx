import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

function rotaPadraoPorRole(role) {
  const mapa = {
    GARCOM: '/garcom',
    CAIXA: '/caixa',
    ADMIN: '/gestor'
  };
  return mapa[role] || '/login';
}

export default function RotaProtegida({ children, rolesPermitidas }) {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-slate-600">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (rolesPermitidas && !rolesPermitidas.includes(user.role)) {
    return <Navigate to={rotaPadraoPorRole(user.role)} replace />;
  }

  return children;
}
