// Main application entry point
class DMXApp {
    constructor() {
        this.fixtures = [];
        this.scenes = [];
        this.selectedFixtureId = null;
        this.dmxController = null;
        this.fixtureManager = null;
        this.sceneManager = null;
        this.shortcutManager = null;
        this.stageCanvas = null;
        this.aiGenerator = null;
        this.uiManager = null;
        this.audioReactive = null;
        this.audioPlayer = null;
        this.macroManager = null; 
    }

    async initialize() {
        // Initialize all modules
        this.dmxController = new DMXController();
        this.fixtureManager = new FixtureManager(this);
        this.sceneManager = new SceneManager(this);
        this.shortcutManager = new ShortcutManager(this);
        this.stageCanvas = new StageCanvas(this);
        this.aiGenerator = new AIGenerator(this);
        this.uiManager = new UIManager(this);
        this.audioReactive = new AudioReactive(this);
        this.audioPlayer = new AudioPlayer(this);
        this.macroManager = new MacroManager(this);

        // Setup event listeners
        this.setupEventListeners();
        this.setupTabChangeListener();
        
        // Load saved data
        this.loadFromStorage();
        
        // Initialize UI FIRST
        this.uiManager.initialize();
        
        // Then initialize other modules that need UI
        setTimeout(() => {
            this.audioReactive.initialize();
            this.audioPlayer.initialize();
            this.macroManager.initialize();
            this.stageCanvas.initialize();
            this.aiGenerator.initialize();
        }, 100);

        // Log initialization
        DMXMonitor.add('[SISTEMA] Controller inizializzato', 'success');
    }

    setupEventListeners() {
        // Connection
        document.getElementById('connect-btn')?.addEventListener('click', () => this.toggleConnection());
        
        // Emergency controls
        document.getElementById('emergency-stop')?.addEventListener('click', () => this.emergencyStop());
        document.getElementById('panic-reset')?.addEventListener('click', () => this.panicReset());
        document.getElementById('system-reset')?.addEventListener('click', () => this.systemReset());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.shortcutManager.handleKeyPress(e));
        
        // Handle visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                DMXMonitor.add('[DMX] Tab in background - loop continua', 'system');
            } else {
                DMXMonitor.add('[DMX] Tab attiva', 'system');
            }
        });
    }

    setupTabChangeListener() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-btn')) {
                const tabName = e.target.dataset.tab;
                
                // Salva stato prima di cambiare
                if (this.uiManager.currentTab === 'control') {
                    // Le macro sono già salvate in localStorage
                }
                
                // Dopo il cambio tab, reinizializza se necessario
                setTimeout(() => {
                    if (tabName === 'control') {
                        this.macroManager.initialize();
                    }
                }, 100);
            }
        });
    }

    async toggleConnection() {
        if (this.dmxController.isConnected) {
            await this.dmxController.disconnect();
        } else {
            await this.dmxController.connect();
        }
        this.uiManager.updateConnectionStatus(this.dmxController.isConnected);
    }

    emergencyStop() {
        DMXMonitor.add('[EMERGENCY] STOP ATTIVATO', 'error');
        this.aiGenerator.stopAll();
        
        this.fixtures.forEach(fixture => {
            for (let i = 0; i < fixture.channels; i++) {
                fixture.values[i] = 0;
                this.dmxController.setChannel(fixture.startChannel + i, 0);
            }
            this.fixtureManager.updateFixtureColor(fixture);
        });
        
        this.uiManager.renderControlPanel();
    }

    panicReset() {
        DMXMonitor.add('[PANIC] RESET SISTEMA', 'warning');
        this.aiGenerator.stopAll();
        
        for (let i = 1; i <= 512; i++) {
            this.dmxController.setChannel(i, 0);
        }
        
        this.fixtures.forEach(fixture => {
            fixture.values.fill(0);
            this.fixtureManager.updateFixtureColor(fixture);
        });
        
        this.uiManager.renderControlPanel();
        DMXMonitor.add('[PANIC] Sistema resettato', 'success');
    }

    async systemReset() {
        DMXMonitor.add('[RESET SISTEMA] Iniziando reset completo...', 'warning');
        
        try {
            // Stop tutti gli effetti
            this.aiGenerator.stopAll();
            
            // Stop audio reactive se attivo
            if (this.audioReactive && this.audioReactive.isActive) {
                this.audioReactive.stop();
            }
            
            // Stop music player se attivo
            if (this.audioPlayer && this.audioPlayer.isPlaying) {
                this.audioPlayer.stop();
            }
            
            // Clear any beat interval
            if (this.beatInterval) {
                clearInterval(this.beatInterval);
                this.beatInterval = null;
            }
            
            // Reset tutti i canali DMX
            for (let i = 0; i < 512; i++) {
                this.dmxController.dmxChannels[i] = 0;
            }
            
            // Reset tutte le fixture
            this.fixtures.forEach(fixture => {
                fixture.values.fill(0);
                this.fixtureManager.updateFixtureColor(fixture);
            });
            
            // Update UI
            this.uiManager.renderControlPanel();
            DMXMonitor.add('[RESET SISTEMA] Completato', 'success');
            
        } catch (error) {
            DMXMonitor.add(`[RESET] Errore: ${error.message}`, 'error');
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem('dmxController', JSON.stringify({
                fixtures: this.fixtures,
                scenes: this.scenes,
                stageFixtures: this.stageCanvas.stageFixtures,
                sceneKeyBindings: this.shortcutManager.keyBindings
            }));
        } catch (e) {
            console.error('Storage error:', e);
        }
    }

    loadFromStorage() {
        try {
            const data = localStorage.getItem('dmxController');
            if (data) {
                const parsed = JSON.parse(data);
                this.fixtures = parsed.fixtures || [];
                this.scenes = parsed.scenes || [];
                this.stageCanvas.stageFixtures = parsed.stageFixtures || [];
                this.shortcutManager.keyBindings = parsed.sceneKeyBindings || {};
                
                this.fixtureManager.updateFixtureList();
                this.sceneManager.renderScenes();
                this.shortcutManager.renderShortcuts();
                
                DMXMonitor.add('[STORAGE] Dati caricati', 'system');
            }
        } catch (e) {
            console.error('Storage load error:', e);
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.dmxApp = new DMXApp();
    dmxApp.initialize();
});