import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { failed: boolean }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application render failed', error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="app-error-fallback" role="alert">
        <h1>Facility Network could not finish loading</h1>
        <p>The current view encountered an unexpected error.</p>
        <button type="button" onClick={() => window.location.reload()}>Reload application</button>
      </main>
    )
  }
}
