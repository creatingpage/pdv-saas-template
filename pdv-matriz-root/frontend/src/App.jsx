import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Garcom from './pages/Garcom';
import Caixa from './pages/Caixa';
import Gestor from './pages/Gestor';
import RotaProtegida from './components/RotaProtegida';
import ErrorBoundary from './components/ErrorBoundary';
import { ComandaProvider } from './context/ComandaContext';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ComandaProvider>
            <Routes>
              <Route path="/" element={<Navigate to="/login" />} />
              <Route path="/login" element={<Login />} />

              <Route path="/garcom" element={
                <RotaProtegida rolesPermitidas={['GARCOM', 'ADMIN']}>
                  <Garcom />
                </RotaProtegida>
              } />

              <Route path="/caixa" element={
                <RotaProtegida rolesPermitidas={['CAIXA', 'ADMIN']}>
                  <Caixa />
                </RotaProtegida>
              } />

              <Route path="/gestor" element={
                <RotaProtegida rolesPermitidas={['ADMIN']}>
                  <Gestor />
                </RotaProtegida>
              } />
            </Routes>
          </ComandaProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
