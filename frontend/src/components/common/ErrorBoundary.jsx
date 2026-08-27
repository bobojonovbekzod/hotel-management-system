import React from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReload = () => {
    localStorage.removeItem('hotel_token');
    localStorage.removeItem('hotel_user');
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 shadow-xl border border-slate-100 text-center space-y-4">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Xatolik yuz berdi</h2>
            <p className="text-sm text-slate-500">
              Dasturni qayta ishga tushirish uchun pastdagi tugmani bosing.
            </p>
            <button
              onClick={this.handleReload}
              className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 active:scale-95 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary-500/25 transition-all text-sm"
            >
              <RefreshCw size={16} /> Qayta yuklash
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
