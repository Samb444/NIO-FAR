import { Component, type ReactNode } from 'react';

/** Bascule vers un rendu de secours si un enfant plante (ex. contexte WebGL refusé). */
export class ErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn('[NIO FAR] Rendu de secours activé :', error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
