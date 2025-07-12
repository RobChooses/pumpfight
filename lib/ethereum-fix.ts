// Fix for ethereum redefinition error in development
export function fixEthereumProvider() {
  if (typeof window !== 'undefined' && window.ethereum) {
    // Prevent redefinition errors during hot reload
    const descriptor = Object.getOwnPropertyDescriptor(window, 'ethereum')
    if (descriptor && !descriptor.configurable) {
      try {
        Object.defineProperty(window, 'ethereum', {
          ...descriptor,
          configurable: true
        })
      } catch (error) {
        // Silently ignore if we can't make it configurable
        console.debug('Ethereum provider already configured')
      }
    }
  }
}

// Call this before AppKit initialization
if (typeof window !== 'undefined') {
  fixEthereumProvider()
}