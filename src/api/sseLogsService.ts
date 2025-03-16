import { useLogsStore } from '@/stores/logs'
import { getApiUrl, getBackendUrl } from '@/utils/environment'

export type MessageHandler = (message: any) => void

export class SSELogsService {
    private eventSource: EventSource | null = null
    private handlers: MessageHandler[] = []
    private isConnecting: boolean = false
    private shouldReconnect: boolean = true
    private reconnectAttempts: number = 0
    private maxReconnectAttempts: number = 5
    private reconnectDelay: number = 3000 // 3 seconds
    private logHeartbeats: boolean = false // Set to false to disable heartbeat logging
    private refreshTimeout: number | null = null
    private debugMode: boolean = true // Enable debug mode by default to help diagnose issues

    constructor() {
        this.connect = this.connect.bind(this)
        this.disconnect = this.disconnect.bind(this)
        // Only log in debug mode
        if (this.debugMode) console.log('SSE Logs Service initialized')
    }

    addMessageHandler(handler: MessageHandler) {
        this.handlers.push(handler)
    }

    private processMessage(message: any) {
        this.handlers.forEach((handler) => handler(message))
    }

    private forceRefreshLogsPanel() {
        const logsStore = useLogsStore()

        // Clear any existing timeout
        if (this.refreshTimeout !== null) {
            window.clearTimeout(this.refreshTimeout)
        }

        // Set a new timeout to force refresh the logs panel
        this.refreshTimeout = window.setTimeout(() => {
            if (this.debugMode) console.log('Force refreshing logs panel')

            // Force open the logs panel if it's not already open
            if (!logsStore.isLogsPanelOpen && logsStore.logs.length > 0) {
                if (this.debugMode) console.log('Opening logs panel to show logs')
                logsStore.toggleLogsPanel()
            }

            this.refreshTimeout = null
        }, 500)
    }

    async disconnect() {
        this.shouldReconnect = false
        if (this.eventSource) {
            this.eventSource.close()
            this.eventSource = null
            if (this.debugMode) console.log('Disconnected from SSE logs')
        }
    }

    async connect() {
        const logsStore = useLogsStore()

        if (this.isConnecting) {
            if (this.debugMode) console.log('Already connecting to SSE logs')
            return
        }

        this.isConnecting = true

        if (this.eventSource) {
            this.eventSource.close()
            this.eventSource = null
        }

        try {
            // Get the backend URL
            let sseUrl = getBackendUrl();
            console.log('[SSE] Original backend URL:', sseUrl);

            // Simple approach: use the host from the backend URL but with a fixed path
            try {
                const url = new URL(sseUrl.startsWith('http') ? sseUrl : `http://${sseUrl}`);
                sseUrl = `${url.protocol}//${url.host}/api/v1/logs/stream`;
            } catch (error) {
                console.error('[SSE] Error parsing URL:', error);
                // Fallback to a direct path
                sseUrl = '/api/v1/logs/stream';
            }

            console.log('[SSE] Final SSE URL:', sseUrl);
            this.eventSource = new EventSource(sseUrl)

            this.eventSource.onopen = () => {
                if (this.debugMode) console.log('SSE logs connection opened')
                this.isConnecting = false
                this.reconnectAttempts = 0

                // Add a log entry to confirm connection
                logsStore.addLog({
                    message: 'SSE logs connection opened',
                    level: 'info',
                    timestamp: Date.now(),
                    source: 'sse-client',
                    details: { type: 'connection' }
                });

                // Only log in debug mode
                if (this.debugMode) {
                    console.log('Current logs store state:', {
                        logCount: logsStore.logs.length,
                        isLogsPanelOpen: logsStore.isLogsPanelOpen
                    });
                }

                // Force refresh the logs panel
                this.forceRefreshLogsPanel();
            }

            this.eventSource.addEventListener('connection', (event) => {
                try {
                    // Get the raw data
                    const rawData = event.data;
                    if (this.debugMode) console.log('Raw connection event:', rawData);

                    // Try to extract JSON from potentially malformed data
                    let data;
                    try {
                        // First attempt: try to parse as-is
                        data = JSON.parse(rawData);
                    } catch (parseError) {
                        if (this.debugMode) console.warn('Failed to parse connection JSON:', parseError);
                        // Create a basic object with the raw data as message
                        data = {
                            message: 'Connected to log stream',
                            timestamp: Date.now()
                        };
                    }

                    if (this.debugMode) console.log('SSE connection established:', data);

                    // Add connection message to logs
                    logsStore.addLog({
                        message: data.message || 'Connected to log stream',
                        level: 'info',
                        timestamp: new Date(data.timestamp || Date.now()).getTime(),
                        source: 'sse-client',
                        details: { type: 'connection' }
                    });

                    if (this.debugMode) console.log('Added connection log, store now has', logsStore.logs.length, 'logs');

                    // Force refresh the logs panel
                    this.forceRefreshLogsPanel();
                } catch (error) {
                    console.error('Error parsing connection event:', error, event.data);
                }
            });

            this.eventSource.addEventListener('heartbeat', (event) => {
                try {
                    // Get the raw data
                    const rawData = event.data;

                    // Try to extract JSON from potentially malformed data
                    let data;
                    try {
                        // First attempt: try to parse as-is
                        data = JSON.parse(rawData);
                    } catch (parseError) {
                        if (this.debugMode) console.warn('Failed to parse heartbeat JSON:', parseError);
                        // Create a basic object with the raw data as message
                        data = {
                            type: 'heartbeat',
                            timestamp: Date.now()
                        };
                    }

                    // Only log heartbeats if enabled and in debug mode
                    if (this.logHeartbeats && this.debugMode) {
                        console.log('SSE heartbeat received:', data);

                        // Add heartbeat to logs (disabled by default to reduce noise)
                        logsStore.addLog({
                            message: 'Heartbeat received',
                            level: 'debug',
                            timestamp: new Date(data.timestamp || Date.now()).getTime(),
                            source: 'sse-client',
                            details: { type: 'heartbeat' }
                        });
                    }
                } catch (error) {
                    if (this.debugMode) console.error('Error parsing heartbeat event:', error, event.data);
                }
            });

            this.eventSource.onmessage = (event) => {
                try {
                    // Get the raw data
                    const rawData = event.data;
                    if (this.debugMode) console.log('Raw SSE message:', rawData);

                    // Try to extract JSON from potentially malformed data
                    let data;
                    try {
                        // First attempt: try to parse as-is
                        data = JSON.parse(rawData);
                    } catch (parseError) {
                        if (this.debugMode) console.warn('Failed to parse JSON directly, trying to extract JSON portion:', parseError);

                        // Second attempt: try to find JSON object in the string
                        const jsonMatch = rawData.match(/\{.*\}/);
                        if (jsonMatch) {
                            try {
                                data = JSON.parse(jsonMatch[0]);
                            } catch (extractError) {
                                if (this.debugMode) console.error('Failed to parse extracted JSON:', extractError);
                                // Create a basic object with the raw data as message
                                data = {
                                    message: rawData,
                                    level: 'info',
                                    timestamp: Date.now(),
                                    source: 'unknown'
                                };
                            }
                        } else {
                            // No JSON found, create a basic object
                            data = {
                                message: rawData,
                                level: 'info',
                                timestamp: Date.now(),
                                source: 'unknown'
                            };
                        }
                    }

                    // Skip processing if this is a heartbeat message (should be handled by the heartbeat event listener)
                    if (data.type === 'heartbeat') {
                        return;
                    }

                    if (this.debugMode) console.log('Processed log message:', data);

                    // Extract message from either message or msg field
                    const message = data.message || data.msg || '';

                    // Extract level, defaulting to info
                    const level = data.level || 'info';

                    // Extract timestamp, using current time as fallback
                    const timestamp = new Date(data.timestamp || data.ts || Date.now()).getTime();

                    // Extract source, using logger, component, caller, or defaulting to unknown
                    let source = data.source || data.logger || data.component || '';

                    // If source is empty but caller exists, use the caller as the source
                    if (!source && data.caller) {
                        // Extract the component from the caller path (e.g., "stream-api/connectionHandlers.go:192" -> "api")
                        if (data.caller.includes('stream-api/')) {
                            source = 'api';
                        } else if (data.caller.includes('/')) {
                            // Extract the first part of the path
                            source = data.caller.split('/')[0];
                        } else {
                            source = 'unknown';
                        }
                    }

                    // If source is still empty, default to unknown
                    if (!source) {
                        source = 'unknown';
                    }

                    // Debug log to understand source mapping - only in debug mode
                    if (this.debugMode) console.debug(`Log source mapping: logger=${data.logger}, source=${source}, nodeId=${data.nodeId || 'none'}`);

                    // Extract nodeId directly from the data
                    const nodeId = data.nodeId || null;

                    // Add to logs store
                    logsStore.addLog({
                        message: message,
                        level: level,
                        timestamp: timestamp,
                        source: source,
                        nodeId: nodeId,
                        details: data
                    });

                    if (this.debugMode) console.log('Added log message, store now has', logsStore.logs.length, 'logs');

                    // Force refresh the logs panel
                    this.forceRefreshLogsPanel();

                    // Convert to monitoring store format
                    const logEntry = {
                        id: Date.now(),
                        type: source.split('.')[0] || 'unknown',
                        nodeID: nodeId || 'unknown',
                        msg: message,
                        level: level,
                        ts: timestamp
                    };

                    this.processMessage(logEntry);
                } catch (error) {
                    // Always log critical errors
                    console.error('Error processing SSE message:', error);

                    // Try to add the raw message to logs anyway
                    try {
                        logsStore.addLog({
                            message: `Raw message: ${event.data}`,
                            level: 'error',
                            timestamp: Date.now(),
                            source: 'sse-client',
                            details: { error: error instanceof Error ? error.message : String(error), raw: event.data }
                        });
                    } catch (e) {
                        console.error('Failed to add error log:', e);
                    }
                }
            }

            this.eventSource.onerror = (error) => {
                // Always log connection errors
                console.error('SSE connection error');

                // Log more details about the error only in debug mode
                if (this.debugMode && error instanceof Event) {
                    console.error('EventSource readyState:', this.eventSource?.readyState);
                    console.error('EventSource URL:', this.eventSource?.url);

                    // Try to fetch the logs endpoint directly to see what's happening
                    fetch(sseUrl)
                        .then(response => {
                            console.log('Fetch test response:', response.status, response.statusText);
                            return response.text();
                        })
                        .then(text => {
                            console.log('Fetch test response text:', text.substring(0, 200) + (text.length > 200 ? '...' : ''));
                        })
                        .catch(fetchError => {
                            console.error('Fetch test error:', fetchError);
                        });
                }

                // Close the connection
                if (this.eventSource) {
                    this.eventSource.close();
                    this.eventSource = null;
                }

                // Add error to logs
                const logsStore = useLogsStore();
                logsStore.addLog({
                    message: `SSE connection error: ${error instanceof Event ? 'Connection failed' : error}`,
                    level: 'error',
                    timestamp: Date.now(),
                    source: 'sse-client',
                    details: { type: 'error' }
                });

                // Attempt to reconnect
                if (this.shouldReconnect) {
                    this.reconnectAttempts++;
                    if (this.reconnectAttempts <= this.maxReconnectAttempts) {
                        if (this.debugMode) console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${this.reconnectDelay}ms...`);
                        setTimeout(() => {
                            this.isConnecting = false;
                            this.connect();
                        }, this.reconnectDelay);
                    } else {
                        // Always log critical errors
                        console.error(`Maximum reconnect attempts (${this.maxReconnectAttempts}) reached.`);
                        const logsStore = useLogsStore();
                        logsStore.addLog({
                            message: `Maximum reconnect attempts (${this.maxReconnectAttempts}) reached. Please refresh the page to try again.`,
                            level: 'error',
                            timestamp: Date.now(),
                            source: 'sse-client',
                            details: { type: 'error' }
                        });
                        this.isConnecting = false;
                    }
                }
            }
        } catch (error) {
            // Always log critical errors
            console.error('Error creating EventSource');
            this.isConnecting = false;
        }
    }

    // Method to enable/disable debug mode
    setDebugMode(enabled: boolean) {
        this.debugMode = enabled;
        if (this.debugMode) {
            console.log('SSE Logs Service debug mode enabled');
        }
    }
}

export const sseLogsService = new SSELogsService() 