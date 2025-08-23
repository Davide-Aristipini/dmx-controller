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

        // Assicura che lo strobo sia gestito
        this.ensureStrobeControl(scene);

        scene.fixtures.forEach(sceneFixture => {
            const currentFixture = this.app.fixtures.find(f => f.id === sceneFixture.id);
            if (currentFixture) {
                // Imposta TUTTI i valori della scena
                for (let i = 0; i < currentFixture.channels; i++) {
                    // Usa il valore della scena o 0 se non definito
                    const value = sceneFixture.values[i] !== undefined ? sceneFixture.values[i] : 0;
                    currentFixture.values[i] = value;
                    this.app.dmxController.setChannel(currentFixture.startChannel + i, value);
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

    ensureStrobeControl(scene) {
        // Assicura che ogni scena abbia valori espliciti per strobo/function
        scene.fixtures.forEach(sceneFixture => {
            const fixture = this.app.fixtures.find(f => f.id === sceneFixture.id);
            if (!fixture) return;
            
            // Assicura che l'array values abbia la lunghezza corretta
            if (sceneFixture.values.length < fixture.channels) {
                const missing = fixture.channels - sceneFixture.values.length;
                for (let i = 0; i < missing; i++) {
                    sceneFixture.values.push(0);
                }
            }
            
            // Se non è esplicitamente impostato, metti strobo a 0
            if (fixture.type === 'moving-head') {
                // Canale 7 è strobo per moving head
                if (sceneFixture.values[7] === undefined || sceneFixture.values[7] === null) {
                    sceneFixture.values[7] = 0;
                }
            } else if (fixture.type === 'par-led') {
                // Canale 5 è function per PAR LED
                if (sceneFixture.values[5] === undefined || sceneFixture.values[5] === null) {
                    sceneFixture.values[5] = 0;
                }
            }
        });
        
        return scene;
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
            card.className = 'bg-gray-800/50 rounded-lg p-4 cursor-pointer hover:bg-gray-700/50 transition-all duration-200 border border-gray-600 hover:border-blue-500 relative group';
            
            // Key badge
            const keyBadge = assignedKey ? 
                `<kbd class="absolute top-2 left-2 px-2 py-1 bg-purple-600 rounded text-xs font-mono uppercase">${assignedKey}</kbd>` : '';
            
            card.innerHTML = `
                ${keyBadge}
                <div class="flex justify-between items-start mb-2 ${assignedKey ? 'ml-8' : ''}">
                    <h3 class="font-semibold text-blue-400">${scene.name}</h3>
                    <div class="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button class="text-blue-400 hover:text-blue-300 text-sm" 
                                onclick="event.stopPropagation(); dmxApp.sceneManager.editScene(${scene.id})" 
                                title="Modifica">
                            ✏️
                        </button>
                        <button class="text-purple-400 hover:text-purple-300 text-sm" 
                                onclick="event.stopPropagation(); dmxApp.shortcutManager.startKeyRecording(${scene.id})" 
                                title="Assegna Tasto">
                            ⌨️
                        </button>
                        <button class="text-green-400 hover:text-green-300 text-sm" 
                                onclick="event.stopPropagation(); dmxApp.sceneManager.duplicateScene(${scene.id})" 
                                title="Duplica">
                            📋
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

    // Aggiungi anche il metodo duplicateScene se non esiste
    duplicateScene(sceneId) {
        const scene = this.app.scenes.find(s => s.id === sceneId);
        if (!scene) return;
        
        const duplicatedScene = {
            id: Date.now(),
            name: scene.name + ' (copia)',
            fixtures: JSON.parse(JSON.stringify(scene.fixtures)), // Deep copy
            timestamp: new Date().toISOString()
        };
        
        this.app.scenes.push(duplicatedScene);
        this.renderScenes();
        this.app.saveToStorage();
        
        DMXMonitor.add(`[SCENE] Duplicata: ${duplicatedScene.name}`, 'success');
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

    editScene(sceneId) {
        const scene = this.app.scenes.find(s => s.id === sceneId);
        if (!scene) return;
        
        // Salva la scena in editing
        this.editingScene = scene;
        this.originalSceneState = JSON.parse(JSON.stringify(scene)); // Deep copy per backup
        
        // Mostra l'editor
        this.showSceneEditor(scene);
    }

    showSceneEditor(scene) {
        const editorHTML = `
            <div id="scene-editor-modal" class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
                <div class="bg-gray-800 rounded-lg p-6 w-[90%] max-w-6xl max-h-[90vh] overflow-y-auto border border-gray-600">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold text-blue-400">✏️ Modifica Scena: ${scene.name}</h2>
                        <button onclick="dmxApp.sceneManager.closeSceneEditor()" 
                                class="text-gray-400 hover:text-white text-2xl">×</button>
                    </div>
                    
                    <!-- Nome scena -->
                    <div class="mb-6">
                        <label class="block text-sm font-medium mb-2">Nome Scena</label>
                        <input type="text" id="edit-scene-name" value="${scene.name}"
                            class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white">
                    </div>
                    
                    <!-- Quick Actions -->
                    <div class="mb-6 flex flex-wrap gap-2">
                        <button onclick="dmxApp.sceneManager.captureCurrentState()" 
                                class="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white">
                            📸 Cattura Stato Attuale
                        </button>
                        <button onclick="dmxApp.sceneManager.previewScene()" 
                                class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white">
                            👁️ Preview
                        </button>
                        <button onclick="dmxApp.sceneManager.applyToAll('blackout')" 
                                class="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded text-white">
                            🌑 Blackout Tutto
                        </button>
                        <button onclick="dmxApp.sceneManager.applyToAll('full')" 
                                class="bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded text-white">
                            ☀️ Full On Tutto
                        </button>
                    </div>
                    
                    <!-- Editor per ogni fixture -->
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        ${this.app.fixtures.map(fixture => this.renderFixtureEditor(fixture, scene)).join('')}
                    </div>
                    
                    <!-- Bottoni salva/annulla -->
                    <div class="flex justify-end space-x-3 mt-6">
                        <button onclick="dmxApp.sceneManager.cancelSceneEdit()" 
                                class="bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded text-white">
                            ❌ Annulla
                        </button>
                        <button onclick="dmxApp.sceneManager.saveSceneEdit()" 
                                class="bg-green-600 hover:bg-green-700 px-6 py-2 rounded text-white font-semibold">
                            💾 Salva Modifiche
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', editorHTML);
        
        // Setup event listeners per gli slider
        this.setupEditorListeners();
    }

    renderFixtureEditor(fixture, scene) {
        const sceneFixture = scene.fixtures.find(f => f.id === fixture.id);
        const values = sceneFixture ? sceneFixture.values : new Array(fixture.channels).fill(0);
        
        let controlsHTML = '';
        
        if (fixture.type === 'moving-head') {
            controlsHTML = `
                <div class="grid grid-cols-3 gap-2">
                    <!-- Movimento -->
                    <div>
                        <label class="text-xs text-gray-400">Pan (Ch${fixture.startChannel})</label>
                        <input type="range" min="0" max="255" value="${values[0] || 0}" 
                            data-fixture="${fixture.id}" data-channel="0" 
                            class="w-full scene-slider">
                        <input type="number" min="0" max="255" value="${values[0] || 0}"
                            data-fixture="${fixture.id}" data-channel="0"
                            class="w-full bg-gray-700 text-white rounded px-2 py-1 text-xs mt-1 scene-number">
                    </div>
                    <div>
                        <label class="text-xs text-gray-400">Tilt (Ch${fixture.startChannel + 2})</label>
                        <input type="range" min="0" max="255" value="${values[2] || 0}" 
                            data-fixture="${fixture.id}" data-channel="2" 
                            class="w-full scene-slider">
                        <input type="number" min="0" max="255" value="${values[2] || 0}"
                            data-fixture="${fixture.id}" data-channel="2"
                            class="w-full bg-gray-700 text-white rounded px-2 py-1 text-xs mt-1 scene-number">
                    </div>
                    <div>
                        <label class="text-xs text-gray-400">Speed (Ch${fixture.startChannel + 5})</label>
                        <input type="range" min="0" max="255" value="${values[5] || 0}" 
                            data-fixture="${fixture.id}" data-channel="5" 
                            class="w-full scene-slider">
                        <input type="number" min="0" max="255" value="${values[5] || 0}"
                            data-fixture="${fixture.id}" data-channel="5"
                            class="w-full bg-gray-700 text-white rounded px-2 py-1 text-xs mt-1 scene-number">
                    </div>
                    
                    <!-- Intensità -->
                    <div>
                        <label class="text-xs text-gray-400">Dimmer (Ch${fixture.startChannel + 6})</label>
                        <input type="range" min="0" max="255" value="${values[6] || 0}" 
                            data-fixture="${fixture.id}" data-channel="6" 
                            class="w-full scene-slider">
                        <input type="number" min="0" max="255" value="${values[6] || 0}"
                            data-fixture="${fixture.id}" data-channel="6"
                            class="w-full bg-gray-700 text-white rounded px-2 py-1 text-xs mt-1 scene-number">
                    </div>
                    <div>
                        <label class="text-xs text-gray-400">Strobe (Ch${fixture.startChannel + 7})</label>
                        <input type="range" min="0" max="255" value="${values[7] || 0}" 
                            data-fixture="${fixture.id}" data-channel="7" 
                            class="w-full scene-slider">
                        <input type="number" min="0" max="255" value="${values[7] || 0}"
                            data-fixture="${fixture.id}" data-channel="7"
                            class="w-full bg-gray-700 text-white rounded px-2 py-1 text-xs mt-1 scene-number">
                    </div>
                    
                    <!-- Colori Front -->
                    <div class="col-span-3">
                        <label class="text-xs text-gray-400">RGB Front</label>
                        <div class="grid grid-cols-3 gap-2">
                            <div>
                                <input type="range" min="0" max="255" value="${values[8] || 0}" 
                                    data-fixture="${fixture.id}" data-channel="8" 
                                    class="w-full scene-slider" style="accent-color: red;">
                                <input type="number" min="0" max="255" value="${values[8] || 0}"
                                    data-fixture="${fixture.id}" data-channel="8"
                                    class="w-full bg-gray-700 text-white rounded px-2 py-1 text-xs mt-1 scene-number">
                            </div>
                            <div>
                                <input type="range" min="0" max="255" value="${values[9] || 0}" 
                                    data-fixture="${fixture.id}" data-channel="9" 
                                    class="w-full scene-slider" style="accent-color: green;">
                                <input type="number" min="0" max="255" value="${values[9] || 0}"
                                    data-fixture="${fixture.id}" data-channel="9"
                                    class="w-full bg-gray-700 text-white rounded px-2 py-1 text-xs mt-1 scene-number">
                            </div>
                            <div>
                                <input type="range" min="0" max="255" value="${values[10] || 0}" 
                                    data-fixture="${fixture.id}" data-channel="10" 
                                    class="w-full scene-slider" style="accent-color: blue;">
                                <input type="number" min="0" max="255" value="${values[10] || 0}"
                                    data-fixture="${fixture.id}" data-channel="10"
                                    class="w-full bg-gray-700 text-white rounded px-2 py-1 text-xs mt-1 scene-number">
                            </div>
                        </div>
                    </div>
                    
                    <!-- Colori Back -->
                    <div class="col-span-3">
                        <label class="text-xs text-gray-400">RGB Back</label>
                        <div class="grid grid-cols-3 gap-2">
                            <div>
                                <input type="range" min="0" max="255" value="${values[12] || 0}" 
                                    data-fixture="${fixture.id}" data-channel="12" 
                                    class="w-full scene-slider" style="accent-color: red;">
                                <input type="number" min="0" max="255" value="${values[12] || 0}"
                                    data-fixture="${fixture.id}" data-channel="12"
                                    class="w-full bg-gray-700 text-white rounded px-2 py-1 text-xs mt-1 scene-number">
                            </div>
                            <div>
                                <input type="range" min="0" max="255" value="${values[13] || 0}" 
                                    data-fixture="${fixture.id}" data-channel="13" 
                                    class="w-full scene-slider" style="accent-color: green;">
                                <input type="number" min="0" max="255" value="${values[13] || 0}"
                                    data-fixture="${fixture.id}" data-channel="13"
                                    class="w-full bg-gray-700 text-white rounded px-2 py-1 text-xs mt-1 scene-number">
                            </div>
                            <div>
                                <input type="range" min="0" max="255" value="${values[14] || 0}" 
                                    data-fixture="${fixture.id}" data-channel="14" 
                                    class="w-full scene-slider" style="accent-color: blue;">
                                <input type="number" min="0" max="255" value="${values[14] || 0}"
                                    data-fixture="${fixture.id}" data-channel="14"
                                    class="w-full bg-gray-700 text-white rounded px-2 py-1 text-xs mt-1 scene-number">
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else if (fixture.type === 'par-led') {
            controlsHTML = `
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="text-xs text-gray-400">Dimmer (Ch${fixture.startChannel})</label>
                        <input type="range" min="0" max="255" value="${values[0] || 0}" 
                            data-fixture="${fixture.id}" data-channel="0" 
                            class="w-full scene-slider">
                        <input type="number" min="0" max="255" value="${values[0] || 0}"
                            data-fixture="${fixture.id}" data-channel="0"
                            class="w-full bg-gray-700 text-white rounded px-2 py-1 text-xs mt-1 scene-number">
                    </div>
                    
                    <!-- RGB -->
                    <div class="col-span-2">
                        <label class="text-xs text-gray-400">RGB</label>
                        <div class="grid grid-cols-3 gap-2">
                            <div>
                                <input type="range" min="0" max="255" value="${values[1] || 0}" 
                                    data-fixture="${fixture.id}" data-channel="1" 
                                    class="w-full scene-slider" style="accent-color: red;">
                                <input type="number" min="0" max="255" value="${values[1] || 0}"
                                    data-fixture="${fixture.id}" data-channel="1"
                                    class="w-full bg-gray-700 text-white rounded px-2 py-1 text-xs mt-1 scene-number">
                            </div>
                            <div>
                                <input type="range" min="0" max="255" value="${values[2] || 0}" 
                                    data-fixture="${fixture.id}" data-channel="2" 
                                    class="w-full scene-slider" style="accent-color: green;">
                                <input type="number" min="0" max="255" value="${values[2] || 0}"
                                    data-fixture="${fixture.id}" data-channel="2"
                                    class="w-full bg-gray-700 text-white rounded px-2 py-1 text-xs mt-1 scene-number">
                            </div>
                            <div>
                                <input type="range" min="0" max="255" value="${values[3] || 0}" 
                                    data-fixture="${fixture.id}" data-channel="3" 
                                    class="w-full scene-slider" style="accent-color: blue;">
                                <input type="number" min="0" max="255" value="${values[3] || 0}"
                                    data-fixture="${fixture.id}" data-channel="3"
                                    class="w-full bg-gray-700 text-white rounded px-2 py-1 text-xs mt-1 scene-number">
                            </div>
                        </div>
                    </div>
                    
                    <!-- Function -->
                    <div>
                        <label class="text-xs text-gray-400">Function (Ch${fixture.startChannel + 5})</label>
                        <select data-fixture="${fixture.id}" data-channel="5" 
                                class="w-full bg-gray-700 text-white rounded px-2 py-1 text-xs scene-select">
                            <option value="0" ${values[5] === 0 ? 'selected' : ''}>OFF</option>
                            <option value="25" ${values[5] === 25 ? 'selected' : ''}>Strobe</option>
                            <option value="75" ${values[5] === 75 ? 'selected' : ''}>Jump</option>
                            <option value="125" ${values[5] === 125 ? 'selected' : ''}>Gradient</option>
                            <option value="175" ${values[5] === 175 ? 'selected' : ''}>Pulse</option>
                            <option value="225" ${values[5] === 225 ? 'selected' : ''}>Music</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-xs text-gray-400">Speed (Ch${fixture.startChannel + 6})</label>
                        <input type="range" min="0" max="255" value="${values[6] || 0}" 
                            data-fixture="${fixture.id}" data-channel="6" 
                            class="w-full scene-slider">
                        <input type="number" min="0" max="255" value="${values[6] || 0}"
                            data-fixture="${fixture.id}" data-channel="6"
                            class="w-full bg-gray-700 text-white rounded px-2 py-1 text-xs mt-1 scene-number">
                     </div>
                </div>
            `;
        } else if (fixture.type === 'par-rgb') {
            controlsHTML = `
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="text-xs text-gray-400">Dimmer (Ch${fixture.startChannel})</label>
                        <input type="range" min="0" max="255" value="${values[0] || 0}" 
                            data-fixture="${fixture.id}" data-channel="0" 
                            class="w-full scene-slider">
                        <input type="number" min="0" max="255" value="${values[0] || 0}"
                            data-fixture="${fixture.id}" data-channel="0"
                            class="w-full bg-gray-700 text-white rounded px-2 py-1 text-xs mt-1 scene-number">
                    </div>
                    
                    <div>
                        <label class="text-xs text-gray-400">Strobo (Ch${fixture.startChannel + 1})</label>
                        <input type="range" min="0" max="255" value="${values[1] || 0}" 
                            data-fixture="${fixture.id}" data-channel="1" 
                            class="w-full scene-slider">
                        <input type="number" min="0" max="255" value="${values[1] || 0}"
                            data-fixture="${fixture.id}" data-channel="1"
                            class="w-full bg-gray-700 text-white rounded px-2 py-1 text-xs mt-1 scene-number">
                    </div>
                    
                    <!-- Effect Mode -->
                    <div>
                        <label class="text-xs text-gray-400">Effect (Ch${fixture.startChannel + 2})</label>
                        <select data-fixture="${fixture.id}" data-channel="2" 
                                class="w-full bg-gray-700 text-white rounded px-2 py-1 text-xs scene-select">
                            <option value="0" ${values[2] === 0 ? 'selected' : ''}>OFF</option>
                            <option value="75" ${values[2] === 75 ? 'selected' : ''}>Jump</option>
                            <option value="125" ${values[2] === 125 ? 'selected' : ''}>Fade</option>
                            <option value="255" ${values[2] === 255 ? 'selected' : ''}>Music</option>
                        </select>
                    </div>
                    
                    <div>
                        <label class="text-xs text-gray-400">Speed (Ch${fixture.startChannel + 3})</label>
                        <input type="range" min="0" max="255" value="${values[3] || 0}" 
                            data-fixture="${fixture.id}" data-channel="3" 
                            class="w-full scene-slider">
                        <input type="number" min="0" max="255" value="${values[3] || 0}"
                            data-fixture="${fixture.id}" data-channel="3"
                            class="w-full bg-gray-700 text-white rounded px-2 py-1 text-xs mt-1 scene-number">
                    </div>
                    
                    <!-- RGB -->
                    <div class="col-span-2">
                        <label class="text-xs text-gray-400">RGB (Ch${fixture.startChannel + 4}-${fixture.startChannel + 6})</label>
                        <div class="grid grid-cols-3 gap-2">
                            <div>
                                <input type="range" min="0" max="255" value="${values[4] || 0}" 
                                    data-fixture="${fixture.id}" data-channel="4" 
                                    class="w-full scene-slider" style="accent-color: red;">
                                <input type="number" min="0" max="255" value="${values[4] || 0}"
                                    data-fixture="${fixture.id}" data-channel="4"
                                    class="w-full bg-gray-700 text-white rounded px-2 py-1 text-xs mt-1 scene-number">
                            </div>
                            <div>
                                <input type="range" min="0" max="255" value="${values[5] || 0}" 
                                    data-fixture="${fixture.id}" data-channel="5" 
                                    class="w-full scene-slider" style="accent-color: green;">
                                <input type="number" min="0" max="255" value="${values[5] || 0}"
                                    data-fixture="${fixture.id}" data-channel="5"
                                    class="w-full bg-gray-700 text-white rounded px-2 py-1 text-xs mt-1 scene-number">
                            </div>
                            <div>
                                <input type="range" min="0" max="255" value="${values[6] || 0}" 
                                    data-fixture="${fixture.id}" data-channel="6" 
                                    class="w-full scene-slider" style="accent-color: blue;">
                                <input type="number" min="0" max="255" value="${values[6] || 0}"
                                    data-fixture="${fixture.id}" data-channel="6"
                                    class="w-full bg-gray-700 text-white rounded px-2 py-1 text-xs mt-1 scene-number">
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Preview del colore
        const r = fixture.type === 'moving-head' ? values[8] || 0 : 
          fixture.type === 'par-rgb' ? values[4] || 0 : values[1] || 0;
        const g = fixture.type === 'moving-head' ? values[9] || 0 : 
                fixture.type === 'par-rgb' ? values[5] || 0 : values[2] || 0;
        const b = fixture.type === 'moving-head' ? values[10] || 0 : 
                fixture.type === 'par-rgb' ? values[6] || 0 : values[3] || 0;
        
        return `
            <div class="bg-gray-700/50 rounded-lg p-4">
                <div class="flex justify-between items-center mb-3">
                    <h3 class="font-semibold text-yellow-400">${fixture.name}</h3>
                    <div class="flex items-center space-x-2">
                        <div class="w-8 h-8 rounded-full border-2 border-gray-600" 
                            style="background-color: rgb(${r}, ${g}, ${b})"
                            title="Preview colore"></div>
                        <button onclick="dmxApp.sceneManager.copyFixtureValues(${fixture.id})" 
                                class="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded">
                            📋 Copia
                        </button>
                        <button onclick="dmxApp.sceneManager.pasteFixtureValues(${fixture.id})" 
                                class="text-xs bg-green-600 hover:bg-green-700 px-2 py-1 rounded">
                            📥 Incolla
                        </button>
                    </div>
                </div>
                ${controlsHTML}
            </div>
        `;
    }

    setupEditorListeners() {
        // Slider listeners
        document.querySelectorAll('.scene-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const fixtureId = parseInt(e.target.dataset.fixture);
                const channel = parseInt(e.target.dataset.channel);
                const value = parseInt(e.target.value);
                
                // Update corresponding number input
                const numberInput = document.querySelector(
                    `.scene-number[data-fixture="${fixtureId}"][data-channel="${channel}"]`
                );
                if (numberInput) {
                    numberInput.value = value;
                }
                
                // Update scene data
                this.updateSceneValue(fixtureId, channel, value);
                
                // Live preview se abilitato
                if (document.getElementById('live-preview-checkbox')?.checked) {
                    this.previewValue(fixtureId, channel, value);
                }
            });
        });
        
        // Number input listeners
        document.querySelectorAll('.scene-number').forEach(input => {
            input.addEventListener('change', (e) => {
                const fixtureId = parseInt(e.target.dataset.fixture);
                const channel = parseInt(e.target.dataset.channel);
                let value = parseInt(e.target.value);
                
                // Clamp value
                value = Math.max(0, Math.min(255, value));
                e.target.value = value;
                
                // Update corresponding slider
                const slider = document.querySelector(
                    `.scene-slider[data-fixture="${fixtureId}"][data-channel="${channel}"]`
                );
                if (slider) {
                    slider.value = value;
                }
                
                // Update scene data
                this.updateSceneValue(fixtureId, channel, value);
            });
        });
        
        // Select listeners (per PAR LED functions)
        document.querySelectorAll('.scene-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const fixtureId = parseInt(e.target.dataset.fixture);
                const channel = parseInt(e.target.dataset.channel);
                const value = parseInt(e.target.value);
                
                this.updateSceneValue(fixtureId, channel, value);
            });
        });
    }

    updateSceneValue(fixtureId, channel, value) {
        if (!this.editingScene) return;
        
        let sceneFixture = this.editingScene.fixtures.find(f => f.id === fixtureId);
        
        if (!sceneFixture) {
            // Crea la fixture nella scena se non esiste
            const fixture = this.app.fixtures.find(f => f.id === fixtureId);
            if (!fixture) return;
            
            sceneFixture = {
                id: fixtureId,
                values: new Array(fixture.channels).fill(0)
            };
            this.editingScene.fixtures.push(sceneFixture);
        }
        
        sceneFixture.values[channel] = value;
    }

    previewValue(fixtureId, channel, value) {
        const fixture = this.app.fixtures.find(f => f.id === fixtureId);
        if (!fixture) return;
        
        fixture.values[channel] = value;
        this.app.dmxController.setChannel(fixture.startChannel + channel, value);
        this.app.fixtureManager.updateFixtureColor(fixture);
    }

    previewScene() {
        if (!this.editingScene) return;
        
        this.editingScene.fixtures.forEach(sceneFixture => {
            const fixture = this.app.fixtures.find(f => f.id === sceneFixture.id);
            if (fixture) {
                for (let i = 0; i < sceneFixture.values.length; i++) {
                    fixture.values[i] = sceneFixture.values[i];
                    this.app.dmxController.setChannel(fixture.startChannel + i, sceneFixture.values[i]);
                }
                this.app.fixtureManager.updateFixtureColor(fixture);
            }
        });
        
        this.app.uiManager.renderControlPanel();
        DMXMonitor.add('[SCENE] Preview attivo', 'system');
    }

    captureCurrentState() {
        if (!this.editingScene) return;
        
        CustomAlert.confirm('Vuoi catturare lo stato attuale di tutte le fixture?', () => {
            this.editingScene.fixtures = this.app.fixtures.map(fixture => ({
                id: fixture.id,
                values: [...fixture.values]
            }));
            
            // Ricarica l'editor con i nuovi valori
            document.getElementById('scene-editor-modal')?.remove();
            this.showSceneEditor(this.editingScene);
            
            DMXMonitor.add('[SCENE] Stato attuale catturato', 'success');
        });
    }

    applyToAll(action) {
        if (!this.editingScene) return;
        
        this.app.fixtures.forEach(fixture => {
            let sceneFixture = this.editingScene.fixtures.find(f => f.id === fixture.id);
            
            if (!sceneFixture) {
                sceneFixture = {
                    id: fixture.id,
                    values: new Array(fixture.channels).fill(0)
                };
                this.editingScene.fixtures.push(sceneFixture);
            }
            
            if (action === 'blackout') {
                sceneFixture.values.fill(0);
            } else if (action === 'full') {
                if (fixture.type === 'moving-head') {
                    sceneFixture.values[6] = 255;  // Dimmer
                    sceneFixture.values[8] = 255;  // R Front
                    sceneFixture.values[9] = 255;  // G Front
                    sceneFixture.values[10] = 255; // B Front
                    sceneFixture.values[12] = 255; // R Back
                    sceneFixture.values[13] = 255; // G Back
                    sceneFixture.values[14] = 255; // B Back
                } else if (fixture.type === 'par-led') {
                    sceneFixture.values[0] = 255;  // Dimmer
                    sceneFixture.values[1] = 255;  // R
                    sceneFixture.values[2] = 255;  // G
                    sceneFixture.values[3] = 255;  // B
                }
            }
        });
        
        // Ricarica l'editor
        document.getElementById('scene-editor-modal')?.remove();
        this.showSceneEditor(this.editingScene);
        
        DMXMonitor.add(`[SCENE] Applicato ${action} a tutte le fixture`, 'system');
    }

    copyFixtureValues(fixtureId) {
        const sceneFixture = this.editingScene?.fixtures.find(f => f.id === fixtureId);
        if (sceneFixture) {
            this.copiedValues = [...sceneFixture.values];
            DMXMonitor.add('[SCENE] Valori copiati', 'success');
        }
    }

    pasteFixtureValues(fixtureId) {
        if (!this.copiedValues || !this.editingScene) return;
        
        let sceneFixture = this.editingScene.fixtures.find(f => f.id === fixtureId);
        
        if (!sceneFixture) {
            const fixture = this.app.fixtures.find(f => f.id === fixtureId);
            if (!fixture) return;
            
            sceneFixture = {
                id: fixtureId,
                values: new Array(fixture.channels).fill(0)
            };
            this.editingScene.fixtures.push(sceneFixture);
        }
        
        // Copia solo i valori che esistono
        for (let i = 0; i < Math.min(this.copiedValues.length, sceneFixture.values.length); i++) {
            sceneFixture.values[i] = this.copiedValues[i];
        }
        
        // Ricarica l'editor
        document.getElementById('scene-editor-modal')?.remove();
        this.showSceneEditor(this.editingScene);
        
        DMXMonitor.add('[SCENE] Valori incollati', 'success');
    }

    saveSceneEdit() {
        if (!this.editingScene) return;
        
        // Aggiorna il nome
        const newName = document.getElementById('edit-scene-name')?.value.trim();
        if (newName) {
            this.editingScene.name = newName;
        }
        
        // Salva tutto
        this.app.saveToStorage();
        this.renderScenes();
        this.closeSceneEditor();
        
        DMXMonitor.add(`[SCENE] Salvata: ${this.editingScene.name}`, 'success');
    }

    cancelSceneEdit() {
        if (this.originalSceneState && this.editingScene) {
            // Ripristina lo stato originale
            const index = this.app.scenes.findIndex(s => s.id === this.editingScene.id);
            if (index !== -1) {
                this.app.scenes[index] = this.originalSceneState;
            }
        }
        
        this.closeSceneEditor();
    }

    closeSceneEditor() {
        document.getElementById('scene-editor-modal')?.remove();
        this.editingScene = null;
        this.originalSceneState = null;
    }
}