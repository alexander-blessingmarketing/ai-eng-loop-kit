import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'

/**
 * Wrap components with global providers here (ThemeProvider, etc.)
 * as the project grows.
 */
function AllProviders({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

const customRender = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: AllProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }
