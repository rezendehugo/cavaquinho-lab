import { Component } from 'react';

class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <section className="panel error-boundary" role="alert">
        <h2>Não foi possível abrir esta área.</h2>
        <p>Seus dados salvos não foram alterados. Recarregue a página para tentar novamente.</p>
        <button type="button" onClick={() => window.location.reload()}>Recarregar página</button>
      </section>
    );
  }
}

export default ErrorBoundary;
