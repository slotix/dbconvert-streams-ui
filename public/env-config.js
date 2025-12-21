// Runtime environment configuration
// In desktop mode, this file is overridden by the desktop app.
// In web mode, this provides defaults or detects the environment.

;(function () {
  // Check if we're running in Wails (desktop mode)
  var isWails =
    typeof window.runtime !== 'undefined' ||
    typeof window.go !== 'undefined' ||
    navigator.userAgent.includes('wails')

  // Check if we're on localhost
  var isLocalhost =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

  if (
    isWails ||
    (window.location.port && window.location.port !== '80' && window.location.port !== '443')
  ) {
    // Desktop mode or dev mode - use explicit localhost API
    window.ENV = {
      VITE_BACKEND_URL: 'http://127.0.0.1:8020/api/v1',
      VITE_DESKTOP_MODE: isWails ? 'true' : 'false'
    }
  }
  // Otherwise, let the app use its default detection logic
})()
