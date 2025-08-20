// Scene management
class SceneManager {
    constructor(app) {
        this.app = app;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Scene management buttons will be setup when UI loads
    }

    saveCurrentScene() {
    CustomAlert.prompt('Nome della scena:', 'Es: Party Scene', (name) => {
            if (!name) return;
            const scene = {
                id: Date.now(),
                name,
                fixtures: JSON.parse(JSON.stringify(this.app.fixtures)),
                timestamp: new Date().toISOString()
            };

            this.app.scenes.push(scene);
            this.renderScenes();
            this.app.saveToStorage();
            DMXMonitor.add(`[SCENA] Salvata: ${name}`, 'success');
            
            // Offer to assign to shortcut
            CustomAlert.confirm('Vuoi assegnare questa scena a un tasto rapido?', () => {
                this.app.shortcutManager.startKeyRecording(scene.id);
            });
        });
    }

    loadScene(id) {
        const scene = this.app.scenes.find(s => s.id === id);
        if (!scene) return;

        scene.fixtures.forEach(sceneFixture => {
            const currentFixture = this.app.fixtures.find(f => f.id === sceneFixture.id);
            if (currentFixture) {
                currentFixture.values = [...sceneFixture.values];
                for (let i = 0; i < currentFixture.channels; i++) {
                    this.app.dmxController.setChannel(currentFixture.startChannel + i, currentFixture.values[i]);
                }
                this.app.fixtureManager.updateFixtureColor(currentFixture);
            }
        });

        this.app.uiManager.renderControlPanel();
        DMXMonitor.add(`[SCENA] Caricata: ${scene.name}`, 'success');
    }

    deleteScene(id) {
        const scene = this.app.scenes.find(s => s.id === id);
        if (scene) {
            CustomAlert.confirm(`Eliminare la scena "${scene.name}"?`, () => {
                this.app.scenes = this.app.scenes.filter(s => s.id !== id);
                
                // Remove any keyboard shortcuts
                Object.entries(this.app.shortcutManager.keyBindings).forEach(([key, sceneId]) => {
                    if (sceneId === id) {
                        delete this.app.shortcutManager.keyBindings[key];
                    }
                });
                
                this.renderScenes();
                this.app.shortcutManager.renderShortcuts();
                this.app.saveToStorage();
                DMXMonitor.add(`[SCENA] Eliminata: ${scene.name}`, 'system');
            });
        }
    }

    renderScenes() {
        const list = document.getElementById('scene-list');
        if (!list) return;

        list.innerHTML = '';

        if (this.app.scenes.length === 0) {
            list.innerHTML = `
                <div class="text-gray-500 text-center p-8 col-span-full">
                    <div class="text-4xl mb-2">🎬</div>
                    <p>Nessuna scena salvata</p>
                </div>
            `;
            return;
        }

        this.app.scenes.forEach(scene => {
            // Find assigned key if exists
            const assignedKey = Object.entries(this.app.shortcutManager.keyBindings)
                .find(([k, id]) => id === scene.id)?.[0];
            
            const card = document.createElement('div');
            card.className = 'bg-gray-800/50 rounded-lg p-4 cursor-pointer hover:bg-gray-700/50 transition-all duration-200 border border-gray-600 hover:border-blue-500 relative';
            
            // Key badge
            const keyBadge = assignedKey ? 
                `<kbd class="absolute top-2 left-2 px-2 py-1 bg-purple-600 rounded text-xs font-mono uppercase">${assignedKey}</kbd>` : '';
            
            card.innerHTML = `
                ${keyBadge}
                <div class="flex justify-between items-start mb-2 ${assignedKey ? 'ml-8' : ''}">
                    <h3 class="font-semibold text-blue-400">${scene.name}</h3>
                    <div class="flex space-x-1">
                        <button class="text-purple-400 hover:text-purple-300 text-sm" 
                                onclick="event.stopPropagation(); dmxApp.shortcutManager.startKeyRecording(${scene.id})" 
                                title="Assegna Tasto">
                            ⌨️
                        </button>
                        <button class="text-red-400 hover:text-red-300" 
                                onclick="event.stopPropagation(); dmxApp.sceneManager.deleteScene(${scene.id})" 
                                title="Elimina">
                            🗑️
                        </button>
                    </div>
                </div>
                <div class="text-sm text-gray-400">
                    ${scene.fixtures.length} fixtures<br>
                    ${new Date(scene.timestamp).toLocaleString('it-IT')}
                </div>
            `;
            card.onclick = () => this.loadScene(scene.id);
            list.appendChild(card);
        });
    }

    saveProject() {
        const project = {
            version: '1.0',
            fixtures: this.app.fixtures,
            scenes: this.app.scenes,
            stageFixtures: this.app.stageCanvas.stageFixtures,
            sceneKeyBindings: this.app.shortcutManager.keyBindings,
            exportDate: new Date().toISOString()
        };

        const dataStr = JSON.stringify(project, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        
        const link = document.createElement('a');
        link.setAttribute('href', dataUri);
        link.setAttribute('download', `dmx-project-${Date.now()}.json`);
        link.click();
        
        DMXMonitor.add('[PROGETTO] Esportato', 'success');
    }

    loadProject(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const project = JSON.parse(e.target.result);
                
                this.app.fixtures = project.fixtures || [];
                this.app.scenes = project.scenes || [];
                this.app.stageCanvas.stageFixtures = project.stageFixtures || [];
                this.app.shortcutManager.keyBindings = project.sceneKeyBindings || {};
                this.app.selectedFixtureId = null;

                this.app.fixtureManager.updateFixtureList();
                this.app.uiManager.renderControlPanel();
                this.renderScenes();
                this.app.shortcutManager.renderShortcuts();
                this.app.saveToStorage();
                
                DMXMonitor.add(`[PROGETTO] Importato: ${file.name}`, 'success');
            } catch (error) {
                DMXMonitor.add(`[ERRORE] Import fallito: ${error.message}`, 'error');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }
}