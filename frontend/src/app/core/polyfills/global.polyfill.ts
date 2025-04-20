// This polyfill provides the 'global' object for Node.js libraries running in browser environments

// Check if window is defined (browser environment)
if (typeof window !== 'undefined') {
  // Define global as window for browser environments
  (window as any).global = window;
}