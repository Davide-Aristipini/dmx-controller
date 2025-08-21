// Chase Manager - Gestione sequenze di scene con tab dedicato
class ChaseManager {
    constructor(app) {
        this.app = app;
        this.chases = [];
        this.activeChase = null;
        this.isPlaying = false;
        this.currentStep = 0;
        this.chaseInterval = null;
        this.bpm = 120;
        this.syncMode = 'manual'; // manual, mic, music
        this.fadeTime = 0;
        this.lastBeatTime = 0;
        this.beatSubscription = null;
        this.direction = 'forward';
        this.loop = true;
        this.bounceDirection = 1;
        this.editingChase = null;
        this.selectedScenes = new Set();
        this.chaseSequence = [];
        this.runtime = 0;
        this.runtimeInterval = null;
        this.beatsReceived = 0;
        
        this.loadChases();
    }

    initializeTab() {
        this.setupTabEventListeners();
        this.renderChaseList();
        this.updateStatistics();
        this.subscribeToBeats();
        this.loadAvailableScenes();
        this.setupChaseShortcuts();  // Aggiungi questa linea
        this.showShortcutHelp();     // Aggiungi questa linea
    }

    // Nuovo metodo per mostrare help delle shortcut
    showShortcutHelp() {
        // Aggiungi un pannello help nella UI
        const helpButton = document.getElementById('chase-help');
        if (helpButton) {
            helpButton.addEventListener('click', () => {
                CustomAlert.show({
                    title: '⌨️ Shortcut Chase',
                    message: `
                        <div class="grid grid-cols-2 gap-3 text-sm">
                            <div><kbd>Space</kbd> Play/Pause</div>
                            <div><kbd>S</kbd> Stop</div>
                            <div><kbd>D/→</kbd> Next Step</div>
                            <div><kbd>A/←</kbd> Previous Step</div>
                            <div><kbd>T</kbd> Tap Tempo</div>
                            <div><kbd>M</kbd> Sync Manuale</div>
                            <div><kbd>I</kbd> Sync Microfono</div>
                            <div><kbd>U</kbd> Sync Music</div>
                            <div><kbd>1-4</kbd> Template Rapidi</div>
                            <div><kbd>Q-P</kbd> Selezione Rapida Chase</div>
                            <div><kbd>+/-</kbd> BPM ±10</div>
                            <div><kbd>* /</kbd> BPM ×2 ÷2</div>
                            <div><kbd>N</kbd> Nuovo Chase</div>
                            <div><kbd>L</kbd> Toggle Loop</div>
                            <div><kbd>F</kbd> Cambia Direzione</div>
                        </div>
                    `,
                    type: 'info',
                    confirmText: 'OK'
                });
            });
        }
    }

    setupChaseShortcuts() {
        // Handler per i tasti quando siamo nel tab Chase
        this.chaseKeyHandler = (e) => {
            // Ignora se stiamo digitando in un input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            // Ignora se non siamo nel tab Chase
            if (this.app.uiManager.currentTab !== 'chase') return;
            
            // Previeni default per tutti i tasti gestiti
            let handled = true;
            
            switch(e.key.toLowerCase()) {
                // Controlli playback
                case ' ':  // Spacebar per Play/Pause
                    e.preventDefault();
                    if (this.isPlaying) {
                        this.pause();
                    } else {
                        this.play();
                    }
                    break;
                    
                case 's':  // Stop
                    if (!e.ctrlKey) {  // Solo se non è Ctrl+S
                        this.stop();
                    }
                    break;
                    
                case 'arrowright':  // Next step
                case 'd':
                    this.nextStep();
                    break;
                    
                case 'arrowleft':  // Previous step
                case 'a':
                    this.previousStep();
                    break;
                    
                // Sync modes
                case 'm':  // Manual
                    this.setSyncMode('manual');
                    break;
                    
                case 'i':  // mIcrofono
                    this.setSyncMode('mic');
                    break;
                    
                case 'u':  // mUsic
                    this.setSyncMode('music');
                    break;
                    
                // Tap tempo
                case 't':  // Tap
                    document.getElementById('chase-tap-tempo-tab')?.click();
                    break;
                    
                // Template rapidi
                case 'z':
                    if (!e.shiftKey) {  // Solo senza Shift per evitare conflitti con macro colori
                        this.createQuickChase('rgb');
                    }
                    break;
                    
                case 'x':
                    if (!e.shiftKey) {
                        this.createQuickChase('strobe');
                    }
                    break;
                    
                case 'c':
                    if (!e.shiftKey) {
                        this.createQuickChase('fade');
                    }
                    break;
                    
                case 'v':
                    if (!e.shiftKey) {
                        this.createQuickChase('random');
                    }
                    break;
                    
                // Selezione chase rapida (Q-P per i primi 10 chase)
                case 'q':
                    this.selectChaseByIndex(0);
                    break;
                case 'w':
                    this.selectChaseByIndex(1);
                    break;
                case 'e':
                    this.selectChaseByIndex(2);
                    break;
                case 'r':
                    this.selectChaseByIndex(3);
                    break;
                case 'y':  // Uso Y invece di T che è per tap
                    this.selectChaseByIndex(4);
                    break;
                case 'p':
                    this.selectChaseByIndex(5);
                    break;
                case 'o':
                    this.selectChaseByIndex(6);
                    break;
                    
                // BPM controls
                case '+':
                case '=':
                    this.handleBPMChange(10);
                    break;
                    
                case '-':
                case '_':
                    this.handleBPMChange(-10);
                    break;
                    
                case '*':
                    // Raddoppia mantenendo la posizione
                    this.setBPM(this.bpm * 2);
                    break;
                    
                case '/':
                    // Dimezza mantenendo la posizione
                    this.setBPM(Math.round(this.bpm / 2));
                    break;

                // Aggiungi anche shortcut per fine tuning del BPM
                case '[':
                    // BPM -1
                    this.setBPM(this.bpm - 1);
                    break;
                    
                case ']':
                    // BPM +1
                    this.setBPM(this.bpm + 1);
                    break;
                    
                // Nuovo chase
                case 'n':
                    if (!e.ctrlKey) {
                        this.startNewChase();
                    }
                    break;
                    
                // Loop toggle
                case 'l':
                    this.toggleLoop();
                    break;
                    
                // Direction change
                case 'f':
                    if (!e.ctrlKey && !e.shiftKey) {  // Evita conflitto con F = full on
                        this.cycleDirection();
                    }
                    break;
                    
                default:
                    handled = false;
            }
            
            if (handled) {
                DMXMonitor.add(`[CHASE] Shortcut: ${e.key.toUpperCase()}`, 'system');
            }
        };
        
        // Aggiungi listener
        document.addEventListener('keydown', this.chaseKeyHandler);
    }

    // Nuovo metodo per selezionare chase per indice
    selectChaseByIndex(index) {
        if (index < this.chases.length) {
            const chase = this.chases[index];
            this.selectChase(chase.id);
            DMXMonitor.add(`[CHASE] Selezionato veloce: ${chase.name}`, 'success');
        }
    }

    // Toggle loop
    toggleLoop() {
        this.loop = !this.loop;
        document.getElementById('chase-loop').value = this.loop ? 'true' : 'once';
        
        if (this.activeChase) {
            this.activeChase.loop = this.loop;
            this.saveChases();
        }
        
        DMXMonitor.add(`[CHASE] Loop: ${this.loop ? 'ON' : 'OFF'}`, 'system');
    }

    // Cycle through directions
    cycleDirection() {
        const directions = ['forward', 'backward', 'bounce', 'random'];
        const currentIndex = directions.indexOf(this.direction);
        const nextIndex = (currentIndex + 1) % directions.length;
        
        this.direction = directions[nextIndex];
        document.getElementById('chase-direction').value = this.direction;
        
        if (this.activeChase) {
            this.activeChase.mode = this.direction;
            this.saveChases();
        }
        
        DMXMonitor.add(`[CHASE] Direzione: ${this.direction}`, 'system');
    }

    // Cleanup quando si lascia il tab
    cleanupChaseShortcuts() {
        if (this.chaseKeyHandler) {
            document.removeEventListener('keydown', this.chaseKeyHandler);
        }
    }

    setupTabEventListeners() {
        // Playback controls
        document.getElementById('chase-play-tab')?.addEventListener('click', () => this.play());
        document.getElementById('chase-pause-tab')?.addEventListener('click', () => this.pause());
        document.getElementById('chase-stop-tab')?.addEventListener('click', () => this.stop());
        document.getElementById('chase-next-tab')?.addEventListener('click', () => this.nextStep());
        document.getElementById('chase-prev')?.addEventListener('click', () => this.previousStep());
        
        // Create new chase
        document.getElementById('create-new-chase')?.addEventListener('click', () => this.startNewChase());
        
        // Tap Tempo
        let tapTimes = [];
        let tapHistory = [];
        document.getElementById('chase-tap-tempo-tab')?.addEventListener('click', () => {
            const now = Date.now();
            tapTimes.push(now);
            
            // Mantieni solo ultimi 8 tap
            if (tapTimes.length > 8) tapTimes.shift();
            
            if (tapTimes.length >= 2) {
                // Calcola tutti gli intervalli
                const intervals = [];
                for (let i = 1; i < tapTimes.length; i++) {
                    intervals.push(tapTimes[i] - tapTimes[i-1]);
                }
                
                // Rimuovi outliers (intervalli troppo diversi dalla media)
                const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
                const filteredIntervals = intervals.filter(interval => 
                    interval > avgInterval * 0.7 && interval < avgInterval * 1.3
                );
                
                if (filteredIntervals.length > 0) {
                    // Calcola la media filtrata
                    const finalAvg = filteredIntervals.reduce((a, b) => a + b) / filteredIntervals.length;
                    const newBPM = Math.round(60000 / finalAvg);
                    
                    // Smoothing: se abbiamo una storia di BPM, fai una media pesata
                    tapHistory.push(newBPM);
                    if (tapHistory.length > 3) tapHistory.shift();
                    
                    const smoothedBPM = tapHistory.length > 1 
                        ? Math.round(tapHistory.reduce((a, b) => a + b) / tapHistory.length)
                        : newBPM;
                    
                    this.setBPM(smoothedBPM);
                    
                    // Visual feedback
                    const btn = document.getElementById('chase-tap-tempo-tab');
                    if (btn) {
                        btn.classList.add('bg-green-600');
                        setTimeout(() => btn.classList.remove('bg-green-600'), 100);
                    }
                }
            }
            
            // Reset tap times se passano più di 3 secondi
            setTimeout(() => {
                const timeSinceLastTap = Date.now() - now;
                if (timeSinceLastTap >= 3000) {
                    tapTimes = [];
                    tapHistory = [];
                }
            }, 3000);
        });
        
        // BPM manual
        document.getElementById('chase-bpm-tab')?.addEventListener('change', (e) => {
            this.setBPM(parseInt(e.target.value));
        });
        
        // Sync mode buttons
        document.getElementById('sync-manual')?.addEventListener('click', () => this.setSyncMode('manual'));
        document.getElementById('sync-mic')?.addEventListener('click', () => this.setSyncMode('mic'));
        document.getElementById('sync-music')?.addEventListener('click', () => this.setSyncMode('music'));
        
        // Fade Time
        document.getElementById('chase-fade-time-tab')?.addEventListener('input', (e) => {
            this.fadeTime = parseInt(e.target.value);
            document.getElementById('fade-time-display-tab').textContent = 
                this.fadeTime === 0 ? 'Instant' : `${this.fadeTime}ms`;
        });
        
        // Direction
        document.getElementById('chase-direction')?.addEventListener('change', (e) => {
            this.direction = e.target.value;
            if (this.activeChase) {
                this.activeChase.mode = this.direction;
                this.saveChases();
            }
        });
        
        // Loop
        document.getElementById('chase-loop')?.addEventListener('change', (e) => {
            this.loop = e.target.value === 'true';
            if (this.activeChase) {
                this.activeChase.loop = this.loop;
                this.saveChases();
            }
        });
    }

    setSyncMode(mode) {
        this.syncMode = mode;
        
        // Update UI
        document.querySelectorAll('.sync-btn').forEach(btn => {
            btn.classList.remove('bg-green-600', 'active');
            btn.classList.add('bg-gray-600');
        });
        
        const activeBtn = document.getElementById(`sync-${mode}`);
        if (activeBtn) {
            activeBtn.classList.remove('bg-gray-600');
            activeBtn.classList.add('bg-green-600', 'active');
        }
        
        // Update sync status
        const status = document.getElementById('sync-status');
        if (status) {
            switch(mode) {
                case 'manual':
                    status.textContent = 'Manual';
                    status.className = 'text-gray-400';
                    break;
                case 'mic':
                    status.textContent = this.app.audioReactive?.isActive ? 'Mic Active' : 'Mic Ready';
                    status.className = this.app.audioReactive?.isActive ? 'text-green-400' : 'text-yellow-400';
                    break;
                case 'music':
                    status.textContent = this.app.audioPlayer?.isPlaying ? 'Music Playing' : 'Music Ready';
                    status.className = this.app.audioPlayer?.isPlaying ? 'text-green-400' : 'text-yellow-400';
                    break;
            }
        }
        
        // Restart playback if needed
        if (this.isPlaying) {
            this.stop();
            this.play();
        }
        
        DMXMonitor.add(`[CHASE] Sync mode: ${mode}`, 'system');
    }

    subscribeToBeats() {
        // Sottoscrivi ai beat dal music player
        if (this.app.audioPlayer) {
            const originalAnalyze = this.app.audioPlayer.analyzeMusic;
            this.app.audioPlayer.analyzeMusic = function() {
                const analysis = originalAnalyze.call(this);
                if (analysis && analysis.beat && analysis.beat.detected) {
                    if (window.dmxApp && window.dmxApp.chaseManager) {
                        window.dmxApp.chaseManager.onBeatDetected(analysis.beat, 'music');
                    }
                }
                return analysis;
            }.bind(this.app.audioPlayer);
        }
        
        // Sottoscrivi all'audio reactive (microfono)
        if (this.app.audioReactive) {
            const originalDetect = this.app.audioReactive.detectBeat;
            this.app.audioReactive.detectBeat = function(energy) {
                const beat = originalDetect.call(this, energy);
                if (beat && beat.detected) {
                    if (window.dmxApp && window.dmxApp.chaseManager) {
                        window.dmxApp.chaseManager.onBeatDetected(beat, 'mic');
                    }
                }
                return beat;
            }.bind(this.app.audioReactive);
        }
    }

    onBeatDetected(beat, source) {
        this.beatsReceived++;
        document.getElementById('beats-received').textContent = this.beatsReceived;
        
        // Animazione beat indicator
        const indicator = document.getElementById('beat-indicator-tab');
        const bar = document.getElementById('beat-bar-tab');
        
        if (indicator) {
            indicator.classList.add('bg-green-400');
            setTimeout(() => indicator.classList.remove('bg-green-400'), 100);
        }
        
        if (bar) {
            bar.style.width = '100%';
            setTimeout(() => bar.style.width = '0%', 100);
        }
        
        // Avanza chase se in sync mode appropriato
        if (this.isPlaying && this.activeChase) {
            const shouldAdvance = 
                (this.syncMode === 'mic' && source === 'mic') ||
                (this.syncMode === 'music' && source === 'music');
            
            if (shouldAdvance) {
                const now = Date.now();
                if (now - this.lastBeatTime > 200) { // Min 200ms tra step
                    this.nextStep();
                    this.lastBeatTime = now;
                }
            }
        }
    }

    startNewChase() {
        this.editingChase = null;
        this.selectedScenes.clear();
        this.chaseSequence = [];
        
        document.getElementById('chase-editor').classList.remove('hidden');
        document.getElementById('edit-chase-name').value = `Chase ${this.chases.length + 1}`;
        
        this.renderChaseSequence();
    }

    loadAvailableScenes() {
        const container = document.getElementById('available-scenes-tab');
        if (!container) return;
        
        if (this.app.scenes.length === 0) {
            container.innerHTML = '<div class="text-center text-gray-500 p-4">Nessuna scena disponibile</div>';
            return;
        }
        
        container.innerHTML = this.app.scenes.map(scene => `
            <div data-scene-id="${scene.id}" 
                 class="scene-available p-2 bg-gray-700 hover:bg-gray-600 rounded cursor-pointer text-sm mb-1 transition-all">
                <div class="flex justify-between items-center">
                    <span>${scene.name}</span>
                    <span class="text-xs text-gray-400">${scene.fixtures.length} fix</span>
                </div>
            </div>
        `).join('');
        
        // Add click handlers
        container.querySelectorAll('.scene-available').forEach(el => {
            el.addEventListener('click', () => this.toggleSceneSelection(el));
        });
    }

    toggleSceneSelection(element) {
        const sceneId = parseInt(element.dataset.sceneId);
        
        if (this.selectedScenes.has(sceneId)) {
            this.selectedScenes.delete(sceneId);
            element.classList.remove('bg-blue-600', 'selected');
            element.classList.add('bg-gray-700');
        } else {
            this.selectedScenes.add(sceneId);
            element.classList.remove('bg-gray-700');
            element.classList.add('bg-blue-600', 'selected');
        }
    }

    addSelectedScenesToChase() {
        this.selectedScenes.forEach(sceneId => {
            this.chaseSequence.push(sceneId);
        });
        
        // Clear selection
        this.selectedScenes.clear();
        document.querySelectorAll('.scene-available.selected').forEach(el => {
            el.classList.remove('bg-blue-600', 'selected');
            el.classList.add('bg-gray-700');
        });
        
        this.renderChaseSequence();
    }

    removeSelectedFromChase() {
        const container = document.getElementById('chase-sequence-tab');
        const selected = container.querySelectorAll('.sequence-item.selected');
        
        selected.forEach(el => {
            const index = parseInt(el.dataset.index);
            el.remove();
        });
        
        // Rebuild sequence from remaining elements
        this.chaseSequence = Array.from(container.querySelectorAll('.sequence-item'))
            .map(el => parseInt(el.dataset.sceneId));
        
        this.renderChaseSequence();
    }

    clearChaseSequence() {
        this.chaseSequence = [];
        this.renderChaseSequence();
    }

    renderChaseSequence() {
        const container = document.getElementById('chase-sequence-tab');
        if (!container) return;
        
        if (this.chaseSequence.length === 0) {
            container.innerHTML = '<div class="text-center text-gray-500 p-4">Aggiungi scene alla sequenza</div>';
            return;
        }
        
        container.innerHTML = this.chaseSequence.map((sceneId, index) => {
            const scene = this.app.scenes.find(s => s.id === sceneId);
            if (!scene) return '';
            
            return `
                <div data-scene-id="${sceneId}" data-index="${index}"
                     class="sequence-item p-2 bg-gray-700 hover:bg-gray-600 rounded cursor-pointer text-sm mb-1 transition-all">
                    <div class="flex justify-between items-center">
                        <span class="flex items-center">
                            <span class="text-orange-400 mr-2">${index + 1}.</span>
                            ${scene.name}
                        </span>
                        <div class="flex space-x-1">
                            <button onclick="dmxApp.chaseManager.moveStepUp(${index})" 
                                    class="text-xs hover:text-blue-400">↑</button>
                            <button onclick="dmxApp.chaseManager.moveStepDown(${index})" 
                                    class="text-xs hover:text-blue-400">↓</button>
                            <button onclick="dmxApp.chaseManager.removeStep(${index})" 
                                    class="text-xs hover:text-red-400">×</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Add click handlers for selection
        container.querySelectorAll('.sequence-item').forEach(el => {
            el.addEventListener('click', (e) => {
                if (e.target.tagName !== 'BUTTON') {
                    el.classList.toggle('selected');
                    el.classList.toggle('bg-orange-600');
                }
            });
        });
    }

    moveStepUp(index) {
        if (index > 0) {
            [this.chaseSequence[index], this.chaseSequence[index-1]] = 
            [this.chaseSequence[index-1], this.chaseSequence[index]];
            this.renderChaseSequence();
        }
    }

    moveStepDown(index) {
        if (index < this.chaseSequence.length - 1) {
            [this.chaseSequence[index], this.chaseSequence[index+1]] = 
            [this.chaseSequence[index+1], this.chaseSequence[index]];
            this.renderChaseSequence();
        }
    }

    removeStep(index) {
        this.chaseSequence.splice(index, 1);
        this.renderChaseSequence();
    }

    saveEditedChase() {
        const name = document.getElementById('edit-chase-name').value.trim();
        
        if (!name) {
            CustomAlert.error('Inserisci un nome per il chase');
            return;
        }
        
        if (this.chaseSequence.length < 2) {
            CustomAlert.error('Il chase deve avere almeno 2 scene');
            return;
        }
        
        const chase = {
            id: this.editingChase?.id || Date.now(),
            name: name,
            steps: [...this.chaseSequence],
            mode: this.direction,
            loop: this.loop,
            bpm: this.bpm,
            fadeTime: this.fadeTime
        };
        
        if (this.editingChase) {
            const index = this.chases.findIndex(c => c.id === chase.id);
            this.chases[index] = chase;
        } else {
            this.chases.push(chase);
        }
        
        this.saveChases();
        this.renderChaseList();
        this.cancelEdit();
        this.updateStatistics();
        
        DMXMonitor.add(`[CHASE] Salvato: ${name} con ${chase.steps.length} step`, 'success');
    }

    cancelEdit() {
        document.getElementById('chase-editor').classList.add('hidden');
        this.editingChase = null;
        this.selectedScenes.clear();
        this.chaseSequence = [];
    }

    renderChaseList() {
        const container = document.getElementById('chase-list-tab');
        if (!container) return;
        
        if (this.chases.length === 0) {
            container.innerHTML = '<div class="text-center text-gray-500 p-4">Nessun chase salvato</div>';
            return;
        }
        
        container.innerHTML = this.chases.map(chase => `
            <div class="chase-item p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg cursor-pointer transition-all ${chase.id === this.activeChase?.id ? 'ring-2 ring-orange-500' : ''}">
                <div onclick="dmxApp.chaseManager.selectChase(${chase.id})">
                    <div class="flex justify-between items-center mb-1">
                        <span class="font-semibold text-orange-300">${chase.name}</span>
                        <div class="flex space-x-1">
                            <button onclick="event.stopPropagation(); dmxApp.chaseManager.editChase(${chase.id})" 
                                    class="p-1 hover:bg-gray-700 rounded" title="Modifica">
                                ✏️
                            </button>
                            <button onclick="event.stopPropagation(); dmxApp.chaseManager.duplicateChase(${chase.id})" 
                                    class="p-1 hover:bg-gray-700 rounded" title="Duplica">
                                📋
                            </button>
                            <button onclick="event.stopPropagation(); dmxApp.chaseManager.deleteChase(${chase.id})" 
                                    class="p-1 hover:bg-red-600 rounded" title="Elimina">
                                🗑️
                            </button>
                        </div>
                    </div>
                    <div class="text-xs text-gray-400">
                        ${chase.steps.length} step • ${chase.mode} • ${chase.loop ? 'loop' : 'once'} • ${chase.bpm || 120} BPM
                    </div>
                </div>
            </div>
        `).join('');
    }

    selectChase(id) {
        this.activeChase = this.chases.find(c => c.id === id);
        if (!this.activeChase) return;
        
        document.getElementById('active-chase-name-tab').textContent = this.activeChase.name;
        document.getElementById('total-steps-tab').textContent = this.activeChase.steps.length;
        document.getElementById('chase-direction').value = this.activeChase.mode || 'forward';
        document.getElementById('chase-loop').value = this.activeChase.loop ? 'true' : 'once';
        document.getElementById('chase-bpm-tab').value = this.activeChase.bpm || 120;
        
        this.direction = this.activeChase.mode || 'forward';
        this.loop = this.activeChase.loop !== false;
        this.bpm = this.activeChase.bpm || 120;
        this.currentStep = 0;
        
        this.updateStepIndicator();
        this.renderChaseList();
        this.renderStepIndicators();
        this.updatePreview();
        
        DMXMonitor.add(`[CHASE] Selezionato: ${this.activeChase.name}`, 'system');
    }

    renderStepIndicators() {
        const container = document.getElementById('step-indicators');
        if (!container || !this.activeChase) return;
        
        container.innerHTML = '';
        
        for (let i = 0; i < this.activeChase.steps.length; i++) {
            const indicator = document.createElement('div');
            indicator.className = 'w-2 h-2 rounded-full bg-gray-600 transition-all';
            indicator.id = `step-indicator-${i}`;
            container.appendChild(indicator);
        }
        
        this.updateStepIndicator();
    }

    updateStepIndicator() {
        document.getElementById('current-step-tab').textContent = this.currentStep + 1;
        
        // Update progress bar
        const progress = document.getElementById('chase-progress');
        if (progress && this.activeChase) {
            const percent = ((this.currentStep + 1) / this.activeChase.steps.length) * 100;
            progress.style.width = `${percent}%`;
        }
        
        // Update step indicators
        document.querySelectorAll('[id^="step-indicator-"]').forEach((el, index) => {
            if (index === this.currentStep) {
                el.classList.add('bg-orange-500', 'scale-150');
                el.classList.remove('bg-gray-600');
            } else {
                el.classList.remove('bg-orange-500', 'scale-150');
                el.classList.add('bg-gray-600');
            }
        });
        
        this.updatePreview();
    }

    updatePreview() {
        const container = document.getElementById('chase-preview');
        if (!container || !this.activeChase) return;
        
        const currentSceneId = this.activeChase.steps[this.currentStep];
        const currentScene = this.app.scenes.find(s => s.id === currentSceneId);
        
        if (!currentScene) return;
        
        container.innerHTML = `
            <div class="bg-gray-900/50 rounded p-3">
                <div class="text-sm font-semibold text-cyan-300 mb-2">Step ${this.currentStep + 1}: ${currentScene.name}</div>
                <div class="grid grid-cols-3 gap-2 text-xs">
                    ${currentScene.fixtures.slice(0, 6).map(f => {
                        const fixture = this.app.fixtures.find(fix => fix.id === f.id);
                        if (!fixture) return '';
                        
                        const dimmerIndex = fixture.type === 'moving-head' ? 6 : 0;
                        const dimmer = f.values[dimmerIndex];
                        
                        return `
                            <div class="bg-gray-800 rounded p-1 text-center">
                                <div class="truncate">${fixture.name}</div>
                                <div class="text-orange-400">${Math.round(dimmer/255*100)}%</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
            
            <div class="mt-2 text-xs text-gray-400">
                Prossimo: ${this.getNextSceneName()}
            </div>
        `;
    }

    getNextSceneName() {
        if (!this.activeChase) return '-';
        
        let nextIndex = this.currentStep;
        
        switch (this.direction) {
            case 'forward':
                nextIndex = (this.currentStep + 1) % this.activeChase.steps.length;
                break;
            case 'backward':
                nextIndex = this.currentStep - 1;
                if (nextIndex < 0) nextIndex = this.activeChase.steps.length - 1;
                break;
            case 'bounce':
                if (this.bounceDirection > 0) {
                    nextIndex = this.currentStep + 1;
                    if (nextIndex >= this.activeChase.steps.length) {
                        nextIndex = this.activeChase.steps.length - 2;
                    }
                } else {
                    nextIndex = this.currentStep - 1;
                    if (nextIndex < 0) nextIndex = 1;
                }
                break;
            case 'random':
                return 'Casuale';
        }
        
        const nextSceneId = this.activeChase.steps[nextIndex];
        const nextScene = this.app.scenes.find(s => s.id === nextSceneId);
        
        return nextScene ? nextScene.name : '-';
    }

    play() {
        if (!this.activeChase) {
            CustomAlert.alert('Seleziona un chase prima di avviare');
            return;
        }
        
        this.isPlaying = true;
        this.lastStepTime = Date.now(); // Aggiungi questo
        this.updatePlaybackButtons();
        
        // Start runtime counter
        if (!this.runtimeInterval) {
            this.runtimeInterval = setInterval(() => {
                this.runtime++;
                this.updateRuntimeDisplay();
            }, 1000);
        }
        
        if (this.syncMode === 'manual') {
            // Timer-based playback
            const interval = 60000 / this.bpm;
            this.chaseInterval = setInterval(() => {
                this.nextStep();
                this.lastStepTime = Date.now(); // Aggiungi questo
            }, interval);
            DMXMonitor.add(`[CHASE] Play manuale a ${this.bpm} BPM`, 'success');
        } else {
            DMXMonitor.add(`[CHASE] Play in sync con ${this.syncMode}`, 'success');
        }
    }

    pause() {
        this.isPlaying = false;
        
        if (this.chaseInterval) {
            clearInterval(this.chaseInterval);
            this.chaseInterval = null;
        }
        
        if (this.runtimeInterval) {
            clearInterval(this.runtimeInterval);
            this.runtimeInterval = null;
        }
        
        this.updatePlaybackButtons();
        DMXMonitor.add('[CHASE] Pausa', 'system');
    }

    stop() {
        this.isPlaying = false;
        this.currentStep = 0;
        
        if (this.chaseInterval) {
            clearInterval(this.chaseInterval);
            this.chaseInterval = null;
        }
        
        if (this.runtimeInterval) {
            clearInterval(this.runtimeInterval);
            this.runtimeInterval = null;
        }
        
        this.updateStepIndicator();
        this.updatePlaybackButtons();
        DMXMonitor.add('[CHASE] Stop', 'system');
    }

    animateStepTransition() {
        const progress = document.getElementById('chase-progress');
        if (progress) {
            progress.style.transition = `width ${60000 / this.bpm}ms linear`;
        }
        
        // Anima l'indicatore del beat
        const indicator = document.getElementById(`step-indicator-${this.currentStep}`);
        if (indicator) {
            indicator.classList.add('beat-flash');
            setTimeout(() => indicator.classList.remove('beat-flash'), 200);
        }
    }

    // Aggiungi supporto per accelerazione/decelerazione graduale con i tasti +/-
    handleBPMChange(delta) {
        // Cambio proporzionale: più veloce è il BPM, più grande è il cambio
        const change = delta > 0 
            ? Math.max(1, Math.round(this.bpm * 0.1))  // +10% 
            : Math.min(-1, -Math.round(this.bpm * 0.1)); // -10%
        
        this.setBPM(this.bpm + change);
    }

    nextStep() {
        if (!this.activeChase) return;
        
        const chase = this.activeChase;
        let prevStep = this.currentStep;
        
        // Calcola prossimo step basato su modalità
        switch (this.direction) {
            case 'forward':
                this.currentStep++;
                if (this.currentStep >= chase.steps.length) {
                    if (this.loop) {
                        this.currentStep = 0;
                    } else {
                        this.stop();
                        return;
                    }
                }
                break;
                
            case 'backward':
                this.currentStep--;
                if (this.currentStep < 0) {
                    if (this.loop) {
                        this.currentStep = chase.steps.length - 1;
                    } else {
                        this.stop();
                        return;
                    }
                }
                break;
                
            case 'bounce':
                this.currentStep += this.bounceDirection;
                
                if (this.currentStep >= chase.steps.length) {
                    this.currentStep = chase.steps.length - 2;
                    this.bounceDirection = -1;
                } else if (this.currentStep < 0) {
                    this.currentStep = 1;
                    this.bounceDirection = 1;
                }
                break;
                
            case 'random':
                do {
                    this.currentStep = Math.floor(Math.random() * chase.steps.length);
                } while (this.currentStep === prevStep && chase.steps.length > 1);
                break;
        }
        
        // Carica la scena
        const sceneId = chase.steps[this.currentStep];
        if (sceneId) {
            if (this.fadeTime > 0) {
                this.fadeToScene(sceneId);
            } else {
                this.app.sceneManager.loadScene(sceneId);
            }
        }
        
        // Aggiorna indicatori con animazione smooth
        this.updateStepIndicator();
        this.animateStepTransition();
    }


    previousStep() {
        if (!this.activeChase) return;
        
        // Inverti temporaneamente la direzione
        const originalDirection = this.direction;
        
        if (this.direction === 'forward') {
            this.direction = 'backward';
        } else if (this.direction === 'backward') {
            this.direction = 'forward';
        }
        
        this.nextStep();
        
        this.direction = originalDirection;
    }

    fadeToScene(sceneId) {
        const scene = this.app.scenes.find(s => s.id === sceneId);
        if (!scene) return;
        
        const startTime = Date.now();
        const duration = this.fadeTime;
        
        // Cattura stato iniziale
        const startState = this.app.fixtures.map(f => ({
            id: f.id,
            values: [...f.values]
        }));
        
        // Cattura stato finale dalla scena
        const endState = scene.fixtures.map(sf => ({
            id: sf.id,
            values: [...sf.values]
        }));
        
        const fade = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            this.app.fixtures.forEach(fixture => {
                const start = startState.find(s => s.id === fixture.id);
                const end = endState.find(e => e.id === fixture.id);
                
                if (start && end) {
                    for (let i = 0; i < fixture.values.length; i++) {
                        const startVal = start.values[i] || 0;
                        const endVal = end.values[i] || 0;
                        const currentVal = Math.floor(startVal + (endVal - startVal) * progress);
                        
                        fixture.values[i] = currentVal;
                        this.app.dmxController.setChannel(fixture.startChannel + i, currentVal);
                    }
                    this.app.fixtureManager.updateFixtureColor(fixture);
                }
            });
            
            if (progress < 1) {
                requestAnimationFrame(fade);
            } else {
                this.app.uiManager.renderControlPanel();
            }
        };
        
        fade();
    }

    updatePlaybackButtons() {
        const playBtn = document.getElementById('chase-play-tab');
        const pauseBtn = document.getElementById('chase-pause-tab');
        
        if (this.isPlaying) {
            playBtn?.classList.add('opacity-50');
            pauseBtn?.classList.remove('opacity-50');
        } else {
            playBtn?.classList.remove('opacity-50');
            pauseBtn?.classList.add('opacity-50');
        }
    }

    setBPM(value) {
        const oldBPM = this.bpm;
        this.bpm = Math.max(30, Math.min(300, value));
        document.getElementById('chase-bpm-tab').value = this.bpm;
        
        if (this.activeChase) {
            this.activeChase.bpm = this.bpm;
            this.saveChases();
        }
        
        // Se stiamo riproducendo in modalità manuale, aggiusta il timing senza fermare
        if (this.isPlaying && this.syncMode === 'manual') {
            this.adjustPlaybackSpeed();
        }
        
        DMXMonitor.add(`[CHASE] BPM: ${this.bpm} (da ${oldBPM})`, 'system');
    }

    // Nuovo metodo per aggiustare la velocità senza ripartire
    adjustPlaybackSpeed() {
        // Cancella il vecchio interval
        if (this.chaseInterval) {
            clearInterval(this.chaseInterval);
        }
        
        // Calcola il nuovo interval
        const interval = 60000 / this.bpm;
        
        // Calcola quanto tempo è passato dall'ultimo step
        const now = Date.now();
        const timeSinceLastStep = this.lastStepTime ? now - this.lastStepTime : 0;
        
        // Se siamo già oltre il nuovo interval, avanza subito
        if (timeSinceLastStep >= interval) {
            this.nextStep();
            this.lastStepTime = now;
            
            // Poi continua con il nuovo timing
            this.chaseInterval = setInterval(() => {
                this.nextStep();
                this.lastStepTime = Date.now();
            }, interval);
        } else {
            // Altrimenti, aspetta il tempo rimanente prima del prossimo step
            const remainingTime = interval - timeSinceLastStep;
            
            setTimeout(() => {
                this.nextStep();
                this.lastStepTime = Date.now();
                
                // Poi continua con il nuovo timing
                this.chaseInterval = setInterval(() => {
                    this.nextStep();
                    this.lastStepTime = Date.now();
                }, interval);
            }, remainingTime);
        }
        
        DMXMonitor.add(`[CHASE] Velocità aggiustata senza interruzione`, 'success');
    }

    editChase(id) {
        const chase = this.chases.find(c => c.id === id);
        if (!chase) return;
        
        this.editingChase = chase;
        this.chaseSequence = [...chase.steps];
        
        document.getElementById('chase-editor').classList.remove('hidden');
        document.getElementById('edit-chase-name').value = chase.name;
        
        this.renderChaseSequence();
    }

    duplicateChase(id) {
        const chase = this.chases.find(c => c.id === id);
        if (!chase) return;
        
        const newChase = {
            ...chase,
            id: Date.now(),
            name: chase.name + ' (copia)',
            steps: [...chase.steps]
        };
        
        this.chases.push(newChase);
        this.saveChases();
        this.renderChaseList();
        this.updateStatistics();
        
        DMXMonitor.add(`[CHASE] Duplicato: ${newChase.name}`, 'success');
    }

    deleteChase(id) {
        const chase = this.chases.find(c => c.id === id);
        if (!chase) return;
        
        CustomAlert.confirm(`Eliminare il chase "${chase.name}"?`, () => {
            this.chases = this.chases.filter(c => c.id !== id);
            
            if (this.activeChase?.id === id) {
                this.stop();
                this.activeChase = null;
                document.getElementById('active-chase-name-tab').textContent = 'Nessuno';
                document.getElementById('chase-preview').innerHTML = `
                    <div class="text-center text-gray-500 py-8">
                        <div class="text-4xl mb-2">🎬</div>
                        <p>Seleziona un chase per vedere l'anteprima</p>
                    </div>
                `;
            }
            
            this.saveChases();
            this.renderChaseList();
            this.updateStatistics();
            
            DMXMonitor.add(`[CHASE] Eliminato: ${chase.name}`, 'system');
        });
    }

    createQuickChase(type) {
        // Prima generiamo le scene necessarie per il template
        const generatedScenes = this.generateTemplateScenes(type);
        
        if (generatedScenes.length === 0) {
            CustomAlert.error('Impossibile creare il template: nessuna fixture trovata');
            return;
        }
        
        // Salva le scene generate
        generatedScenes.forEach(scene => {
            this.app.scenes.push(scene);
        });
        this.app.sceneManager.renderScenes();
        this.app.saveToStorage();
        
        // Ora crea il chase con le scene generate
        let chase;
        const timestamp = Date.now();
        const sceneIds = generatedScenes.map(s => s.id);
        
        switch(type) {
            case 'rgb':
                chase = {
                    id: timestamp,
                    name: '🌈 RGB Cycle',
                    steps: sceneIds,
                    mode: 'forward',
                    loop: true,
                    bpm: 120,
                    fadeTime: 500
                };
                break;
                
            case 'strobe':
                chase = {
                    id: timestamp,
                    name: '⚡ Strobe Effect',
                    steps: sceneIds,
                    mode: 'forward',
                    loop: true,
                    bpm: 480,  // Veloce per strobo
                    fadeTime: 0
                };
                break;
                
            case 'fade':
                chase = {
                    id: timestamp,
                    name: '🌅 Fade In/Out',
                    steps: sceneIds,
                    mode: 'bounce',
                    loop: true,
                    bpm: 60,
                    fadeTime: 2000
                };
                break;
                
            case 'random':
                chase = {
                    id: timestamp,
                    name: '🎲 Random Mix',
                    steps: sceneIds,
                    mode: 'random',
                    loop: true,
                    bpm: 90,
                    fadeTime: 300
                };
                break;
        }
        
        if (chase) {
            this.chases.push(chase);
            this.saveChases();
            this.renderChaseList();
            this.selectChase(chase.id);
            this.updateStatistics();
            
            DMXMonitor.add(`[CHASE] Template "${chase.name}" creato con ${sceneIds.length} scene`, 'success');
        }
    }

    killAllStrobes() {
        this.app.fixtures.forEach(fixture => {
            if (fixture.type === 'moving-head') {
                fixture.values[7] = 0;  // Strobe OFF
                this.app.dmxController.setChannel(fixture.startChannel + 7, 0);
            } else if (fixture.type === 'par-led') {
                fixture.values[5] = 0;  // Function OFF
                fixture.values[6] = 0;  // Speed 0
                this.app.dmxController.setChannel(fixture.startChannel + 5, 0);
                this.app.dmxController.setChannel(fixture.startChannel + 6, 0);
            } else if (fixture.type === 'par' && fixture.channels > 7) {
                fixture.values[7] = 0;  // Strobe OFF
                this.app.dmxController.setChannel(fixture.startChannel + 7, 0);
            }
        });
        
        DMXMonitor.add('[CHASE] Tutti gli strobo disattivati', 'warning');
    }

    generateTemplateScenes(type) {
        const scenes = [];
        const timestamp = Date.now();
        
        // Prendi tutte le fixture
        const fixtures = this.app.fixtures;
        if (fixtures.length === 0) return [];
        
        switch(type) {
            case 'rgb':
                // Crea 7 scene con colori dell'arcobaleno
                const colors = [
                    { name: 'Rosso', r: 255, g: 0, b: 0 },
                    { name: 'Arancione', r: 255, g: 127, b: 0 },
                    { name: 'Giallo', r: 255, g: 255, b: 0 },
                    { name: 'Verde', r: 0, g: 255, b: 0 },
                    { name: 'Ciano', r: 0, g: 255, b: 255 },
                    { name: 'Blu', r: 0, g: 0, b: 255 },
                    { name: 'Viola', r: 255, g: 0, b: 255 }
                ];
                
                colors.forEach((color, index) => {
                    const scene = {
                        id: timestamp + index,
                        name: `RGB - ${color.name}`,
                        fixtures: fixtures.map(fixture => {
                            const fixtureData = {
                                id: fixture.id,
                                values: new Array(fixture.channels).fill(0)
                            };
                            
                            // Imposta i valori per ogni tipo di fixture
                            if (fixture.type === 'moving-head') {
                                // Posizione centrale
                                fixtureData.values[0] = 128;  // Pan
                                fixtureData.values[2] = 100;  // Tilt
                                fixtureData.values[5] = 50;   // Speed
                                // Dimmer
                                fixtureData.values[6] = 255;
                                // IMPORTANTE: Disattiva strobo
                                fixtureData.values[7] = 0;    // Strobe OFF
                                // RGB Front
                                fixtureData.values[8] = color.r;
                                fixtureData.values[9] = color.g;
                                fixtureData.values[10] = color.b;
                                // RGB Back
                                fixtureData.values[12] = color.r;
                                fixtureData.values[13] = color.g;
                                fixtureData.values[14] = color.b;
                            } else if (fixture.type === 'par-led') {
                                // Master Dimmer
                                fixtureData.values[0] = 255;
                                // RGB
                                fixtureData.values[1] = color.r;
                                fixtureData.values[2] = color.g;
                                fixtureData.values[3] = color.b;
                                // IMPORTANTE: Disattiva function mode
                                fixtureData.values[5] = 0;    // Function OFF
                                fixtureData.values[6] = 0;    // Speed 0
                            } else if (fixture.type === 'par') {
                                // Dimmer
                                fixtureData.values[0] = 255;
                                // RGB
                                fixtureData.values[1] = color.r;
                                fixtureData.values[2] = color.g;
                                fixtureData.values[3] = color.b;
                                // IMPORTANTE: Disattiva strobo se presente
                                if (fixture.channels > 7) {
                                    fixtureData.values[7] = 0; // Strobe OFF
                                }
                            }
                            
                            return fixtureData;
                        }),
                        timestamp: new Date().toISOString()
                    };
                    scenes.push(scene);
                });
                break;
                
            case 'strobe':
                // Crea 2 scene: ON e OFF per effetto strobo
                const strobeStates = [
                    { name: 'ON', intensity: 255, strobe: true },
                    { name: 'OFF', intensity: 0, strobe: false }
                ];
                
                strobeStates.forEach((state, index) => {
                    const scene = {
                        id: timestamp + index,
                        name: `Strobe - ${state.name}`,
                        fixtures: fixtures.map(fixture => {
                            const fixtureData = {
                                id: fixture.id,
                                values: new Array(fixture.channels).fill(0)
                            };
                            
                            if (fixture.type === 'moving-head') {
                                if (state.strobe) {
                                    // Stato ON - Luce bianca con strobo
                                    fixtureData.values[0] = 128;  // Pan center
                                    fixtureData.values[2] = 100;  // Tilt center
                                    fixtureData.values[6] = 255;  // Dimmer
                                    fixtureData.values[7] = 200;  // Strobe FAST
                                    fixtureData.values[8] = 255;  // R Front
                                    fixtureData.values[9] = 255;  // G Front
                                    fixtureData.values[10] = 255; // B Front
                                    fixtureData.values[12] = 255; // R Back
                                    fixtureData.values[13] = 255; // G Back
                                    fixtureData.values[14] = 255; // B Back
                                } else {
                                    // Stato OFF - Tutto spento incluso strobo
                                    fixtureData.values[7] = 0;    // IMPORTANTE: Strobe OFF
                                }
                            } else if (fixture.type === 'par-led') {
                                if (state.strobe) {
                                    // Stato ON con funzione strobo
                                    fixtureData.values[0] = 255;  // Dimmer
                                    fixtureData.values[1] = 255;  // R
                                    fixtureData.values[2] = 255;  // G
                                    fixtureData.values[3] = 255;  // B
                                    fixtureData.values[5] = 25;   // Function: Strobe
                                    fixtureData.values[6] = 200;  // Speed: Fast
                                } else {
                                    // Stato OFF - Tutto spento
                                    fixtureData.values[5] = 0;    // IMPORTANTE: Function OFF
                                    fixtureData.values[6] = 0;    // Speed 0
                                }
                            } else if (fixture.type === 'par') {
                                if (state.strobe) {
                                    fixtureData.values[0] = 255;  // Dimmer
                                    fixtureData.values[1] = 255;  // R
                                    fixtureData.values[2] = 255;  // G
                                    fixtureData.values[3] = 255;  // B
                                    if (fixture.channels > 7) {
                                        fixtureData.values[7] = 200; // Strobe ON
                                    }
                                } else {
                                    // Stato OFF
                                    if (fixture.channels > 7) {
                                        fixtureData.values[7] = 0; // IMPORTANTE: Strobe OFF
                                    }
                                }
                            }
                            
                            return fixtureData;
                        }),
                        timestamp: new Date().toISOString()
                    };
                    scenes.push(scene);
                });
                break;
                
            case 'fade':
                // Crea 5 scene con intensità crescente
                const fadeSteps = [0, 25, 50, 75, 100];
                const fadeColors = [
                    { r: 255, g: 100, b: 50 },   // Warm amber
                    { r: 255, g: 200, b: 100 },  // Warm white
                    { r: 255, g: 255, b: 255 },  // White
                    { r: 100, g: 200, b: 255 },  // Cool white
                    { r: 50, g: 100, b: 255 }    // Cool blue
                ];
                
                fadeSteps.forEach((intensity, index) => {
                    const color = fadeColors[index];
                    const scene = {
                        id: timestamp + index,
                        name: `Fade - ${intensity}%`,
                        fixtures: fixtures.map(fixture => {
                            const fixtureData = {
                                id: fixture.id,
                                values: new Array(fixture.channels).fill(0)
                            };
                            
                            const dimValue = Math.floor((intensity / 100) * 255);
                            const r = Math.floor((color.r * intensity) / 100);
                            const g = Math.floor((color.g * intensity) / 100);
                            const b = Math.floor((color.b * intensity) / 100);
                            
                            if (fixture.type === 'moving-head') {
                                fixtureData.values[0] = 128 + Math.sin(index * 0.5) * 50;
                                fixtureData.values[2] = 100 + Math.cos(index * 0.5) * 30;
                                fixtureData.values[5] = 20; // Velocità lenta
                                fixtureData.values[6] = dimValue;
                                fixtureData.values[7] = 0;  // IMPORTANTE: No strobo
                                fixtureData.values[8] = r;
                                fixtureData.values[9] = g;
                                fixtureData.values[10] = b;
                                fixtureData.values[12] = r;
                                fixtureData.values[13] = g;
                                fixtureData.values[14] = b;
                            } else if (fixture.type === 'par-led') {
                                fixtureData.values[0] = dimValue;
                                fixtureData.values[1] = r;
                                fixtureData.values[2] = g;
                                fixtureData.values[3] = b;
                                fixtureData.values[5] = 0;  // IMPORTANTE: Function OFF
                                fixtureData.values[6] = 0;  // Speed 0
                            } else if (fixture.type === 'par') {
                                fixtureData.values[0] = dimValue;
                                fixtureData.values[1] = r;
                                fixtureData.values[2] = g;
                                fixtureData.values[3] = b;
                                if (fixture.channels > 7) {
                                    fixtureData.values[7] = 0; // IMPORTANTE: Strobe OFF
                                }
                            }
                            
                            return fixtureData;
                        }),
                        timestamp: new Date().toISOString()
                    };
                    scenes.push(scene);
                });
                break;
                
            case 'random':
                // Crea 8 scene con colori e posizioni casuali
                for (let i = 0; i < 8; i++) {
                    const scene = {
                        id: timestamp + i,
                        name: `Random - Pattern ${i + 1}`,
                        fixtures: fixtures.map((fixture, fixIndex) => {
                            const fixtureData = {
                                id: fixture.id,
                                values: new Array(fixture.channels).fill(0)
                            };
                            
                            // Colori casuali ma coordinati
                            const hue = (i * 45 + fixIndex * 90) % 360;
                            const rgb = this.hslToRgb(hue / 360, 1, 0.5);
                            
                            if (fixture.type === 'moving-head') {
                                fixtureData.values[0] = Math.floor(Math.sin(i + fixIndex) * 127 + 128);
                                fixtureData.values[2] = Math.floor(Math.cos(i * 2 + fixIndex) * 64 + 100);
                                fixtureData.values[5] = 100; // Velocità media
                                fixtureData.values[6] = 255; // Dimmer
                                fixtureData.values[7] = 0;   // IMPORTANTE: No strobo
                                fixtureData.values[8] = rgb[0];
                                fixtureData.values[9] = rgb[1];
                                fixtureData.values[10] = rgb[2];
                                fixtureData.values[12] = rgb[0];
                                fixtureData.values[13] = rgb[1];
                                fixtureData.values[14] = rgb[2];
                            } else if (fixture.type === 'par-led') {
                                fixtureData.values[0] = 255;
                                fixtureData.values[1] = rgb[0];
                                fixtureData.values[2] = rgb[1];
                                fixtureData.values[3] = rgb[2];
                                // Effetti casuali SOLO su alcune scene, non tutte
                                if (i % 4 === 0) {
                                    fixtureData.values[5] = 75;  // Jump mode solo ogni 4 scene
                                    fixtureData.values[6] = 150; // Velocità media
                                } else {
                                    fixtureData.values[5] = 0;   // IMPORTANTE: Function OFF per le altre
                                    fixtureData.values[6] = 0;   // Speed 0
                                }
                            } else if (fixture.type === 'par') {
                                fixtureData.values[0] = 255;
                                fixtureData.values[1] = rgb[0];
                                fixtureData.values[2] = rgb[1];
                                fixtureData.values[3] = rgb[2];
                                if (fixture.channels > 7) {
                                    fixtureData.values[7] = 0; // IMPORTANTE: Strobe OFF
                                }
                            }
                            
                            return fixtureData;
                        }),
                        timestamp: new Date().toISOString()
                    };
                    scenes.push(scene);
                }
                break;
        }
        
        return scenes;
    }

    // Utility function per conversione HSL to RGB
    hslToRgb(h, s, l) {
        let r, g, b;

        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }

        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }

    updateStatistics() {
        document.getElementById('total-chases').textContent = this.chases.length;
        
        const uniqueScenes = new Set();
        this.chases.forEach(chase => {
            chase.steps.forEach(step => uniqueScenes.add(step));
        });
        document.getElementById('total-scenes-used').textContent = uniqueScenes.size;
    }

    updateRuntimeDisplay() {
        const minutes = Math.floor(this.runtime / 60);
        const seconds = this.runtime % 60;
        document.getElementById('runtime-time').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    saveChases() {
        try {
            localStorage.setItem('dmxChases', JSON.stringify(this.chases));
        } catch (e) {
            console.error('Errore salvataggio chase:', e);
        }
    }

    loadChases() {
        try {
            const saved = localStorage.getItem('dmxChases');
            if (saved) {
                this.chases = JSON.parse(saved);
                DMXMonitor.add(`[CHASE] Caricati ${this.chases.length} chase`, 'system');
            }
        } catch (e) {
            console.error('Errore caricamento chase:', e);
            this.chases = [];
        }
    }
}