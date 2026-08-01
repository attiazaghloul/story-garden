import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { failed: boolean }

/**
 * A render crash must never leave a child staring at a blank screen. This shows
 * a friendly card with a way back instead.
 *
 * On Android this also matters for update safety: a bundle that throws here
 * still reaches the DOM, but the app stays usable while the failed state is
 * visible to a grown-up.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Story Garden crashed', error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="app-shell">
        <main className="app-main">
          <div className="crash-card">
            <p className="crash-emoji" aria-hidden>
              🌱
            </p>
            <h1>Let's try that again</h1>
            <p>Something went wrong while opening the garden.</p>
            <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </main>
      </div>
    )
  }
}
