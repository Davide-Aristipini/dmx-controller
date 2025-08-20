// Keyboard shortcuts management
class ShortcutManager {
    constructor(app) {
        this.app = app;
        this.keyBindings = {}; // { 'q': sceneId, 'w': sceneId2 }
        this.isRecordingKey = false;
        this.recordingSceneId = null;
        this.macros = this.initializeMacros();
    }

    initializeMacros() {
        return [
            { id: 1, name: 'Rosso', color: '#EF4444', action: () => this.setColorForAll(255, 0, 0) },
            { id: 2, name: 'Verde', color: '#10B981', action: () => this.setColorForAll(0, 255, 0) },
            { id: 3, name: 'Blu', color: '#3B82F6', action: () => this.setColorForAll(0, 0, 255) },
            { id: 4, name: 'Bianco', color: '#F3F4F6', action: () => this.setColorForAll(255, 255, 255) },
            { id: 5, name: 'Giallo', color: '#F59E0B', action: () => this.setColorForAll(255, 255, 0) },
            { id: 6, name: 'Magenta', color: '#EC4899', action: () => this.setColorForAll(255, 0, 255) },
            { id: 7, name: 'Ciano', color: '#06B6D4', action: () => this.setColorForAll(0, 255, 255) },
            { id: 8, name: 'Strobo', color: '#8B5CF6', action: () => this.strobeAll() },
            { id: 9, name: 'Blackout', color: '#1F2937', action: () => this.blackoutAll() }
        ];
    }

    handleKeyPress(e) {
        // Ignore if recording a key
        if (this.isRecordingKey) return;
        
        // Ignore if typing in input
        if (e.target.tagName === 'INPUT') return;
        
        // Check custom scene bindings first
        const key = e.key.toLowerCase();
        if (this.keyBindings[key] && !e.ctrlKey && !e.shiftKey && !e.altKey) {
            e.preventDefault();
            const sceneId = this.keyBindings[key];
            const scene = this.app.scenes.find(s => s.id === sceneId);
            if (scene) {
                this.app.sceneManager.loadScene(sceneId);
                DMXMonitor.add(`[SHORTCUT] "${key.toUpperCase()}" → ${scene.name}`, 'success');
            }
            return;
        }
        
        // Number keys for macros (1-9)
        if (e.key >= '1' && e.key <= '9' && !e.shiftKey) {
            e.preventDefault();
            this.executeMacro(parseInt(e.key));
            return;
        }
        
        // Reserved keys
        switch (e.key) {
            case ' ':
                e.preventDefault();
                this.app.tapTempo();
                break;
            case 'b':
            case 'B':
                e.preventDefault();
                this.globalMacro('all', 'blackout');
                break;
            case 'f':
            case 'F':
                e.preventDefault();
                this.globalMacro('all', 'full');
                break;
            case 's':
            case 'S':
                if (e.ctrlKey) {
                    e.preventDefault();
                    this.app.sceneManager.saveCurrentScene();
                } else {
                    e.preventDefault();
                    this.app.syncToBeat();
                }
                break;
            case 'Escape':
                e.preventDefault();
                this.app.emergencyStop();
                break;
        }
        
        // Function keys
        if (e.code === 'F1') { 
            e.preventDefault(); 
            this.app.emergencyStop(); 
        }
        if (e.code === 'F2') { 
            e.preventDefault(); 
            this.app.panicReset(); 
        }
        if (e.code === 'F3') { 
            e.preventDefault(); 
            this.app.systemReset(); 
        }
    }

    startKeyRecording(sceneId) {
        const scene = this.app.scenes.find(s => s.id === sceneId);
        if (!scene) return;
        
        this.isRecordingKey = true;
        this.recordingSceneId = sceneId;
        
        // Show recording modal
        const modal = document.createElement('div');
        modal.id = 'key-recording-modal';
        modal.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-gray-800 rounded-lg p-8 border-2 border-purple-500 animate-pulse">
                <h3 class="text-2xl font-bold text-purple-400 mb-4">Premi un tasto</h3>
                <p class="text-gray-300 mb-4">Assegna un tasto per la scena:<br>
                <strong class="text-blue-400">"${scene.name}"</strong></p>
                <p class="text-sm text-gray-500">Tasti riservati: Space, B, F, S, Ctrl, Shift, Alt, 1-9</p>
                <button onclick="dmxApp.shortcutManager.cancelKeyRecording()" 
                        class="mt-4 bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded text-white">
                    Annulla
                </button>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Temporary listener
        document.addEventListener('keydown', (e) => this.recordKeyBinding(e), { once: true });
    }

    recordKeyBinding(e) {
        if (!this.isRecordingKey) return;
        
        e.preventDefault();
        
        // Reserved keys
        const reservedKeys = ['Space', ' ', 'b', 'B', 'f', 'F', 's', 'S', 
                             'Control', 'Shift', 'Alt', 'Meta', 
                             '1', '2', '3', '4', '5', '6', '7', '8', '9'];
        
        if (reservedKeys.includes(e.key) || e.ctrlKey || e.shiftKey || e.altKey || e.metaKey) {
            DMXMonitor.add(`[SHORTCUT] Tasto ${e.key} riservato`, 'warning');
            
            // Retry
            document.addEventListener('keydown', (e) => this.recordKeyBinding(e), { once: true });
            return;
        }
        
        const key = e.key.toLowerCase();
        
        // Remove previous binding for this scene
        Object.entries(this.keyBindings).forEach(([k, id]) => {
            if (id === this.recordingSceneId) delete this.keyBindings[k];
        });
        
        // Assign new binding
        this.keyBindings[key] = this.recordingSceneId;
        
        const scene = this.app.scenes.find(s => s.id === this.recordingSceneId);
        DMXMonitor.add(`[SHORTCUT] Tasto "${key.toUpperCase()}" → ${scene.name}`, 'success');
        
        // Close modal and save
        this.cancelKeyRecording();
        this.renderShortcuts();
        this.app.sceneManager.renderScenes();
        this.app.saveToStorage();
    }

    cancelKeyRecording() {
        this.isRecordingKey = false;
        this.recordingSceneId = null;
        const modal = document.getElementById('key-recording-modal');
        if (modal) modal.remove();
    }

    removeKeyBinding(key) {
        delete this.keyBindings[key];
        this.renderShortcuts();
        this.app.sceneManager.renderScenes();
        this.app.saveToStorage();
        DMXMonitor.add(`[SHORTCUT] Rimosso tasto "${key.toUpperCase()}"`, 'system');
    }

    renderShortcuts() {
        const container = document.getElementById('scene-shortcuts');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Show existing bindings
        Object.entries(this.keyBindings).forEach(([key, sceneId]) => {
            const scene = this.app.scenes.find(s => s.id === sceneId);
            if (!scene) {
                delete this.keyBindings[key];
                return;
            }
            
            const div = document.createElement('div');
            div.className = 'flex items-center justify-between text-xs mb-1 bg-gray-800 rounded px-2 py-1';
            div.innerHTML = `
                <kbd class="px-2 py-1 bg-purple-600 rounded font-mono uppercase">${key}</kbd>
                <span class="text-blue-400 flex-1 mx-2 truncate">${scene.name}</span>
                <button onclick="dmxApp.shortcutManager.removeKeyBinding('${key}')" 
                        class="text-red-400 hover:text-red-300">×</button>
            `;
            container.appendChild(div);
        });
    }

    executeMacro(id) {
        const macro = this.macros.find(m => m.id === id);
        if (!macro) return;

        DMXMonitor.add(`[MACRO] ${macro.name} - TUTTE LE FIXTURE`, 'system');
        macro.action();
    }

    setColorForAll(r, g, b) {
        DMXMonitor.add(`[MACRO GLOBALE] Applicando colore RGB(${r},${g},${b}) a tutte le fixture`, 'system');
        
        this.app.fixtures.forEach(fixture => {
            this.app.fixtureManager.applyColorToFixture(fixture, r, g, b, 255);
        });
        
        this.app.uiManager.renderControlPanel();
    }

    strobeAll() {
        DMXMonitor.add('[MACRO GLOBALE] Strobo su tutte le fixture', 'system');
        
        this.app.fixtures.forEach(fixture => {
            this.applyStrobeToFixture(fixture);
        });
        
        this.app.uiManager.renderControlPanel();
    }

    blackoutAll() {
        DMXMonitor.add('[MACRO GLOBALE] Blackout su tutte le fixture', 'system');
        
        this.app.fixtures.forEach(fixture => {
            this.app.fixtureManager.applyColorToFixture(fixture, 0, 0, 0, 0);
        });
        
        this.app.uiManager.renderControlPanel();
    }

    applyStrobeToFixture(fixture) {
        let strobeIndex;
        if (fixture.type === 'moving-head') {
            strobeIndex = 7;
        } else if (fixture.type === 'par-led') {
            strobeIndex = 5;
        } else {
            strobeIndex = 7;
        }
        
        if (strobeIndex < fixture.channels) {
            if (fixture.type === 'par-led') {
                fixture.values[strobeIndex] = 25;
                fixture.values[6] = 200;
            } else {
                fixture.values[strobeIndex] = 200;
            }
            
            this.app.dmxController.setChannel(fixture.startChannel + strobeIndex, fixture.values[strobeIndex]);
            if (fixture.type === 'par-led') {
                this.app.dmxController.setChannel(fixture.startChannel + 6, fixture.values[6]);
            }
            
            // Auto-stop after 3 seconds
            setTimeout(() => {
                fixture.values[strobeIndex] = 0;
                this.app.dmxController.setChannel(fixture.startChannel + strobeIndex, 0);
                if (fixture.type === 'par-led') {
                    fixture.values[6] = 0;
                    this.app.dmxController.setChannel(fixture.startChannel + 6, 0);
                }
                this.app.uiManager.renderControlPanel();
            }, 3000);
        }
    }

    globalMacro(target, action) {
        let targetFixtures = [];
        
        if (target === 'all') {
            targetFixtures = this.app.fixtures;
        } else if (target === 'selected' && this.app.selectedFixtureId) {
            targetFixtures = [this.app.fixtures.find(f => f.id === this.app.selectedFixtureId)].filter(Boolean);
        }
        
        if (targetFixtures.length === 0) {
            DMXMonitor.add('[ERRORE] Nessuna fixture target', 'error');
            return;
        }
        
        DMXMonitor.add(`[GLOBAL] ${action} su ${targetFixtures.length} fixture`, 'system');
        
        targetFixtures.forEach(fixture => {
            switch (action) {
                case 'blackout':
                    this.app.fixtureManager.applyColorToFixture(fixture, 0, 0, 0, 0);
                    break;
                case 'full':
                    this.app.fixtureManager.applyColorToFixture(fixture, 255, 255, 255, 255);
                    break;
                case 'strobe':
                    this.applyStrobeToFixture(fixture);
                    break;
            }
        });
        
        this.app.uiManager.renderControlPanel();
    }
}