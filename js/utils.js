// Utility functions and DMX Monitor
class DMXMonitor {
    static paused = false;
    static initialized = false;

    static initialize() {
        // Initialize monitor if needed
        if (this.initialized) return;
        
        this.initialized = true;
        this.add('[MONITOR] DMX Monitor inizializzato', 'system');
        
        // Setup initial UI state if monitor exists
        const content = document.getElementById('monitor-content');
        if (content && content.children.length === 0) {
            this.add('[SISTEMA] DMX Controller inizializzato', 'success');
        }
    }

    static add(message, type = 'system') {
        if (this.paused) return;

        const content = document.getElementById('monitor-content');
        if (!content) return;

        const timestamp = new Date().toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3
        });

        const colors = {
            system: '#10B981',
            success: '#059669',
            error: '#EF4444',
            warning: '#F59E0B',
            send: '#3B82F6',
            receive: '#06B6D4'
        };

        const line = document.createElement('div');
        line.style.color = colors[type] || colors.system;
        line.textContent = `[${timestamp}] ${message}`;

        content.appendChild(line);
        content.scrollTop = content.scrollHeight;

        // Keep only last 100 messages
        while (content.children.length > 100) {
            content.removeChild(content.firstChild);
        }
    }

    static toggle() {
        const toggle = document.getElementById('monitor-toggle');
        const content = document.getElementById('monitor-content');

        if (content.style.display === 'none') {
            content.style.display = 'block';
            toggle.textContent = '▼';
        } else {
            content.style.display = 'none';
            toggle.textContent = '▶';
        }
    }

    static clear() {
        const content = document.getElementById('monitor-content');
        if (content) {
            content.innerHTML = '';
            this.add('[MONITOR] Pulito', 'system');
        }
    }

    static togglePause() {
        this.paused = !this.paused;
        const btn = document.getElementById('pause-btn');
        if (btn) {
            btn.textContent = this.paused ? 'Resume' : 'Pause';
        }
        this.add(`[MONITOR] ${this.paused ? 'In pausa' : 'Attivo'}`, 'system');
    }
}

// Global utility functions that can be called from HTML
window.DMXMonitor = DMXMonitor;