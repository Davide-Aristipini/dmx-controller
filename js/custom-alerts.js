// Custom Alert System
class CustomAlert {
    static show(options) {
        const {
            title = 'Conferma',
            message = '',
            type = 'confirm',
            confirmText = 'Conferma',
            cancelText = 'Annulla',
            onConfirm = () => {},
            onCancel = () => {}
        } = options;

        // Remove existing alerts
        const existing = document.getElementById('custom-alert');
        if (existing) existing.remove();

        // Create alert HTML
        const alertHTML = `
            <div id="custom-alert" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
                <div class="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-600 shadow-2xl transform transition-all">
                    <h3 class="text-xl font-bold mb-4 ${this.getTitleColor(type)}">${title}</h3>
                    <p class="text-gray-300 mb-6">${message}</p>
                    <div class="flex justify-end space-x-3">
                        ${type === 'confirm' ? `
                            <button id="alert-cancel" class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-all">
                                ${cancelText}
                            </button>
                        ` : ''}
                        <button id="alert-confirm" class="px-4 py-2 ${this.getButtonColor(type)} text-white rounded-lg transition-all">
                            ${confirmText}
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add to DOM
        document.body.insertAdjacentHTML('beforeend', alertHTML);

        // Add event listeners
        document.getElementById('alert-confirm')?.addEventListener('click', () => {
            this.close();
            onConfirm();
        });

        document.getElementById('alert-cancel')?.addEventListener('click', () => {
            this.close();
            onCancel();
        });

        // Close on escape
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.close();
                onCancel();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }

    static close() {
        const alert = document.getElementById('custom-alert');
        if (alert) {
            alert.style.opacity = '0';
            setTimeout(() => alert.remove(), 200);
        }
    }

    static getTitleColor(type) {
        switch(type) {
            case 'error': return 'text-red-400';
            case 'warning': return 'text-yellow-400';
            case 'success': return 'text-green-400';
            case 'info': return 'text-blue-400';
            default: return 'text-purple-400';
        }
    }

    static getButtonColor(type) {
        switch(type) {
            case 'error': return 'bg-red-600 hover:bg-red-700';
            case 'warning': return 'bg-yellow-600 hover:bg-yellow-700';
            case 'success': return 'bg-green-600 hover:bg-green-700';
            case 'info': return 'bg-blue-600 hover:bg-blue-700';
            default: return 'bg-purple-600 hover:bg-purple-700';
        }
    }

    // Shorthand methods
    static confirm(message, onConfirm = () => {}, onCancel = () => {}) {
        this.show({
            title: 'Conferma',
            message,
            type: 'confirm',
            onConfirm,
            onCancel
        });
    }

    static alert(message, onConfirm = () => {}) {
        this.show({
            title: 'Attenzione',
            message,
            type: 'info',
            confirmText: 'OK',
            onConfirm
        });
    }

    static error(message, onConfirm = () => {}) {
        this.show({
            title: 'Errore',
            message,
            type: 'error',
            confirmText: 'OK',
            onConfirm
        });
    }

    static success(message, onConfirm = () => {}) {
        this.show({
            title: 'Successo',
            message,
            type: 'success',
            confirmText: 'OK',
            onConfirm
        });
    }

    static prompt(title, placeholder = '', onConfirm = () => {}, onCancel = () => {}) {
        // Remove existing
        const existing = document.getElementById('custom-alert');
        if (existing) existing.remove();

        const promptHTML = `
            <div id="custom-alert" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
                <div class="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-600 shadow-2xl">
                    <h3 class="text-xl font-bold mb-4 text-purple-400">${title}</h3>
                    <input type="text" id="prompt-input" 
                           class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white mb-6"
                           placeholder="${placeholder}"
                           autofocus>
                    <div class="flex justify-end space-x-3">
                        <button id="alert-cancel" class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-all">
                            Annulla
                        </button>
                        <button id="alert-confirm" class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all">
                            Conferma
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', promptHTML);

        const input = document.getElementById('prompt-input');
        input?.focus();

        document.getElementById('alert-confirm')?.addEventListener('click', () => {
            const value = input?.value || '';
            this.close();
            onConfirm(value);
        });

        document.getElementById('alert-cancel')?.addEventListener('click', () => {
            this.close();
            onCancel();
        });

        // Submit on enter
        input?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const value = input.value || '';
                this.close();
                onConfirm(value);
            }
        });
    }
}

// Make globally available
window.CustomAlert = CustomAlert;