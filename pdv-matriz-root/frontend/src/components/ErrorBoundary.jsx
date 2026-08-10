import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { erro: null };
  }

  static getDerivedStateFromError(error) {
    return { erro: error };
  }

  componentDidCatch(error, info) {
    this.setState({ erro: error });
  }

  render() {
    if (this.state.erro) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 p-6">
          <div className="max-w-md text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-xl font-bold text-red-800 mb-2">Ops! Algo deu errado.</h1>
            <p className="text-sm text-red-600 mb-4">
              Ocorreu um erro inesperado. Tente recarregar a página.
            </p>
            <details className="text-left text-xs text-red-500 bg-red-100 rounded-lg p-3 max-h-32 overflow-auto">
              <summary className="cursor-pointer font-medium">Detalhes técnicos</summary>
              {this.state.erro.message}
            </details>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors select-none"
            >
              Recarregar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
