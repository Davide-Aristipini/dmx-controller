// UI Manager
class UIManager {
    constructor(app) {
        this.app = app;
        this.currentTab = 'control';
    }

    initialize() {
        // Setup tabs
        this.setupTabs();
        
        // Initialize with control tab
        this.loadTabContent('control');
        
        // Setup other UI elements
        this.updateConnectionStatus(false);
        
        // Setup DMX monitor
        DMXMonitor.initialize();
    }

    setupTabs() {
        const tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                // Remove active class from all tabs
                tabs.forEach(t => {
                    t.classList.remove('tab-active');
                    t.classList.add('bg-gray-700');
                });
                
                // Add active class to clicked tab
                tab.classList.remove('bg-gray-700');
                tab.classList.add('tab-active');
                
                // Load tab content
                this.loadTabContent(tab.dataset.tab);
            });
        });
    }

    loadTabContent(tabName) {
        const container = document.getElementById('tab-container');
        if (!container) return;

        // Cleanup delle shortcut del tab precedente
        if (this.currentTab === 'chase' && this.app.chaseManager) {
            this.app.chaseManager.cleanupChaseShortcuts();
        }

        this.currentTab = tabName;

        switch(tabName) {
            case 'control':
                container.innerHTML = this.getControlTabHTML();
                this.renderControlPanel();
                break;
            case 'scenes':
                container.innerHTML = this.getScenesTabHTML();
                this.app.sceneManager.renderScenes();
                this.setupSceneEventListeners();
                break;
            case 'chase':
                container.innerHTML = this.getChaseTabHTML();
                setTimeout(() => {
                    this.app.chaseManager.initializeTab();
                }, 100);
                break;
            case 'stage':
                container.innerHTML = this.getStageTabHTML();
                setTimeout(() => {
                    this.app.stageCanvas.initialize();
                }, 100);
                break;
            case 'music':
                container.innerHTML = this.getMusicTabHTML();
                setTimeout(() => {
                    this.app.audioPlayer.initializeMusicTab();
                }, 100);
                break;
            case 'settings':
                container.innerHTML = this.getSettingsTabHTML();
                break;
        }
    }

    showTab(tabName) {
        // Trova e clicca il tab
        const tabBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
        if (tabBtn) {
            tabBtn.click();
        }
    }

    getChaseTabHTML() {
        return `
            <div class="flex-grow p-4">
                <div class="w-full">
                    <!-- Header principale -->
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold text-orange-400">🎯 Chase Controller</h2>
                        <div class="flex items-center space-x-3">
                            <div class="text-sm text-gray-400">
                                Sync: <span id="sync-status" class="text-green-400">Ready</span>
                            </div>
                            <button id="chase-help" class="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-all duration-200">
                                ❓ Aiuto
                            </button>
                        </div>
                    </div>

                    <!-- Layout principale a 3 colonne -->
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        <!-- Colonna 1: Chase List & Creator -->
                        <div class="space-y-4">
                            <!-- Lista Chase Salvati -->
                            <div class="bg-gray-800/50 rounded-lg p-4">
                                <div class="flex justify-between items-center mb-4">
                                    <h3 class="text-lg font-semibold text-orange-300">📚 Chase Salvati</h3>
                                    <button id="create-new-chase" class="bg-green-600 hover:bg-green-700 text-white py-1 px-3 rounded text-sm">
                                        + Nuovo Chase
                                    </button>
                                </div>
                                <div id="chase-list-tab" class="space-y-2 max-h-96 overflow-y-auto">
                                    <!-- Chase verranno popolati qui -->
                                </div>
                            </div>

                            <!-- Quick Templates -->
                            <div class="bg-gray-800/50 rounded-lg p-4">
                                <h3 class="text-lg font-semibold text-blue-300 mb-3">⚡ Template Rapidi</h3>
                                <div class="grid grid-cols-2 gap-2">
                                    <button onclick="dmxApp.chaseManager.createQuickChase('rgb')" 
                                            class="bg-blue-600/20 hover:bg-blue-600/40 p-2 rounded text-xs relative group">
                                        🌈 RGB Cycle
                                        <kbd class="absolute top-1 right-1 text-xs opacity-50 group-hover:opacity-100">Z</kbd>
                                    </button>
                                    <button onclick="dmxApp.chaseManager.createQuickChase('strobe')" 
                                            class="bg-red-600/20 hover:bg-red-600/40 p-2 rounded text-xs relative group">
                                        ⚡ Strobe
                                        <kbd class="absolute top-1 right-1 text-xs opacity-50 group-hover:opacity-100">X</kbd>
                                    </button>
                                    <button onclick="dmxApp.chaseManager.createQuickChase('fade')" 
                                            class="bg-purple-600/20 hover:bg-purple-600/40 p-2 rounded text-xs relative group">
                                        🌅 Fade In/Out
                                        <kbd class="absolute top-1 right-1 text-xs opacity-50 group-hover:opacity-100">C</kbd>
                                    </button>
                                    <button onclick="dmxApp.chaseManager.createQuickChase('random')" 
                                            class="bg-green-600/20 hover:bg-green-600/40 p-2 rounded text-xs relative group">
                                        🎲 Random
                                        <kbd class="absolute top-1 right-1 text-xs opacity-50 group-hover:opacity-100">V</kbd>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Colonna 2: Player & Controls -->
                        <div class="space-y-4">
                            <!-- Chase Player -->
                            <div class="bg-gray-800/50 rounded-lg p-6">
                                <h3 class="text-lg font-semibold text-green-400 mb-4">▶️ Player</h3>
                                
                                <!-- Display Chase Attivo -->
                                <div class="bg-gray-900/50 rounded-lg p-4 mb-4">
                                    <div class="text-xs text-gray-400 mb-1">Chase Attivo</div>
                                    <div id="active-chase-name-tab" class="text-xl font-bold text-orange-300">Nessuno</div>
                                    <div class="mt-2 flex items-center space-x-2">
                                        <span class="text-sm text-gray-400">Step:</span>
                                        <span id="current-step-tab" class="text-lg font-bold text-white">-</span>
                                        <span class="text-gray-400">/</span>
                                        <span id="total-steps-tab" class="text-lg text-gray-300">-</span>
                                    </div>
                                </div>

                                <!-- Progress Bar -->
                                <div class="mb-4">
                                    <div class="h-2 bg-gray-700 rounded-full overflow-hidden">
                                        <div id="chase-progress" class="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-300" style="width: 0%"></div>
                                    </div>
                                    <div id="step-indicators" class="flex justify-between mt-2">
                                        <!-- Indicatori step verranno aggiunti qui -->
                                    </div>
                                </div>

                                <!-- Controlli Playback -->
                                <div class="flex justify-center space-x-3 mb-4">
                                    <button id="chase-prev" class="p-3 bg-gray-600 hover:bg-gray-700 rounded-lg transition-all relative group" title="Previous (A/←)">
                                        ⏮️
                                        <kbd class="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs opacity-0 group-hover:opacity-100">A</kbd>
                                    </button>
                                    <button id="chase-play-tab" class="p-3 bg-green-600 hover:bg-green-700 rounded-lg transition-all text-xl relative group" title="Play (Space)">
                                        ▶️
                                        <kbd class="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs opacity-0 group-hover:opacity-100">⎵</kbd>
                                    </button>
                                    <button id="chase-pause-tab" class="p-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-all text-xl relative group" title="Pause (Space)">
                                        ⏸️
                                        <kbd class="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs opacity-0 group-hover:opacity-100">⎵</kbd>
                                    </button>
                                    <button id="chase-stop-tab" class="p-3 bg-red-600 hover:bg-red-700 rounded-lg transition-all text-xl relative group" title="Stop (S)">
                                        ⏹️
                                        <kbd class="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs opacity-0 group-hover:opacity-100">S</kbd>
                                    </button>
                                    <button id="chase-next-tab" class="p-3 bg-gray-600 hover:bg-gray-700 rounded-lg transition-all relative group" title="Next (D/→)">
                                        ⏭️
                                        <kbd class="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs opacity-0 group-hover:opacity-100">D</kbd>
                                    </button>
                                </div>

                                <!-- Mode Settings -->
                                <div class="grid grid-cols-2 gap-3 mb-4">
                                    <div>
                                        <label class="text-xs text-gray-400">Direzione</label>
                                        <select id="chase-direction" class="w-full bg-gray-700 text-white rounded px-2 py-1 text-sm">
                                            <option value="forward">Avanti →</option>
                                            <option value="backward">Indietro ←</option>
                                            <option value="bounce">Ping Pong ↔</option>
                                            <option value="random">Casuale 🎲</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="text-xs text-gray-400">Loop</label>
                                        <select id="chase-loop" class="w-full bg-gray-700 text-white rounded px-2 py-1 text-sm">
                                            <option value="true">Continuo ♾️</option>
                                            <option value="once">Singolo 1️⃣</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <button onclick="dmxApp.chaseManager.killAllStrobes()" 
                                    class="p-3 bg-orange-600 hover:bg-orange-700 rounded-lg transition-all text-xl" 
                                    title="Kill Strobo">
                                ⚡❌
                            </button>

                            <!-- Timing Controls -->
                            <div class="bg-gray-800/50 rounded-lg p-4">
                                <h3 class="text-lg font-semibold text-purple-400 mb-3">⏱️ Timing</h3>
                                
                                <!-- BPM Control -->
                                <div class="mb-3">
                                    <label class="text-xs text-gray-400">Velocità (BPM)</label>
                                    <div class="flex items-center space-x-2">
                                        <button id="chase-tap-tempo-tab" class="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm relative group">
                                            TAP
                                            <kbd class="absolute -top-5 left-1/2 transform -translate-x-1/2 text-xs opacity-0 group-hover:opacity-100">T</kbd>
                                        </button>
                                        <input type="number" id="chase-bpm-tab" value="120" min="30" max="300" 
                                            class="w-20 bg-gray-700 text-white rounded px-2 py-1 text-sm">
                                        <span class="text-xs text-gray-400">BPM</span>
                                        <div class="flex-1"></div>
                                        <button id="bpm-half" onclick="dmxApp.chaseManager.setBPM(dmxApp.chaseManager.bpm/2)" 
                                                class="px-2 py-1 bg-gray-600 hover:bg-gray-700 rounded text-xs">
                                            ÷2
                                        </button>
                                        <button id="bpm-double" onclick="dmxApp.chaseManager.setBPM(dmxApp.chaseManager.bpm*2)" 
                                                class="px-2 py-1 bg-gray-600 hover:bg-gray-700 rounded text-xs">
                                            ×2
                                        </button>
                                    </div>
                                </div>

                                <!-- Sync Options -->
                                <div class="mb-3">
                                    <label class="text-xs text-gray-400 mb-2 block">Sincronizzazione</label>
                                    <div class="grid grid-cols-3 gap-2">
                                        <button id="sync-manual" class="sync-btn bg-gray-600 hover:bg-gray-700 p-2 rounded text-xs active relative group">
                                            🎛️ Manuale
                                            <kbd class="absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-xs opacity-0 group-hover:opacity-100">M</kbd>
                                        </button>
                                        <button id="sync-mic" class="sync-btn bg-gray-600 hover:bg-gray-700 p-2 rounded text-xs relative group">
                                            🎤 Microfono
                                            <kbd class="absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-xs opacity-0 group-hover:opacity-100">I</kbd>
                                        </button>
                                        <button id="sync-music" class="sync-btn bg-gray-600 hover:bg-gray-700 p-2 rounded text-xs relative group">
                                            🎵 Music
                                            <kbd class="absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-xs opacity-0 group-hover:opacity-100">U</kbd>
                                        </button>
                                    </div>
                                </div>

                                <!-- Fade Time -->
                                <div>
                                    <label class="text-xs text-gray-400 flex justify-between mb-1">
                                        <span>Fade Time</span>
                                        <span id="fade-time-display-tab" class="text-orange-300">0ms</span>
                                    </label>
                                    <input type="range" id="chase-fade-time-tab" min="0" max="5000" value="0" class="w-full">
                                    <div class="flex justify-between text-xs text-gray-500 mt-1">
                                        <span>Instant</span>
                                        <span>5s</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Beat Indicator -->
                            <div class="bg-gray-800/50 rounded-lg p-3">
                                <div class="flex items-center justify-between">
                                    <span class="text-xs text-gray-400">Beat Detection</span>
                                    <div id="beat-indicator-tab" class="w-4 h-4 rounded-full bg-gray-600 transition-all duration-100"></div>
                                </div>
                                <div class="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
                                    <div id="beat-bar-tab" class="h-full bg-gradient-to-r from-green-500 to-blue-500" style="width: 0%"></div>
                                </div>
                            </div>
                        </div>

                        <!-- Colonna 3: Scene Selector & Preview -->
                        <div class="space-y-4">
                            <!-- Scene Selector per Editing -->
                            <div id="chase-editor" class="bg-gray-800/50 rounded-lg p-4 hidden">
                                <h3 class="text-lg font-semibold text-blue-400 mb-3">✏️ Editor Chase</h3>
                                
                                <div class="mb-4">
                                    <input type="text" id="edit-chase-name" 
                                        class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                                        placeholder="Nome del Chase">
                                </div>

                                <div class="grid grid-cols-2 gap-4 mb-4">
                                    <!-- Scene disponibili -->
                                    <div>
                                        <div class="text-xs text-gray-400 mb-2">Scene Disponibili</div>
                                        <div id="available-scenes-tab" class="bg-gray-900/50 rounded p-2 h-64 overflow-y-auto">
                                            <!-- Scene verranno popolate qui -->
                                        </div>
                                    </div>

                                    <!-- Sequenza Chase -->
                                    <div>
                                        <div class="text-xs text-gray-400 mb-2">Sequenza Chase</div>
                                        <div id="chase-sequence-tab" class="bg-gray-900/50 rounded p-2 h-64 overflow-y-auto">
                                            <!-- Sequenza verrà popolata qui -->
                                        </div>
                                    </div>
                                </div>

                                <!-- Bottoni controllo -->
                                <div class="flex justify-center space-x-2 mb-4">
                                    <button onclick="dmxApp.chaseManager.addSelectedScenesToChase()" 
                                            class="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm">
                                        → Aggiungi
                                    </button>
                                    <button onclick="dmxApp.chaseManager.removeSelectedFromChase()" 
                                            class="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm">
                                        ← Rimuovi
                                    </button>
                                    <button onclick="dmxApp.chaseManager.clearChaseSequence()" 
                                            class="px-3 py-1 bg-orange-600 hover:bg-orange-700 rounded text-sm">
                                        🗑️ Pulisci
                                    </button>
                                </div>

                                <!-- Save/Cancel -->
                                <div class="flex space-x-2">
                                    <button onclick="dmxApp.chaseManager.saveEditedChase()" 
                                            class="flex-1 bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white">
                                        💾 Salva Chase
                                    </button>
                                    <button onclick="dmxApp.chaseManager.cancelEdit()" 
                                            class="flex-1 bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded text-white">
                                        ❌ Annulla
                                    </button>
                                </div>
                            </div>

                            <!-- Live Preview -->
                            <div class="bg-gray-800/50 rounded-lg p-4">
                                <h3 class="text-lg font-semibold text-cyan-400 mb-3">👁️ Live Preview</h3>
                                <div id="chase-preview" class="space-y-2">
                                    <div class="text-center text-gray-500 py-8">
                                        <div class="text-4xl mb-2">🎬</div>
                                        <p>Seleziona un chase per vedere l'anteprima</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Statistics -->
                            <div class="bg-gray-800/50 rounded-lg p-4">
                                <h3 class="text-lg font-semibold text-gray-400 mb-3">📊 Statistiche</h3>
                                <div class="space-y-2 text-sm">
                                    <div class="flex justify-between">
                                        <span class="text-gray-400">Chase totali:</span>
                                        <span id="total-chases" class="text-white">0</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-400">Scene usate:</span>
                                        <span id="total-scenes-used" class="text-white">0</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-400">Tempo runtime:</span>
                                        <span id="runtime-time" class="text-white">00:00</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-400">Beat ricevuti:</span>
                                        <span id="beats-received" class="text-white">0</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getControlTabHTML() {
        return `
            <div class="flex-grow p-4 overflow-y-auto">
                <!-- Placeholder when no fixture selected -->
                <div id="control-panel-placeholder" class="text-center text-gray-500 py-16">
                    <div class="text-6xl mb-4">🎛️</div>
                    <p class="text-xl">Seleziona una fixture per vedere i controlli</p>
                    <p class="text-sm mt-2">Aggiungi e seleziona una fixture dalla sidebar sinistra</p>
                </div>
                
                <!-- Control panel for selected fixture -->
                <div id="control-panel" class="hidden">
                    <div class="bg-gray-800/50 rounded-lg p-6">
                        <h2 class="text-2xl font-bold mb-6 text-blue-400">
                            <span id="fixture-name">Fixture</span>
                        </h2>
                        
                        <!-- Channel sliders grid -->
                        <div id="channel-sliders" class="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
                            <!-- Channel controls will be rendered here -->
                        </div>
                        
                        <!-- Special functions for PAR LED -->
                        <div id="special-functions" class="mt-8">
                            <!-- PAR LED special controls will be rendered here -->
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getScenesTabHTML() {
        return `
            <div class="flex-grow p-4">
                <div class="w-full">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold text-blue-400">🎬 Scene Manager</h2>
                        <div class="flex space-x-3">
                            <button id="save-scene" class="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-all duration-200 font-medium">
                                💾 Salva Scena
                            </button>
                            <button id="save-project" class="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-all duration-200 font-medium">
                                📁 Salva Progetto
                            </button>
                            <label class="bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-lg transition-all duration-200 font-medium cursor-pointer">
                                📂 Carica Progetto
                                <input type="file" id="load-project" class="hidden" accept=".json">
                            </label>
                        </div>
                    </div>
                    <div id="scene-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <!-- Scenes will be populated here -->
                    </div>
                </div>
            </div>
        `;
    }

    getStageTabHTML() {
        return `
            <div class="flex-grow p-4">
                <div class="w-full">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-2xl font-bold text-blue-400">🎪 Visualizzazione Palco</h2>
                        <button onclick="dmxApp.stageCanvas.clearStage()" 
                                class="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-all duration-200 font-medium">
                            🗑️ Pulisci Palco
                        </button>
                    </div>
                    <div class="bg-black rounded-lg border border-gray-700 relative" style="height: calc(100vh - 180px);">
                        <canvas id="dmx-canvas" class="w-full h-full rounded-lg"></canvas>
                        <div id="canvas-placeholder" class="absolute inset-0 flex items-center justify-center text-gray-500 text-center pointer-events-none">
                            <div>
                                <div class="text-6xl mb-4">🎪</div>
                                <p class="text-xl">Clicca per posizionare le fixture</p>
                                <p class="text-sm">Seleziona prima una fixture dalla sidebar</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getMusicTabHTML() {
        return `
            <div id="music-tab-content" class="flex-grow p-4" style="height: calc(100vh - 120px); overflow-y: auto;">
                <div class="flex-grow pb-8">
                    <div class="w-full max-w-7xl mx-auto">
                        <!-- Header -->
                        <div class="flex justify-between items-center mb-6">
                            <h2 class="text-2xl font-bold text-purple-400">🎵 Music Library & Player</h2>
                            <div class="flex space-x-3">
                                <label class="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-all duration-200 font-medium cursor-pointer">
                                    📁 Carica Musica
                                    <input type="file" id="music-library-input" class="hidden" accept="audio/*" multiple>
                                </label>
                                <button id="clear-library" class="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-all duration-200 font-medium">
                                    🗑️ Svuota Libreria
                                </button>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <!-- Library Panel (2/3 width) -->
                            <div class="lg:col-span-2 bg-gray-800/50 rounded-lg p-4">
                                <h3 class="text-lg font-semibold mb-4 text-blue-400">📚 Libreria Musicale</h3>
                                
                                <!-- Search and filters -->
                                <div class="flex space-x-2 mb-4">
                                    <input type="text" id="music-search" placeholder="🔍 Cerca..." 
                                        class="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm">
                                    <select id="music-sort" class="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm">
                                        <option value="name">Nome</option>
                                        <option value="date">Data</option>
                                        <option value="duration">Durata</option>
                                        <option value="size">Dimensione</option>
                                    </select>
                                </div>

                                <!-- Library table -->
                                <div class="overflow-x-auto">
                                    <table class="w-full text-sm">
                                        <thead class="bg-gray-900/50">
                                            <tr>
                                                <th class="p-2 text-left">#</th>
                                                <th class="p-2 text-left">Titolo</th>
                                                <th class="p-2 text-left">Artista</th>
                                                <th class="p-2 text-left">Album</th>
                                                <th class="p-2 text-left">Durata</th>
                                                <th class="p-2 text-left">Data</th>
                                                <th class="p-2 text-left">Dimensione</th>
                                                <th class="p-2 text-center">Azioni</th>
                                            </tr>
                                        </thead>
                                        <tbody id="music-library-tbody" class="divide-y divide-gray-700">
                                            <tr>
                                                <td colspan="8" class="p-8 text-center text-gray-500">
                                                    Nessun file caricato
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <!-- Library stats -->
                                <div class="mt-4 pt-4 border-t border-gray-700 flex justify-between text-xs text-gray-400">
                                    <span id="library-stats">0 brani, 0 MB totali</span>
                                    <span id="library-duration">Durata totale: 0:00</span>
                                </div>
                            </div>

                            <!-- Player Panel (1/3 width) -->
                            <div class="bg-gray-800/50 rounded-lg p-4">
                                <h3 class="text-lg font-semibold mb-4 text-green-400">▶️ Player</h3>
                                
                                <!-- Current track info -->
                                <div class="bg-gray-900/50 rounded-lg p-3 mb-4">
                                    <div id="now-playing-title" class="font-semibold text-white truncate">
                                        Nessuna traccia
                                    </div>
                                    <div id="now-playing-artist" class="text-sm text-gray-400 truncate">
                                        -
                                    </div>
                                    <div id="now-playing-album" class="text-xs text-gray-500 truncate">
                                        -
                                    </div>
                                </div>

                                <!-- Visualizer -->
                                <canvas id="music-tab-visualizer" class="w-full h-32 bg-black/50 rounded-lg mb-4"></canvas>

                                <!-- Progress -->
                                <div class="mb-4">
                                    <div class="relative h-2 bg-gray-600 rounded-full mb-2 cursor-pointer" id="progress-container">
                                        <div id="music-progress-bar" class="absolute h-full bg-gradient-to-r from-green-500 to-blue-500 rounded-full" style="width: 0%"></div>
                                    </div>
                                    <div class="flex justify-between text-xs text-gray-400">
                                        <span id="music-current-time">0:00</span>
                                        <span id="music-total-time">0:00</span>
                                    </div>
                                </div>

                                <!-- Controls -->
                                <div class="flex justify-center items-center space-x-3 mb-4">
                                    <button id="music-shuffle" class="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-all" title="Shuffle">
                                        🔀
                                    </button>
                                    <button id="music-prev" class="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-all">
                                        ⏮️
                                    </button>
                                    <button id="music-play-pause" class="p-3 bg-green-600 hover:bg-green-700 rounded-lg transition-all text-xl">
                                        ▶️
                                    </button>
                                    <button id="music-next" class="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-all">
                                        ⏭️
                                    </button>
                                    <button id="music-repeat" class="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-all" title="Repeat">
                                        🔁
                                    </button>
                                </div>

                                <!-- Volume -->
                                <div class="flex items-center space-x-2 mb-4">
                                    <span class="text-sm">🔊</span>
                                    <input type="range" id="music-volume" min="0" max="100" value="70" class="flex-1">
                                    <span id="music-volume-display" class="text-sm w-10 text-right">70%</span>
                                </div>

                                <!-- Playback mode -->
                                <div class="bg-gray-900/50 rounded-lg p-3 mb-4">
                                    <div class="text-sm font-semibold text-gray-400 mb-2">Modalità Riproduzione</div>
                                    <div class="space-y-2">
                                        <label class="flex items-center text-sm">
                                            <input type="radio" name="playback-mode" value="sequential" checked class="mr-2">
                                            <span>📋 Sequenziale</span>
                                        </label>
                                        <label class="flex items-center text-sm">
                                            <input type="radio" name="playback-mode" value="shuffle" class="mr-2">
                                            <span>🔀 Casuale</span>
                                        </label>
                                        <label class="flex items-center text-sm">
                                            <input type="radio" name="playback-mode" value="repeat-all" class="mr-2">
                                            <span>🔁 Ripeti tutto</span>
                                        </label>
                                        <label class="flex items-center text-sm">
                                            <input type="radio" name="playback-mode" value="repeat-one" class="mr-2">
                                            <span>🔂 Ripeti uno</span>
                                        </label>
                                    </div>
                                </div>

                                <!-- Light sync mode -->
                                <div class="bg-gray-900/50 rounded-lg p-3">
                                    <div class="text-sm font-semibold text-gray-400 mb-2">Sync Luci</div>
                                    <select id="music-light-mode" class="w-full bg-gray-700 text-white rounded px-2 py-1 text-sm mb-2">
                                        <option value="intelligent">🧠 Intelligente</option>
                                        <option value="beat-sync">🥁 Beat Sync</option>
                                        <option value="ambient">🌊 Ambient</option>
                                        <option value="party">🎉 Party</option>
                                        <option value="par-optimized">💡 PAR Optimized</option>
                                        <option value="moving-head-show">🎯 Moving Head Show</option>
                                        <option value="off">❌ Disattivato</option>
                                    </select>
                                    <div class="space-y-1">
                                        <label class="text-xs text-gray-400">Sensibilità</label>
                                        <input type="range" id="music-sensitivity" min="1" max="10" value="5" class="w-full">
                                    </div>
                                </div>

                                <!-- Current playlist -->
                                <div class="mt-4 pt-4 border-t border-gray-700">
                                    <div class="text-sm font-semibold text-gray-400 mb-2">Playlist Attiva</div>
                                    <div id="active-playlist" class="max-h-40 overflow-y-auto space-y-1 text-xs">
                                        <div class="text-gray-500">Nessuna playlist attiva</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Waveform visualization (full width) -->
                        <div class="mt-6 bg-gray-800/50 rounded-lg p-4">
                            <h3 class="text-lg font-semibold mb-4 text-orange-400">📊 Analisi Audio</h3>
                            <canvas id="music-waveform" class="w-full h-32 bg-black/50 rounded-lg"></canvas>
                            <div class="grid grid-cols-5 gap-4 mt-4 text-xs">
                                <div class="text-center">
                                    <div class="text-gray-400">Bass</div>
                                    <div id="freq-bass" class="text-xl font-bold text-red-400">0%</div>
                                </div>
                                <div class="text-center">
                                    <div class="text-gray-400">Low-Mid</div>
                                    <div id="freq-lowmid" class="text-xl font-bold text-orange-400">0%</div>
                                </div>
                                <div class="text-center">
                                    <div class="text-gray-400">Mid</div>
                                    <div id="freq-mid" class="text-xl font-bold text-yellow-400">0%</div>
                                </div>
                                <div class="text-center">
                                    <div class="text-gray-400">High-Mid</div>
                                    <div id="freq-highmid" class="text-xl font-bold text-green-400">0%</div>
                                </div>
                                <div class="text-center">
                                    <div class="text-gray-400">Treble</div>
                                    <div id="freq-treble" class="text-xl font-bold text-blue-400">0%</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getSettingsTabHTML() {
        return `
            <div class="flex-grow p-4">
                <div class="max-w-4xl">
                    <h2 class="text-2xl font-bold text-blue-400 mb-6">⚙️ Impostazioni</h2>
                    
                    <div class="bg-gray-800/50 rounded-lg p-6 mb-6">
                        <h3 class="text-lg font-semibold mb-4 text-purple-400">⌨️ Scorciatoie da Tastiera</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div class="flex items-center space-x-3">
                                <kbd class="px-2 py-1 bg-gray-700 rounded text-sm font-mono">1-9</kbd>
                                <span>Macro colori (TUTTE le fixture)</span>
                            </div>
                            <div class="flex items-center space-x-3">
                                <kbd class="px-2 py-1 bg-purple-700 rounded text-sm font-mono">A-Z</kbd>
                                <span>Scene custom (assegnabili)</span>
                            </div>
                            <div class="flex items-center space-x-3">
                                <kbd class="px-2 py-1 bg-gray-700 rounded text-sm font-mono">Space</kbd>
                                <span>Tap tempo</span>
                            </div>
                            <div class="flex items-center space-x-3">
                                <kbd class="px-2 py-1 bg-gray-700 rounded text-sm font-mono">B</kbd>
                                <span>Blackout</span>
                            </div>
                            <div class="flex items-center space-x-3">
                                <kbd class="px-2 py-1 bg-gray-700 rounded text-sm font-mono">F</kbd>
                                <span>Full on</span>
                            </div>
                            <div class="flex items-center space-x-3">
                                <kbd class="px-2 py-1 bg-gray-700 rounded text-sm font-mono">S</kbd>
                                <span>Sync beat</span>
                            </div>
                            <div class="flex items-center space-x-3">
                                <kbd class="px-2 py-1 bg-gray-700 rounded text-sm font-mono">Ctrl+S</kbd>
                                <span>Salva scena</span>
                            </div>
                            <div class="flex items-center space-x-3">
                                <kbd class="px-2 py-1 bg-red-700 rounded text-sm font-mono">F1</kbd>
                                <span>Emergency Stop</span>
                            </div>
                            <div class="flex items-center space-x-3">
                                <kbd class="px-2 py-1 bg-orange-700 rounded text-sm font-mono">F2</kbd>
                                <span>Panic Reset</span>
                            </div>
                        </div>
                    </div>

                    <div class="bg-gray-800/50 rounded-lg p-6 mb-6">
                        <h3 class="text-lg font-semibold mb-4 text-green-400">📡 Configurazione DMX</h3>
                        <div class="bg-gray-700/50 rounded-lg p-4 mb-4">
                            <h4 class="text-sm font-semibold mb-2">DMX Refresh Rate</h4>
                            <div class="flex items-center space-x-2">
                                <button onclick="dmxApp.dmxController.setRefreshRate(25)" 
                                        class="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm">40Hz</button>
                                <button onclick="dmxApp.dmxController.setRefreshRate(30)" 
                                        class="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm">33Hz</button>
                                <button onclick="dmxApp.dmxController.setRefreshRate(40)" 
                                        class="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm">25Hz</button>
                            </div>
                            <div class="text-xs text-gray-400 mt-2">
                                Refresh attuale: <span id="dmx-fps">33Hz</span>
                            </div>
                        </div>
                        <div class="bg-gray-900/50 rounded p-4">
                            <h4 class="font-medium mb-2">Stato DMX:</h4>
                            <div class="font-mono text-sm space-y-1 text-green-400">
                                <div>Protocollo: DMX512 (250000 baud, 8N2)</div>
                                <div>Adapter: DSD TECH SH-RS09B USB to DMX</div>
                                <div>Loop continuo per mantenere controllo</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupSceneEventListeners() {
        document.getElementById('save-scene')?.addEventListener('click', 
            () => this.app.sceneManager.saveCurrentScene());
        document.getElementById('save-project')?.addEventListener('click', 
            () => this.app.sceneManager.saveProject());
        document.getElementById('load-project')?.addEventListener('change', 
            (e) => this.app.sceneManager.loadProject(e));
    }

    renderControlPanel() {
        const placeholder = document.getElementById('control-panel-placeholder');
        const panel = document.getElementById('control-panel');
        const fixtureName = document.getElementById('fixture-name');
        const sliders = document.getElementById('channel-sliders');
        const specialFunctions = document.getElementById('special-functions');

        if (!this.app.selectedFixtureId) {
            if (placeholder) placeholder.classList.remove('hidden');
            if (panel) panel.classList.add('hidden');
            return;
        }

        const fixture = this.app.fixtures.find(f => f.id === this.app.selectedFixtureId);
        if (!fixture) return;

        if (placeholder) placeholder.classList.add('hidden');
        if (panel) panel.classList.remove('hidden');
        
        if (fixtureName) fixtureName.textContent = fixture.name;
        if (!sliders) return;

        sliders.innerHTML = '';
        const channelNames = this.app.fixtureManager.getChannelNames(fixture.type);

        for (let i = 0; i < fixture.channels; i++) {
            // Skip function channel for PAR LED (channel 6)
            if (fixture.type === 'par-led' && i === 5) continue;
            
            const value = fixture.values[i];
            const actualChannel = fixture.startChannel + i;
            
            const channelDiv = document.createElement('div');
            channelDiv.className = 'bg-gray-700/50 rounded-lg p-4 text-center min-h-[200px] flex flex-col items-center justify-between';
            channelDiv.innerHTML = `
                <div class="text-xs text-gray-300 mb-2 font-semibold">Ch ${actualChannel}</div>
                <div class="text-xs text-blue-400 mb-3 text-center leading-tight">${channelNames[i] || `Canal ${i + 1}`}</div>
                <div class="flex-1 flex items-center justify-center">
                    <input type="range" 
                           class="h-32 w-6 bg-gray-600 rounded-lg cursor-pointer slider-vertical" 
                           min="0" max="255" 
                           value="${value}"
                           data-channel="${i}"
                           orient="vertical"
                           style="writing-mode: bt-lr; -webkit-appearance: slider-vertical; width: 20px; height: 120px;">
                </div>
                <div class="text-sm font-bold text-white bg-gray-800 px-2 py-1 rounded mt-2">${value}</div>
            `;

            const slider = channelDiv.querySelector('input');
            let sliderTimeout;
            slider.oninput = (e) => {
                const newValue = parseInt(e.target.value);
                fixture.values[i] = newValue;
                channelDiv.querySelector('.text-white').textContent = newValue;
                
                clearTimeout(sliderTimeout);
                sliderTimeout = setTimeout(() => {
                    this.app.dmxController.setChannel(actualChannel, newValue);
                    this.app.fixtureManager.updateFixtureColor(fixture);
                }, 50);
            };

            sliders.appendChild(channelDiv);
        }

        // Add special function controls for PAR LED
        if (fixture.type === 'par-led' && specialFunctions) {
            this.renderPARLEDControls(fixture, specialFunctions);
        }
    }

    renderPARLEDControls(fixture, container) {
        const currentFunction = fixture.values[5] || 0;
        const currentSpeed = fixture.values[6] || 0;
        
        container.innerHTML = `
            <div class="bg-gray-800/50 rounded-lg p-6">
                <h3 class="text-lg font-semibold mb-4 text-orange-400">🎛️ Controlli PAR LED - Canale 6</h3>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    ${this.getPARModeButtons(fixture.id, currentFunction)}
                </div>
                
                <div class="bg-gray-700/50 rounded-lg p-4">
                    <div class="flex justify-between items-center mb-2">
                        <label class="text-sm font-medium text-gray-300">Velocità Effetto (Canale 7)</label>
                        <span class="text-sm font-bold text-white bg-gray-800 px-2 py-1 rounded">${currentSpeed}</span>
                    </div>
                    <input type="range" id="speed-${fixture.id}" min="0" max="255" value="${currentSpeed}" 
                           class="w-full" onchange="dmxApp.uiManager.setPARSpeed(${fixture.id}, this.value)">
                    <div class="flex justify-between text-xs text-gray-400 mt-1">
                        <span>Lento (0)</span>
                        <span>Veloce (255)</span>
                    </div>
                </div>
            </div>
        `;
    }

    getPARModeButtons(fixtureId, currentFunction) {
        const modes = [
            { name: 'off', label: 'OFF', range: '0', value: 0 },
            { name: 'strobe', label: 'STROBO', range: '1-50', value: 25 },
            { name: 'jump', label: 'JUMP', range: '51-100', value: 75 },
            { name: 'gradient', label: 'GRADIENT', range: '101-150', value: 125 },
            { name: 'pulse', label: 'PULSE', range: '151-200', value: 175 },
            { name: 'music', label: 'MUSIC', range: '201-255', value: 225 }
        ];

        return modes.map(mode => `
            <button onclick="dmxApp.uiManager.setPARFunction(${fixtureId}, '${mode.name}')" 
                    class="par-mode-btn bg-gray-600 hover:bg-gray-500 px-4 py-3 rounded-lg text-white transition-all ${currentFunction === mode.value ? 'active' : ''}">
                ${mode.label}<br><span class="text-xs opacity-75">${mode.range}</span>
            </button>
        `).join('');
    }

    setPARFunction(fixtureId, mode) {
        const fixture = this.app.fixtures.find(f => f.id === fixtureId);
        if (!fixture || fixture.type !== 'par-led') return;
        
        const values = {
            'off': 0,
            'strobe': 25,
            'jump': 75,
            'gradient': 125,
            'pulse': 175,
            'music': 225
        };
        
        const value = values[mode] || 0;
        fixture.values[5] = value;
        this.app.dmxController.setChannel(fixture.startChannel + 5, value);
        
        DMXMonitor.add(`[PAR LED] ${fixture.name}: ${mode.toUpperCase()} mode (valore: ${value})`, 'system');
        this.renderControlPanel();
    }

    setPARSpeed(fixtureId, speed) {
        const fixture = this.app.fixtures.find(f => f.id === fixtureId);
        if (!fixture || fixture.type !== 'par-led') return;
        
        fixture.values[6] = parseInt(speed);
        this.app.dmxController.setChannel(fixture.startChannel + 6, parseInt(speed));
        
        DMXMonitor.add(`[PAR LED] ${fixture.name}: velocità ${speed}`, 'system');
        
        const speedDisplay = document.querySelector(`#speed-${fixtureId}`).parentNode.querySelector('.text-white');
        if (speedDisplay) {
            speedDisplay.textContent = speed;
        }
    }

    updateConnectionStatus(connected) {
        const statusIndicator = document.getElementById('status-indicator');
        const statusText = document.getElementById('status-text');
        const connectBtn = document.getElementById('connect-btn');
        
        if (connected) {
            statusIndicator.className = 'w-3 h-3 rounded-full bg-green-500 status-pulse';
            statusText.textContent = 'Connesso';
            statusText.className = 'text-sm font-medium text-green-400';
            connectBtn.innerHTML = '📌 Disconnetti';
            connectBtn.className = 'bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 shadow-md';
        } else {
            statusIndicator.className = 'w-3 h-3 rounded-full bg-red-500 transition-colors duration-300';
            statusText.textContent = 'Disconnesso';
            statusText.className = 'text-sm font-medium text-red-400';
            connectBtn.innerHTML = '📡 Connetti';
            connectBtn.className = 'bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 shadow-md';
        }
    }
}