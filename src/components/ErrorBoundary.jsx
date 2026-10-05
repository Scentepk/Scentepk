import React, { Component } from "react";
import { RotateCcw } from "lucide-react";

/**
 * ErrorBoundary — Catches render or chunk-loading failures gracefully
 * and provides a luxury-styled reload action.
 */
export default class ErrorBoundary extends Component {
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
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full min-h-[70vh] bg-[#0D0D0C] text-[#F2EEE7] flex flex-col items-center justify-center text-center px-6 py-20">
          <span className="text-[10px] uppercase font-sans tracking-[0.24em] text-[#BFA27A] mb-3 font-medium">
            CONNECTION ERROR
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl text-[#F2EEE7] mb-3">
            Unable to Load Composition
          </h2>
          <p className="text-xs font-sans text-[#AAA49B] max-w-md mb-8 font-light leading-relaxed">
            A network interruption occurred while retrieving this section. Please refresh to restore connection.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-transparent border border-[rgba(242,238,231,0.2)] rounded-xl text-xs uppercase font-sans tracking-[0.18em] text-[#F2EEE7] hover:border-[#BFA27A] hover:text-[#BFA27A] transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reload Page</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
