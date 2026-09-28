import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("VeloTime Application Error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-950 border border-slate-800 p-8 shadow-2xl flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-rose-950/60 border border-rose-800 flex items-center justify-center mb-6">
              <svg
                className="w-6 h-6 text-rose-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h1 className="text-xl font-bold text-slate-100 mb-2 tracking-tight">
              Workspace Temporarily Unavailable
            </h1>

            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              VeloTime encountered an unexpected issue while loading your session. Your logged time and data remain safely stored.
            </p>

            {this.state.error?.message && (
              <div className="w-full bg-slate-900 border border-slate-800/80 p-3 mb-6 text-left">
                <p className="text-[11px] font-mono text-rose-400 break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex gap-3 w-full">
              <button
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-4 bg-white hover:bg-slate-200 text-slate-950 text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Reload Workspace
              </button>
              <a
                href="https://velotime.dg.tools"
                className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider text-center transition-colors flex items-center justify-center"
              >
                Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
