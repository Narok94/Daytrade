
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import Auth from './Auth';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8 text-center">
          <div className="max-w-md w-full bg-slate-900 border border-rose-500/30 p-8 rounded-3xl shadow-2xl">
            <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-rose-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-4">Erro de Inicialização</h1>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
              Ocorreu um erro crítico ao carregar o sistema. Por favor, tente recarregar a página ou entre em contato com o suporte técnico.
            </p>
            <div className="bg-black/40 p-4 rounded-xl text-left overflow-auto max-h-40 mb-8">
              <code className="text-rose-400 text-xs font-mono break-all">
                {this.state.error?.message || "Erro desconhecido"}
              </code>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl uppercase text-xs tracking-widest transition-all shadow-lg shadow-indigo-600/20"
            >
              Recarregar Sistema
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <Auth />
    </ErrorBoundary>
  </React.StrictMode>
);