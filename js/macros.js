// Macro Manager for recording and replaying DMX sequences
class MacroManager {
    constructor(app) {
        this.app = app;
        this.macros = [];
        this.recording = false;
        this.currentRecording = [];
        this.recordingStartTime = null;
        this.playbackTimeout = null;
        this.loadMacros();
    }

    initialize() {
        this.loadMacros();
        this.renderMacros();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Record button
        const recordBtn = document.getElementById('record-macro');
        if (recordBtn) {
            recordBtn.replaceWith(recordBtn.cloneNode(true));
            document.getElementById('record-macro')?.addEventListener('click', () => {
                this.toggleRecording();
            });
        }

        // Save button
        const saveBtn = document.getElementById('save-macro');
        if (saveBtn) {
            saveBtn.replaceWith(saveBtn.cloneNode(true));
            document.getElementById('save-macro')?.addEventListener('click', () => {
                this.saveMacro();
            });
        }

        // Clear button
        const clearBtn = document.getElementById('clear-macros');
        if (clearBtn) {
            clearBtn.replaceWith(clearBtn.cloneNode(true));
            document.getElementById('clear-macros')?.addEventListener('click', () => {
                CustomAlert.confirm('Eliminare tutte le macro?', () => {
                    this.clearAllMacros();
                });
            });
        }
    }

    toggleRecording() {
        if (this.recording) {
            this.stopRecording();
        } else {
            this.startRecording();
        }
    }

    startRecording() {
        this.recording = true;
        this.currentRecording = [];
        this.recordingStartTime = Date.now();
        
        const btn = document.getElementById('record-macro');
        if (btn) {
            btn.textContent = '⏹️ Stop Recording';
            btn.classList.remove('bg-red-600');
            btn.classList.add('bg-yellow-600');
        }
        
        DMXMonitor.add('[MACRO] Registrazione iniziata', 'warning');
        
        // Start capturing DMX changes
        this.captureInterval = setInterval(() => {
            this.captureState();
        }, 100); // Capture every 100ms
    }

    stopRecording() {
        this.recording = false;
        clearInterval(this.captureInterval);
        
        const btn = document.getElementById('record-macro');
        if (btn) {
            btn.textContent = '⏺️ Record';
            btn.classList.remove('bg-yellow-600');
            btn.classList.add('bg-red-600');
        }
        
        DMXMonitor.add(`[MACRO] Registrazione fermata - ${this.currentRecording.length} stati catturati`, 'success');
        
        const indicator = document.getElementById('recording-indicator');
        if (indicator) {
            indicator.textContent = `Registrati ${this.currentRecording.length} stati`;
        }
    }

    captureState() {
        const state = {
            timestamp: Date.now() - this.recordingStartTime,
            fixtures: this.app.fixtures.map(fixture => ({
                id: fixture.id,
                values: [...fixture.values]
            }))
        };
        
        // Only capture if state has changed
        if (this.currentRecording.length === 0 || this.hasStateChanged(state)) {
            this.currentRecording.push(state);
        }
    }

    hasStateChanged(newState) {
        const lastState = this.currentRecording[this.currentRecording.length - 1];
        
        for (let i = 0; i < newState.fixtures.length; i++) {
            const newFixture = newState.fixtures[i];
            const oldFixture = lastState.fixtures.find(f => f.id === newFixture.id);
            
            if (!oldFixture) return true;
            
            for (let j = 0; j < newFixture.values.length; j++) {
                if (newFixture.values[j] !== oldFixture.values[j]) {
                    return true;
                }
            }
        }
        
        return false;
    }

    saveMacro() {
        if (this.currentRecording.length === 0) {
            CustomAlert.error('Nessuna registrazione da salvare');
            return;
        }
        
        CustomAlert.prompt('Nome della macro:', 'Es: Strobo Party', (name) => {
            if (!name) return;
            
            const icons = ['🎯', '🎭', '🎪', '🎨', '🎬', '🎸', '🎹', '🎤', '🎧', '💫', '⭐', '🔥', '💎', '🌟'];
            const randomIcon = icons[Math.floor(Math.random() * icons.length)];
            
            const macro = {
                id: Date.now(),
                name: name,
                icon: randomIcon,
                recording: this.currentRecording,
                duration: this.currentRecording[this.currentRecording.length - 1].timestamp
            };
            
            this.macros.push(macro);
            this.saveMacros();
            this.renderMacros();
            
            this.currentRecording = [];
            document.getElementById('recording-indicator').textContent = '';
            
            DMXMonitor.add(`[MACRO] Salvata: ${name}`, 'success');
        });
    }

    executeMacro(macro) {
        if (this.playbackTimeout) {
            clearTimeout(this.playbackTimeout);
        }
        
        DMXMonitor.add(`[MACRO] Eseguendo: ${macro.name}`, 'system');
        
        let index = 0;
        
        const playNextState = () => {
            if (index >= macro.recording.length) {
                DMXMonitor.add(`[MACRO] Completata: ${macro.name}`, 'success');
                return;
            }
            
            const state = macro.recording[index];
            
            // Apply state to fixtures
            state.fixtures.forEach(fixtureState => {
                const fixture = this.app.fixtures.find(f => f.id === fixtureState.id);
                if (fixture) {
                    fixtureState.values.forEach((value, channelIndex) => {
                        fixture.values[channelIndex] = value;
                        this.app.dmxController.setChannel(fixture.startChannel + channelIndex, value);
                    });
                    this.app.fixtureManager.updateFixtureColor(fixture);
                }
            });
            
            this.app.uiManager.renderControlPanel();
            
            // Schedule next state
            index++;
            if (index < macro.recording.length) {
                const delay = macro.recording[index].timestamp - state.timestamp;
                this.playbackTimeout = setTimeout(playNextState, delay);
            } else {
                DMXMonitor.add(`[MACRO] Completata: ${macro.name}`, 'success');
            }
        };
        
        playNextState();
    }

    renderMacros() {
        const container = document.getElementById('macro-buttons');
        const counter = document.getElementById('macro-count');
        
        if (!container) return;
        
        // Update counter
        if (counter) {
            counter.textContent = this.macros.length > 0 ? `(${this.macros.length} salvate)` : '';
        }
        
        container.innerHTML = '';
        
        this.macros.forEach((macro, index) => {
            const button = document.createElement('button');
            button.className = 'macro-btn bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 relative group';
            button.innerHTML = `
                <span class="mr-2">${macro.icon || '🎯'}</span>
                ${macro.name}
                <span class="text-xs opacity-70 ml-2">(${(macro.duration / 1000).toFixed(1)}s)</span>
                <span class="absolute top-0 right-0 -mt-1 -mr-1 hidden group-hover:block">
                    <button onclick="event.stopPropagation(); dmxApp.macroManager.deleteMacro(${index})" 
                            class="bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 text-xs">
                        ×
                    </button>
                </span>
            `;
            button.onclick = () => this.executeMacro(macro);
            container.appendChild(button);
        });
    }

    deleteMacro(index) {
        CustomAlert.confirm(`Eliminare la macro "${this.macros[index].name}"?`, () => {
            this.macros.splice(index, 1);
            this.saveMacros();
            this.renderMacros();
            DMXMonitor.add('[MACRO] Macro eliminata', 'success');
        });
    }

    clearAllMacros() {
        this.macros = [];
        this.saveMacros();
        this.renderMacros();
        DMXMonitor.add('[MACRO] Tutte le macro eliminate', 'success');
    }

    saveMacros() {
        try {
            localStorage.setItem('dmxMacros', JSON.stringify(this.macros));
            DMXMonitor.add('[MACRO] Macro salvate', 'success');
        } catch (e) {
            console.error('Errore salvataggio macro:', e);
            DMXMonitor.add('[MACRO] Errore salvataggio', 'error');
        }
    }

    loadMacros() {
        try {
            const saved = localStorage.getItem('dmxMacros');
            if (saved) {
                this.macros = JSON.parse(saved);
                DMXMonitor.add(`[MACRO] Caricate ${this.macros.length} macro`, 'system');
            }
        } catch (e) {
            console.error('Errore caricamento macro:', e);
            this.macros = [];
        }
    }
}