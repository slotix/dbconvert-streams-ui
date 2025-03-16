// Debug script to test URL construction
console.log('=== URL CONSTRUCTION DEBUG ===');

// Mock the environment functions
const getApiUrl = () => '/api';
const host = '104.236.77.30';
const isHttps = false;

// Test URL construction
const sseUrl = `${isHttps ? 'https' : 'http'}://${host}${getApiUrl()}/logs/stream`;
console.log('API URL:', getApiUrl());
console.log('Constructed URL:', sseUrl);

// Check if there's any automatic transformation
const eventSource = new EventSource(sseUrl);
console.log('EventSource URL:', eventSource.url);

// Close the EventSource to prevent actual connection
eventSource.close();

// Check if URL.resolve might be causing issues
const resolvedUrl = new URL('/logs/stream', `http://${host}${getApiUrl()}`);
console.log('Resolved URL:', resolvedUrl.href);

console.log('=== END DEBUG ==='); 