import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Critical Rendering Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen flex-col items-center justify-center bg-[#050505] text-white p-6 text-center">
          <h2 className="text-2xl font-bold mb-4">Kechirasiz, nimadir noto'g'ri bajarildi.</h2>
          <p className="text-gray-400 mb-8 max-w-md">
            Ilovada kutilmagan xatolik yuz berdi. Sahifani yangilab ko'ring yoki birozdan so'ng qayta urinib ko'ring.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-white text-black rounded-full font-medium hover:bg-gray-200 transition-colors"
          >
            Sahifani yangilash
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
