import { useMediaQuery as useMediaQueryHook } from '@react-hook/media-query'

// Breakpoints matching Tailwind's default breakpoints
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
}

export function useMediaQuery(query: string) {
  return useMediaQueryHook(query)
}

// Convenience hooks for common breakpoints
export function useIsMobile() {
  return useMediaQueryHook(`(max-width: ${breakpoints.sm})`)
}

export function useIsTablet() {
  return useMediaQueryHook(`(min-width: ${breakpoints.sm}) and (max-width: ${breakpoints.lg})`)
}

export function useIsDesktop() {
  return useMediaQueryHook(`(min-width: ${breakpoints.lg})`)
}

// Hook to get current breakpoint
export function useBreakpoint() {
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  const isDesktop = useIsDesktop()

  if (isMobile) return 'mobile'
  if (isTablet) return 'tablet'
  if (isDesktop) return 'desktop'
  return 'mobile' // fallback
}
