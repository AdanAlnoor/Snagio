'use client'

import type React from 'react'
import { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(_error: Error, _errorInfo: React.ErrorInfo) {}

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center p-4 border border-red-200 rounded-lg bg-red-50">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Module Loading Error</h2>
          <p className="text-sm text-red-600 mb-4">
            {this.state.error?.message || 'An error occurred while loading this component'}
          </p>
          <Button
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.reload()
            }}
            size="sm"
            variant="outline"
          >
            Reload Page
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}

interface SafeComponentWrapperProps {
  children: ReactNode
  fallback?: ReactNode
}

export function SafeComponentWrapper({ children, fallback }: SafeComponentWrapperProps) {
  return <ErrorBoundary fallback={fallback}>{children}</ErrorBoundary>
}
