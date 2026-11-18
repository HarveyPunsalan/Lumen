/**
 * Temporary on-screen error banner. [DEBUG-frame]
 *
 * Debug instrumentation for the black-screen bug: React throws its UI away
 * on an uncaught error, and what is left is the page background, so the
 * error has to live outside React to survive being shown.
 * Delete this file and its import when the bug is fixed.
 */

import { Component, type ReactNode } from 'react'

const TAG = '[DEBUG-frame]'

function showBanner(text: string): void {
  document.getElementById('debug-banner')?.remove()
  const banner = document.createElement('pre')
  banner.id = 'debug-banner'
  banner.textContent = text
  banner.style.cssText = [
    'position:fixed',
    'top:0',
    'left:0',
    'right:0',
    'z-index:2147483647',
    'background:#7f1d1d',
    'color:#ffffff',
    'padding:10px 14px',
    'margin:0',
    'font:12px ui-monospace, monospace',
    'white-space:pre-wrap',
    'word-break:break-word',
  ].join(';')
  document.body.appendChild(banner)
}

/** Non-React errors: thrown handlers, bad promises, timer callbacks. */
export function installDebugBanner(): void {
  window.addEventListener('error', (event) => {
    showBanner(`${TAG} error: ${event.message}\n${event.filename}:${event.lineno}:${event.colno}`)
  })
  window.addEventListener('unhandledrejection', (event) => {
    showBanner(`${TAG} rejection: ${String(event.reason)}`)
  })
}

/** Catches React render errors before they can unmount the whole tree. */
export class DebugBoundary extends Component<{ children: ReactNode }, { message: string | null }> {
  state: { message: string | null } = { message: null }

  static getDerivedStateFromError(error: Error): { message: string } {
    return { message: `${TAG} render: ${error.message}` }
  }

  render(): ReactNode {
    if (this.state.message !== null) {
      return (
        <div style={{ padding: 16, color: '#f5f5f5', font: '14px ui-monospace, monospace' }}>
          <p>{this.state.message}</p>
          <p>The app threw while rendering. This box is temporary instrumentation.</p>
        </div>
      )
    }
    return this.props.children
  }
}
