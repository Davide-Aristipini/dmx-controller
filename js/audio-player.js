// Enhanced Audio Player with library management
class AudioPlayer {
    constructor(app) {
        this.app = app;
        this.audioContext = null;
        this.analyser = null;
        this.source = null;
        this.audioElement = null;
        this.library = [];
        this.playlist = [];
        this.currentTrackIndex = 0;
        this.isPlaying = false;
        this.beatDetector = new BeatDetectorAdvanced();
        this.playbackMode = 'sequential'; // sequential, shuffle, repeat-all, repeat-one
        this.shuffleOrder = [];
        this.sensitivity = 5;
        this.lightMode = 'intelligent';
        this.parSmoothing = new ParSmoothing();
        
        // Create audio element
        this.audioElement = document.createElement('audio');
        this.audioElement.id = 'hidden-audio-player';
        document.body.appendChild(this.audioElement);
        
        // Bind methods
        this.dataArray = null;
        this.visualizerCanvas = null;
        this.visualizerCtx = null;
        this.musicTabCanvas = null;
        this.musicTabCtx = null;
        this.waveformCanvas = null;
        this.waveformCtx = null;
    }

    initialize() {
        this.createPlayerUI();
        this.setupEventListeners();
        this.setupVisualizer();
    }

    initializeMusicTab() {
        this.setupMusicTabEventListeners();
        this.setupMusicTabVisualizers();
        this.loadLibraryFromStorage();
        this.renderLibrary();
        this.updateLibraryStats();
    }

    createPlayerUI() {
        const existingPlayer = document.getElementById('audio-player-section');
        if (existingPlayer) {
            existingPlayer.remove();
        }

        const audioReactiveSection = document.querySelector('.bg-gray-700\\/50.rounded-lg.p-4');
        if (audioReactiveSection) {
            const playerHTML = `
                <div id="audio-player-section" class="bg-gray-700/50 rounded-lg p-4 mt-4">
                    <h3 class="text-md font-semibold mb-3 text-purple-400">🎵 Music Player</h3>
                    
                    <label class="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-3 rounded-lg transition-all duration-200 font-medium text-sm cursor-pointer block text-center mb-3">
                        📁 Carica Playlist
                        <input type="file" id="playlist-input" class="hidden" accept="audio/*" multiple>
                    </label>
                    
                    <div id="current-track" class="text-xs text-gray-400 mb-2 truncate">
                        Nessuna traccia caricata
                    </div>
                    
                    <div class="relative h-2 bg-gray-600 rounded-full mb-3">
                        <div id="progress-bar" class="absolute h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" style="width: 0%"></div>
                    </div>
                    
                    <div class="flex justify-between text-xs text-gray-400 mb-3">
                        <span id="current-time">0:00</span>
                        <span id="total-time">0:00</span>
                    </div>
                    
                    <div class="flex justify-center space-x-2 mb-3">
                        <button id="prev-track" class="p-2 bg-gray-600 hover:bg-gray-500 rounded transition-all">⏮️</button>
                        <button id="play-pause" class="p-2 bg-green-600 hover:bg-green-700 rounded transition-all">▶️</button>
                        <button id="next-track" class="p-2 bg-gray-600 hover:bg-gray-500 rounded transition-all">⏭️</button>
                    </div>
                    
                    <div class="flex items-center space-x-2 mb-3">
                        <span class="text-xs">🔊</span>
                        <input type="range" id="volume-slider" min="0" max="100" value="70" class="flex-1">
                        <span id="volume-display" class="text-xs w-8">70%</span>
                    </div>
                    
                    <select id="player-mode" class="w-full bg-gray-700 text-white rounded px-2 py-1 text-sm mb-2">
                        <option value="intelligent">Intelligente</option>
                        <option value="beat-sync">Beat Sync</option>
                        <option value="ambient">Ambient</option>
                        <option value="party">Party</option>
                        <option value="par-optimized">PAR Optimized</option>
                        <option value="moving-head-show">Moving Head Show</option>
                        <option value="off">Disattivato</option>
                    </select>
                    
                    <div class="space-y-1">
                        <label class="text-xs text-gray-400 flex justify-between">
                            <span>Intensità Effetti</span>
                            <span id="effect-intensity-value" class="text-purple-400">5</span>
                        </label>
                        <input type="range" id="effect-intensity" min="1" max="10" value="5" class="w-full">
                    </div>
                    
                    <canvas id="player-visualizer" class="w-full h-16 bg-black/50 rounded mt-3"></canvas>
                    
                    <div id="playlist-container" class="mt-3 max-h-32 overflow-y-auto hidden">
                        <div class="text-xs font-semibold text-gray-400 mb-1">Playlist:</div>
                        <div id="playlist-items" class="space-y-1"></div>
                    </div>
                </div>
            `;
            
            audioReactiveSection.insertAdjacentHTML('afterend', playerHTML);
        }
    }

    setupEventListeners() {
        document.getElementById('playlist-input')?.addEventListener('change', (e) => {
            this.loadPlaylist(e.target.files);
        });

        document.getElementById('play-pause')?.addEventListener('click', () => {
            this.togglePlayPause();
        });

        document.getElementById('prev-track')?.addEventListener('click', () => {
            this.previousTrack();
        });

        document.getElementById('next-track')?.addEventListener('click', () => {
            this.nextTrack();
        });

        document.getElementById('volume-slider')?.addEventListener('input', (e) => {
            this.setVolume(e.target.value);
        });

        document.getElementById('player-mode')?.addEventListener('change', (e) => {
            this.lightMode = e.target.value;
            DMXMonitor.add(`[PLAYER] Modalità: ${this.lightMode}`, 'system');
        });

        document.getElementById('effect-intensity')?.addEventListener('input', (e) => {
            this.sensitivity = parseInt(e.target.value);
            document.getElementById('effect-intensity-value').textContent = this.sensitivity;
            
            // Feedback immediato
            let description = '';
            if (this.sensitivity <= 3) description = ' (Sottile)';
            else if (this.sensitivity <= 6) description = ' (Normale)';
            else if (this.sensitivity <= 8) description = ' (Forte)';
            else description = ' (Estremo)';
            
            DMXMonitor.add(`[PLAYER] Sensibilità: ${this.sensitivity}${description}`, 'system');
        });
        
        this.audioElement.addEventListener('timeupdate', () => {
            this.updateProgress();
        });

        this.audioElement.addEventListener('ended', () => {
            this.handleTrackEnd();
        });

        this.audioElement.addEventListener('loadedmetadata', () => {
            this.updateTimeDisplay();
        });
    }

    setupVisualizer() {
        this.visualizerCanvas = document.getElementById('player-visualizer');
        if (this.visualizerCanvas) {
            this.visualizerCtx = this.visualizerCanvas.getContext('2d');
            this.visualizerCanvas.width = this.visualizerCanvas.offsetWidth;
            this.visualizerCanvas.height = this.visualizerCanvas.offsetHeight;
        }
    }

    setupMusicTabEventListeners() {
        document.getElementById('music-library-input')?.addEventListener('change', (e) => {
            this.addToLibrary(e.target.files);
        });

        document.getElementById('clear-library')?.addEventListener('click', () => {
            CustomAlert.confirm('Vuoi davvero svuotare la libreria musicale?', () => {
                this.clearLibrary();
            });
        });

        document.getElementById('music-search')?.addEventListener('input', (e) => {
            this.filterLibrary(e.target.value);
        });

        document.getElementById('music-sort')?.addEventListener('change', (e) => {
            this.sortLibrary(e.target.value);
        });

        document.getElementById('music-play-pause')?.addEventListener('click', () => {
            this.togglePlayPause();
        });

        document.getElementById('music-prev')?.addEventListener('click', () => {
            this.previousTrack();
        });

        document.getElementById('music-next')?.addEventListener('click', () => {
            this.nextTrack();
        });

        document.getElementById('music-volume')?.addEventListener('input', (e) => {
            this.setVolume(e.target.value);
        });

        document.getElementById('progress-container')?.addEventListener('click', (e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            if (this.audioElement.duration) {
                this.audioElement.currentTime = percent * this.audioElement.duration;
            }
        });

        document.querySelectorAll('input[name="playback-mode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.setPlaybackMode(e.target.value);
            });
        });

        document.getElementById('music-shuffle')?.addEventListener('click', () => {
            this.toggleShuffle();
        });

        document.getElementById('music-repeat')?.addEventListener('click', () => {
            this.toggleRepeat();
        });

        document.getElementById('music-light-mode')?.addEventListener('change', (e) => {
            this.lightMode = e.target.value;
            DMXMonitor.add(`[MUSIC] Modalità luci: ${this.lightMode}`, 'system');
        });

        document.getElementById('music-sensitivity')?.addEventListener('input', (e) => {
            this.sensitivity = parseInt(e.target.value);
        });
    }

    setupMusicTabVisualizers() {
        this.musicTabCanvas = document.getElementById('music-tab-visualizer');
        if (this.musicTabCanvas) {
            this.musicTabCtx = this.musicTabCanvas.getContext('2d');
            this.musicTabCanvas.width = this.musicTabCanvas.offsetWidth;
            this.musicTabCanvas.height = this.musicTabCanvas.offsetHeight;
        }
        
        this.waveformCanvas = document.getElementById('music-waveform');
        if (this.waveformCanvas) {
            this.waveformCtx = this.waveformCanvas.getContext('2d');
            this.waveformCanvas.width = this.waveformCanvas.offsetWidth;
            this.waveformCanvas.height = this.waveformCanvas.offsetHeight;
        }
    }

    async loadPlaylist(files) {
        this.playlist = [];
        
        for (const file of files) {
            const metadata = await this.extractMetadata(file);
            const track = {
                id: Date.now() + Math.random(),
                file: file,
                name: file.name,
                title: metadata.title || file.name.replace(/\.[^/.]+$/, ''),
                artist: metadata.artist || 'Unknown Artist',
                album: metadata.album || 'Unknown Album',
                duration: metadata.duration || 0,
                date: new Date(file.lastModified),
                size: file.size,
                url: URL.createObjectURL(file)
            };
            this.playlist.push(track);
        }
        
        if (this.playlist.length > 0) {
            const container = document.getElementById('playlist-container');
            const itemsDiv = document.getElementById('playlist-items');
            
            if (container && itemsDiv) {
                container.classList.remove('hidden');
                itemsDiv.innerHTML = '';
                
                this.playlist.forEach((track, index) => {
                    const item = document.createElement('div');
                    item.className = 'text-xs p-1 rounded cursor-pointer hover:bg-gray-600 transition-all';
                    item.innerHTML = `${index + 1}. ${track.title}`;
                    item.onclick = () => this.playTrack(index);
                    itemsDiv.appendChild(item);
                });
            }
            
            await this.loadTrack(0);
            DMXMonitor.add(`[PLAYER] Playlist caricata: ${this.playlist.length} tracce`, 'success');
        }
    }

    async addToLibrary(files) {
        const newTracks = [];
        
        for (const file of files) {
            const metadata = await this.extractMetadata(file);
            const track = {
                id: Date.now() + Math.random(),
                file: file,
                name: file.name,
                title: metadata.title || file.name.replace(/\.[^/.]+$/, ''),
                artist: metadata.artist || 'Unknown Artist',
                album: metadata.album || 'Unknown Album',
                duration: metadata.duration || 0,
                date: new Date(file.lastModified),
                size: file.size,
                url: URL.createObjectURL(file)
            };
            newTracks.push(track);
        }
        
        this.library = [...this.library, ...newTracks];
        this.saveLibraryToStorage();
        this.renderLibrary();
        this.updateLibraryStats();
        
        DMXMonitor.add(`[MUSIC] Aggiunti ${newTracks.length} brani alla libreria`, 'success');
    }

    async extractMetadata(file) {
        return new Promise((resolve) => {
            const audio = new Audio();
            const url = URL.createObjectURL(file);
            
            audio.addEventListener('loadedmetadata', () => {
                const duration = audio.duration;
                URL.revokeObjectURL(url);
                
                const filename = file.name.replace(/\.[^/.]+$/, '');
                let title = filename;
                let artist = 'Unknown Artist';
                let album = 'Unknown Album';
                
                const match = filename.match(/^(.+?)\s*[-–]\s*(.+)$/);
                if (match) {
                    artist = match[1].trim();
                    title = match[2].trim();
                }
                
                resolve({ title, artist, album, duration });
            });
            
            audio.addEventListener('error', () => {
                URL.revokeObjectURL(url);
                const filename = file.name.replace(/\.[^/.]+$/, '');
                resolve({ title: filename, artist: 'Unknown', album: 'Unknown', duration: 0 });
            });
            
            audio.src = url;
        });
    }

    async loadTrack(index) {
        if (index < 0 || index >= this.playlist.length) return;
        
        this.currentTrackIndex = index;
        const track = this.playlist[index];
        
        document.getElementById('current-track').textContent = track.title;
        document.getElementById('now-playing-title').textContent = track.title;
        document.getElementById('now-playing-artist').textContent = track.artist;
        document.getElementById('now-playing-album').textContent = track.album;
        
        this.audioElement.src = track.url;
        
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            this.analyser.smoothingTimeConstant = 0.8;
            
            const source = this.audioContext.createMediaElementSource(this.audioElement);
            source.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
            
            // Initialize Meyda for audio player
            if (typeof Meyda !== 'undefined') {
                try {
                    this.meydaAnalyzer = Meyda.createMeydaAnalyzer({
                        audioContext: this.audioContext,
                        source: source,
                        bufferSize: 512,
                        featureExtractors: [
                            'rms',
                            'energy', 
                            'zcr',
                            'spectralCentroid',
                            'spectralFlux',
                            'mfcc',
                            'loudness'
                        ],
                        callback: (features) => {
                            // Process Meyda features for better beat detection
                            if (this.beatDetector && this.beatDetector.processMeydaFeatures) {
                                this.beatDetector.processMeydaFeatures(features);
                            }
                        }
                    });
                    this.meydaAnalyzer.start();
                    DMXMonitor.add('[PLAYER] ✅ Meyda ATTIVO per analisi audio avanzata', 'success');
                } catch (error) {
                    console.warn('[PLAYER] Meyda init failed:', error);
                    DMXMonitor.add('[PLAYER] ⚠️ Meyda non disponibile', 'warning');
                }
            } else {
                DMXMonitor.add('[PLAYER] ❌ Meyda NON TROVATO - Usando analisi base', 'error');
            }
        }
        
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.updateActivePlaylist();
    }

    play() {
        if (this.audioElement.src) {
            this.audioElement.play();
            this.isPlaying = true;
            document.getElementById('play-pause').textContent = '⏸️';
            document.getElementById('music-play-pause').textContent = '⏸️';
            this.startAnalysis();
            DMXMonitor.add('[PLAYER] Riproduzione avviata', 'system');
        }
    }

    pause() {
        this.audioElement.pause();
        this.isPlaying = false;
        document.getElementById('play-pause').textContent = '▶️';
        document.getElementById('music-play-pause').textContent = '▶️';
        DMXMonitor.add('[PLAYER] In pausa', 'system');
    }

    stop() {
        this.pause();
        this.audioElement.currentTime = 0;
        this.isPlaying = false;
    }

    togglePlayPause() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    async playTrack(index) {
        await this.loadTrack(index);
        this.play();
    }

    playLibraryTrack(index) {
        if (index < 0 || index >= this.library.length) return;
        
        this.playlist = [...this.library];
        this.currentTrackIndex = index;
        
        if (this.playbackMode === 'shuffle') {
            this.generateShuffleOrder();
        }
        
        this.loadTrack(this.currentTrackIndex);
        this.play();
        this.updateActivePlaylist();
    }

    previousTrack() {
        if (this.playbackMode === 'shuffle') {
            const currentShuffleIndex = this.shuffleOrder.indexOf(this.currentTrackIndex);
            const prevShuffleIndex = (currentShuffleIndex - 1 + this.shuffleOrder.length) % this.shuffleOrder.length;
            this.playTrack(this.shuffleOrder[prevShuffleIndex]);
        } else {
            const prevIndex = (this.currentTrackIndex - 1 + this.playlist.length) % this.playlist.length;
            this.playTrack(prevIndex);
        }
    }

    nextTrack() {
        if (this.playbackMode === 'shuffle') {
            const currentShuffleIndex = this.shuffleOrder.indexOf(this.currentTrackIndex);
            const nextShuffleIndex = (currentShuffleIndex + 1) % this.shuffleOrder.length;
            this.playTrack(this.shuffleOrder[nextShuffleIndex]);
        } else {
            const nextIndex = (this.currentTrackIndex + 1) % this.playlist.length;
            this.playTrack(nextIndex);
        }
    }

    setVolume(value) {
        this.audioElement.volume = value / 100;
        document.getElementById('volume-display').textContent = `${value}%`;
        document.getElementById('music-volume-display').textContent = `${value}%`;
    }

    updateProgress() {
        if (this.audioElement.duration) {
            const progress = (this.audioElement.currentTime / this.audioElement.duration) * 100;
            
            document.getElementById('progress-bar')?.style.setProperty('width', `${progress}%`);
            document.getElementById('music-progress-bar')?.style.setProperty('width', `${progress}%`);
            
            const current = this.formatTime(this.audioElement.currentTime);
            document.getElementById('current-time').textContent = current;
            document.getElementById('music-current-time').textContent = current;
        }
    }

    updateTimeDisplay() {
        const total = this.formatTime(this.audioElement.duration);
        document.getElementById('total-time').textContent = total;
        document.getElementById('music-total-time').textContent = total;
    }

    handleTrackEnd() {
        switch(this.playbackMode) {
            case 'repeat-one':
                this.play();
                break;
            case 'repeat-all':
                this.nextTrack();
                break;
            case 'shuffle':
                this.nextTrack();
                break;
            case 'sequential':
                if (this.currentTrackIndex < this.playlist.length - 1) {
                    this.nextTrack();
                } else {
                    this.stop();
                }
                break;
        }
    }

    setPlaybackMode(mode) {
        this.playbackMode = mode;
        
        document.getElementById('music-shuffle')?.classList.toggle('bg-purple-600', mode === 'shuffle');
        document.getElementById('music-repeat')?.classList.toggle('bg-purple-600', mode.includes('repeat'));
        
        if (mode === 'shuffle') {
            this.generateShuffleOrder();
        }
        
        DMXMonitor.add(`[MUSIC] Modalità: ${mode}`, 'system');
    }

    toggleShuffle() {
        if (this.playbackMode === 'shuffle') {
            this.setPlaybackMode('sequential');
        } else {
            this.setPlaybackMode('shuffle');
        }
    }

    toggleRepeat() {
        if (this.playbackMode === 'repeat-all') {
            this.setPlaybackMode('repeat-one');
        } else if (this.playbackMode === 'repeat-one') {
            this.setPlaybackMode('sequential');
        } else {
            this.setPlaybackMode('repeat-all');
        }
    }

    generateShuffleOrder() {
        this.shuffleOrder = [...Array(this.playlist.length).keys()];
        for (let i = this.shuffleOrder.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.shuffleOrder[i], this.shuffleOrder[j]] = [this.shuffleOrder[j], this.shuffleOrder[i]];
        }
    }

    renderLibrary() {
        const tbody = document.getElementById('music-library-tbody');
        if (!tbody) return;
        
        if (this.library.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="p-8 text-center text-gray-500">
                        Nessun file caricato
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = this.library.map((track, index) => `
            <tr class="hover:bg-gray-700/50 transition-all cursor-pointer">
                <td class="p-2">${index + 1}</td>
                <td class="p-2 font-medium">${track.title}</td>
                <td class="p-2 text-gray-400">${track.artist}</td>
                <td class="p-2 text-gray-400">${track.album}</td>
                <td class="p-2">${this.formatTime(track.duration)}</td>
                <td class="p-2 text-xs">${track.date.toLocaleDateString('it-IT')}</td>
                <td class="p-2 text-xs">${this.formatFileSize(track.size)}</td>
                <td class="p-2 text-center">
                    <button onclick="dmxApp.audioPlayer.playLibraryTrack(${index})" 
                            class="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs mr-1">
                        ▶️
                    </button>
                    <button onclick="dmxApp.audioPlayer.addToPlaylist(${index})" 
                            class="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs mr-1">
                        ➕
                    </button>
                    <button onclick="dmxApp.audioPlayer.removeFromLibrary(${index})" 
                            class="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs">
                        🗑️
                    </button>
                </td>
            </tr>
        `).join('');
    }

    addToPlaylist(index) {
        const track = this.library[index];
        if (track) {
            this.playlist.push(track);
            this.updateActivePlaylist();
            DMXMonitor.add(`[MUSIC] "${track.title}" aggiunto alla playlist`, 'success');
        }
    }

    removeFromLibrary(index) {
        const track = this.library[index];
        if (track) {
            CustomAlert.confirm(`Rimuovere "${track.title}" dalla libreria?`, () => {
                URL.revokeObjectURL(track.url);
                this.library.splice(index, 1);
                this.saveLibraryToStorage();
                this.renderLibrary();
                this.updateLibraryStats();
            });
        }
    }

    clearLibrary() {
        this.library.forEach(track => URL.revokeObjectURL(track.url));
        this.library = [];
        this.playlist = [];
        this.saveLibraryToStorage();
        this.renderLibrary();
        this.updateLibraryStats();
        this.updateActivePlaylist();
    }

    filterLibrary(searchTerm) {
        const term = searchTerm.toLowerCase();
        const rows = document.querySelectorAll('#music-library-tbody tr');
        
        rows.forEach((row, index) => {
            if (index === 0 && this.library.length === 0) return;
            
            const track = this.library[index];
            if (track) {
                const matches = track.title.toLowerCase().includes(term) ||
                               track.artist.toLowerCase().includes(term) ||
                               track.album.toLowerCase().includes(term);
                
                row.style.display = matches ? '' : 'none';
            }
        });
    }

    sortLibrary(sortBy) {
        switch(sortBy) {
            case 'name':
                this.library.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'date':
                this.library.sort((a, b) => b.date - a.date);
                break;
            case 'duration':
                this.library.sort((a, b) => b.duration - a.duration);
                break;
            case 'size':
                this.library.sort((a, b) => b.size - a.size);
                break;
        }
        this.renderLibrary();
    }

    updateLibraryStats() {
        const stats = document.getElementById('library-stats');
        const durationEl = document.getElementById('library-duration');
        
        if (stats && durationEl) {
            const totalSize = this.library.reduce((sum, track) => sum + track.size, 0);
            const totalDuration = this.library.reduce((sum, track) => sum + track.duration, 0);
            
            stats.textContent = `${this.library.length} brani, ${this.formatFileSize(totalSize)} totali`;
            durationEl.textContent = `Durata totale: ${this.formatTime(totalDuration)}`;
        }
    }

    updateActivePlaylist() {
        const container = document.getElementById('active-playlist');
        if (!container) return;
        
        if (this.playlist.length === 0) {
            container.innerHTML = '<div class="text-gray-500">Nessuna playlist attiva</div>';
            return;
        }
        
        container.innerHTML = this.playlist.map((track, index) => `
            <div class="p-1 rounded hover:bg-gray-700 cursor-pointer ${index === this.currentTrackIndex ? 'bg-gray-700 text-blue-400' : ''}"
                 onclick="dmxApp.audioPlayer.playTrack(${index})">
                ${index + 1}. ${track.title} - ${track.artist}
            </div>
        `).join('');
    }

    saveLibraryToStorage() {
        const libraryData = this.library.map(track => ({
            id: track.id,
            name: track.name,
            title: track.title,
            artist: track.artist,
            album: track.album,
            duration: track.duration,
            date: track.date,
            size: track.size
        }));
        
        try {
            localStorage.setItem('dmxMusicLibrary', JSON.stringify(libraryData));
        } catch (e) {
            console.error('Failed to save library:', e);
        }
    }

    loadLibraryFromStorage() {
        try {
            const data = localStorage.getItem('dmxMusicLibrary');
            if (data) {
                const libraryData = JSON.parse(data);
                DMXMonitor.add(`[MUSIC] Trovati ${libraryData.length} brani in cache (ricarica i file)`, 'system');
            }
        } catch (e) {
            console.error('Failed to load library:', e);
        }
    }

    startAnalysis() {
        const analyze = () => {
            if (!this.isPlaying) return;
            
            if (this.analyser) {
                this.analyser.getByteFrequencyData(this.dataArray);
                
                const analysis = this.analyzeMusic();
                
                if (this.lightMode !== 'off') {
                    this.applyEffects(analysis);
                }
                
                this.updateVisualizer();
                this.updateMusicTabVisualizers(analysis);
            }
            
            requestAnimationFrame(analyze);
        };
        
        analyze();
    }

    analyzeMusic() {
        if (!this.dataArray) return {};
        
        const bass = this.getFrequencyRange(0, 10);
        const lowMid = this.getFrequencyRange(10, 30);
        const mid = this.getFrequencyRange(30, 80);
        const highMid = this.getFrequencyRange(80, 150);
        const treble = this.getFrequencyRange(150, 250);
        
        const beat = this.beatDetector.detect(this.dataArray);
        
        const energy = this.calculateEnergy();
        const spectralCentroid = this.calculateSpectralCentroid();
        
        const isDrop = this.detectDrop(energy);
        const isBuildUp = this.detectBuildUp(energy);
        const isBreakdown = energy < 0.3;
        
        return {
            bass, lowMid, mid, highMid, treble,
            beat, energy, spectralCentroid,
            isDrop, isBuildUp, isBreakdown
        };
    }

    getFrequencyRange(start, end) {
        if (!this.dataArray) return 0;
        let sum = 0;
        for (let i = start; i < end && i < this.dataArray.length; i++) {
            sum += this.dataArray[i];
        }
        return (sum / (end - start)) / 255;
    }

    calculateEnergy() {
        if (!this.dataArray) return 0;
        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            sum += this.dataArray[i];
        }
        return sum / (this.dataArray.length * 255);
    }

    calculateSpectralCentroid() {
        if (!this.dataArray) return 0;
        let weightedSum = 0;
        let magnitudeSum = 0;
        
        for (let i = 0; i < this.dataArray.length; i++) {
            weightedSum += i * this.dataArray[i];
            magnitudeSum += this.dataArray[i];
        }
        
        return magnitudeSum > 0 ? weightedSum / magnitudeSum / this.dataArray.length : 0;
    }

    detectDrop(currentEnergy) {
        return this.beatDetector.detectDrop(currentEnergy);
    }

    detectBuildUp(currentEnergy) {
        return this.beatDetector.detectBuildUp(currentEnergy);
    }

    applyEffects(analysis) {
        // Sensibilità da 1 a 10, convertita in moltiplicatore
        const sensitivity = this.sensitivity / 5; // Range da 0.2 a 2.0
        
        // Applica la sensibilità direttamente all'analisi
        const adjustedAnalysis = {
            ...analysis,
            bass: Math.min(analysis.bass * sensitivity, 1),
            lowMid: Math.min(analysis.lowMid * sensitivity, 1),
            mid: Math.min(analysis.mid * sensitivity, 1),
            highMid: Math.min(analysis.highMid * sensitivity, 1),
            treble: Math.min(analysis.treble * sensitivity, 1),
            energy: Math.min(analysis.energy * sensitivity, 1),
            beat: {
                ...analysis.beat,
                detected: sensitivity < 0.4 ? false : analysis.beat.detected, // Disabilita beat se sensibilità troppo bassa
                strength: analysis.beat.strength * sensitivity
            }
        };
        
        switch(this.lightMode) {
            case 'intelligent':
                this.applyIntelligentEffects(adjustedAnalysis, sensitivity);
                break;
            case 'beat-sync':
                this.applyBeatSyncEffects(adjustedAnalysis, sensitivity);
                break;
            case 'ambient':
                this.applyAmbientEffects(adjustedAnalysis, sensitivity);
                break;
            case 'party':
                this.applyPartyEffects(adjustedAnalysis, sensitivity);
                break;
            case 'par-optimized':
                this.applyPAROptimizedEffects(adjustedAnalysis, sensitivity);
                break;
            case 'moving-head-show':
                this.applyMovingHeadShow(adjustedAnalysis, sensitivity);
                break;
        }
    }

    applyIntelligentEffects(analysis, sensitivity) {
        const { bass, mid, treble, beat, energy, isDrop, isBuildUp, isBreakdown } = analysis;
        
        this.app.fixtures.forEach((fixture, index) => {
            let r, g, b, dimmer;
            
            if (isDrop) {
                r = g = b = 255;
                dimmer = 255;
                
                if (fixture.type === 'moving-head') {
                    fixture.values[0] = Math.floor(Math.random() * 255);
                    fixture.values[2] = Math.floor(Math.random() * 255);
                    fixture.values[5] = 255;
                    fixture.values[7] = 200;
                    
                    this.app.dmxController.setChannel(fixture.startChannel, fixture.values[0]);
                    this.app.dmxController.setChannel(fixture.startChannel + 2, fixture.values[2]);
                    this.app.dmxController.setChannel(fixture.startChannel + 5, fixture.values[5]);
                    this.app.dmxController.setChannel(fixture.startChannel + 7, fixture.values[7]);
                }
            } else if (isBuildUp) {
                const buildIntensity = energy * sensitivity;
                r = Math.floor(255 * buildIntensity);
                g = Math.floor(100 * buildIntensity);
                b = Math.floor(150 * buildIntensity);
                dimmer = Math.floor(100 + 155 * buildIntensity);
                
                if (fixture.type === 'moving-head') {
                    const time = Date.now() / 1000;
                    fixture.values[0] = Math.floor(Math.sin(time) * 127 + 128);
                    fixture.values[2] = Math.floor(64 + energy * 64);
                    fixture.values[5] = Math.floor(50 + energy * 205);
                    
                    this.app.dmxController.setChannel(fixture.startChannel, fixture.values[0]);
                    this.app.dmxController.setChannel(fixture.startChannel + 2, fixture.values[2]);
                    this.app.dmxController.setChannel(fixture.startChannel + 5, fixture.values[5]);
                }
            } else if (isBreakdown) {
                r = Math.floor(50 + mid * 100 * sensitivity);
                g = Math.floor(50 + treble * 100 * sensitivity);
                b = Math.floor(100 + bass * 155 * sensitivity);
                dimmer = Math.floor(80 + energy * 100 * sensitivity);
                
                if (fixture.type === 'moving-head') {
                    const time = Date.now() / 5000;
                    fixture.values[0] = Math.floor(Math.sin(time + index) * 50 + 128);
                    fixture.values[2] = Math.floor(Math.cos(time) * 30 + 128);
                    fixture.values[5] = 20;
                    fixture.values[7] = 0;
                    
                    this.app.dmxController.setChannel(fixture.startChannel, fixture.values[0]);
                    this.app.dmxController.setChannel(fixture.startChannel + 2, fixture.values[2]);
                    this.app.dmxController.setChannel(fixture.startChannel + 5, fixture.values[5]);
                    this.app.dmxController.setChannel(fixture.startChannel + 7, 0);
                }
            } else {
                r = Math.floor(bass * 255 * sensitivity);
                g = Math.floor(mid * 255 * sensitivity);
                b = Math.floor(treble * 255 * sensitivity);
                dimmer = Math.floor(50 + energy * 205 * sensitivity);
                
                if (fixture.type === 'moving-head' && beat.detected) {
                    const positions = [
                        {pan: 0, tilt: 64},
                        {pan: 255, tilt: 64},
                        {pan: 128, tilt: 0},
                        {pan: 128, tilt: 128}
                    ];
                    const pos = positions[beat.count % positions.length];
                    
                    fixture.values[0] = pos.pan;
                    fixture.values[2] = pos.tilt;
                    fixture.values[5] = Math.floor(200 * sensitivity);
                    
                    this.app.dmxController.setChannel(fixture.startChannel, fixture.values[0]);
                    this.app.dmxController.setChannel(fixture.startChannel + 2, fixture.values[2]);
                    this.app.dmxController.setChannel(fixture.startChannel + 5, fixture.values[5]);
                }
            }
            
            this.app.fixtureManager.applyColorToFixture(fixture, r, g, b, dimmer);
        });
    }

    applyBeatSyncEffects(analysis, sensitivity) {
        if (analysis.beat && analysis.beat.detected) {
            const beatStrength = analysis.beat.strength * sensitivity;
            
            this.app.fixtures.forEach((fixture, index) => {
                const intensity = Math.floor(255 * beatStrength);
                
                const colorIndex = analysis.beat.count % 6;
                const colors = [
                    [255, 0, 0], [0, 255, 0], [0, 0, 255],
                    [255, 255, 0], [255, 0, 255], [0, 255, 255]
                ];
                const color = colors[colorIndex];
                
                this.app.fixtureManager.applyColorToFixture(
                    fixture, 
                    color[0] * beatStrength,
                    color[1] * beatStrength,
                    color[2] * beatStrength,
                    intensity
                );
                
                if (fixture.type === 'moving-head') {
                    if (analysis.beat.count % 4 === 0) {
                        fixture.values[0] = Math.floor(Math.random() * 255);
                        fixture.values[2] = Math.floor(Math.random() * 128) + 64;
                        fixture.values[5] = 255;
                        
                        this.app.dmxController.setChannel(fixture.startChannel, fixture.values[0]);
                        this.app.dmxController.setChannel(fixture.startChannel + 2, fixture.values[2]);
                        this.app.dmxController.setChannel(fixture.startChannel + 5, fixture.values[5]);
                    }
                }
            });
        }
    }

    applyAmbientEffects(analysis, sensitivity) {
        const { bass, mid, treble, energy } = analysis;
        
        this.app.fixtures.forEach((fixture, index) => {
            const time = Date.now() / 2000;
            const r = Math.floor((Math.sin(time + bass) + 1) * 127 * sensitivity);
            const g = Math.floor((Math.sin(time + mid) + 1) * 127 * sensitivity);
            const b = Math.floor((Math.sin(time + treble) + 1) * 127 * sensitivity);
            const dimmer = Math.floor(100 + energy * 100 * sensitivity);
            
            if (fixture.type === 'moving-head') {
                fixture.values[0] = Math.floor((Math.sin(time * 0.5 + index) + 1) * 127);
                fixture.values[2] = Math.floor((Math.cos(time * 0.3) + 1) * 64 + 64);
                fixture.values[5] = 10;
                
                this.app.dmxController.setChannel(fixture.startChannel, fixture.values[0]);
                this.app.dmxController.setChannel(fixture.startChannel + 2, fixture.values[2]);
                this.app.dmxController.setChannel(fixture.startChannel + 5, fixture.values[5]);
            }
            
            this.app.fixtureManager.applyColorToFixture(fixture, r, g, b, dimmer);
        });
    }

    applyPartyEffects(analysis, sensitivity) {
        const { beat } = analysis;
        
        this.app.fixtures.forEach((fixture, index) => {
            if (beat && beat.detected) {
                const r = Math.floor(Math.random() * 255);
                const g = Math.floor(Math.random() * 255);
                const b = Math.floor(Math.random() * 255);
                
                this.app.fixtureManager.applyColorToFixture(fixture, r, g, b, 255);
                
                if (fixture.type === 'moving-head') {
                    fixture.values[0] = Math.floor(Math.random() * 255);
                    fixture.values[2] = Math.floor(Math.random() * 255);
                    fixture.values[5] = 255;
                    
                    if (Math.random() > 0.7) {
                        fixture.values[7] = 200;
                        setTimeout(() => {
                            fixture.values[7] = 0;
                            this.app.dmxController.setChannel(fixture.startChannel + 7, 0);
                        }, 100);
                    }
                    
                    this.app.dmxController.setChannel(fixture.startChannel, fixture.values[0]);
                    this.app.dmxController.setChannel(fixture.startChannel + 2, fixture.values[2]);
                    this.app.dmxController.setChannel(fixture.startChannel + 5, fixture.values[5]);
                    this.app.dmxController.setChannel(fixture.startChannel + 7, fixture.values[7]);
                }
            }
        });
    }

    applyPAROptimizedEffects(analysis, sensitivity) {
        const { bass, mid, treble, beat, energy } = analysis;
        
        this.app.fixtures.forEach(fixture => {
            if (fixture.type === 'par' || fixture.type === 'par-led') {
                let targetR, targetG, targetB;
                
                // SENSIBILITÀ CONTROLLA:
                // 1-3: Risposta minima, solo cambi leggeri
                // 4-6: Risposta normale
                // 7-10: Risposta esagerata, molto reattiva
                
                if (sensitivity < 0.6) {
                    // Bassa sensibilità - colori tenui
                    targetR = Math.floor(bass * 100);
                    targetG = Math.floor(mid * 100);
                    targetB = Math.floor(treble * 100);
                } else if (sensitivity > 1.4) {
                    // Alta sensibilità - colori saturi e reattivi
                    if (beat && beat.detected) {
                        // Flash estremi sui beat
                        const beatColors = [
                            [255, 0, 0],
                            [0, 255, 0],
                            [0, 0, 255],
                            [255, 255, 0],
                            [255, 0, 255],
                            [0, 255, 255],
                            [255, 255, 255]
                        ];
                        const colorIndex = beat.count % beatColors.length;
                        const beatColor = beatColors[colorIndex];
                        
                        targetR = beatColor[0];
                        targetG = beatColor[1];
                        targetB = beatColor[2];
                    } else {
                        // Amplifica molto le frequenze
                        targetR = Math.min(255, Math.floor(bass * 400));
                        targetG = Math.min(255, Math.floor(mid * 400));
                        targetB = Math.min(255, Math.floor(treble * 400));
                    }
                } else {
                    // Sensibilità normale
                    if (beat && beat.detected) {
                        const beatColors = [
                            [255, 0, 0],
                            [0, 255, 0],
                            [0, 0, 255],
                            [255, 255, 0],
                            [255, 0, 255],
                            [0, 255, 255]
                        ];
                        const colorIndex = beat.count % beatColors.length;
                        const beatColor = beatColors[colorIndex];
                        
                        targetR = beatColor[0];
                        targetG = beatColor[1];
                        targetB = beatColor[2];
                    } else {
                        targetR = Math.floor(bass * 255);
                        targetG = Math.floor(mid * 255);
                        targetB = Math.floor(treble * 255);
                    }
                }
                
                // Smoothing factor dipende dalla sensibilità
                const smoothingEnabled = sensitivity < 1.5; // Disabilita smoothing ad alta sensibilità
                
                let finalColors;
                if (smoothingEnabled) {
                    finalColors = this.parSmoothing.smooth(
                        { r: targetR, g: targetG, b: targetB },
                        fixture.id,
                        beat && beat.detected,
                        energy
                    );
                } else {
                    // Nessuno smoothing - risposta immediata
                    finalColors = { r: targetR, g: targetG, b: targetB };
                }
                
                // Dimmer basato su sensibilità
                let targetDimmer;
                if (sensitivity < 0.6) {
                    // Bassa sensibilità - dimmer limitato
                    targetDimmer = Math.floor(50 + energy * 50);
                } else if (sensitivity > 1.4) {
                    // Alta sensibilità - dimmer sempre alto
                    targetDimmer = beat && beat.detected ? 255 : Math.floor(150 + energy * 105);
                } else {
                    // Normale
                    targetDimmer = beat && beat.detected ? 255 : Math.floor(100 + energy * 155);
                }
                
                // Applica valori
                this.app.fixtureManager.applyColorToFixture(
                    fixture,
                    finalColors.r,
                    finalColors.g,
                    finalColors.b,
                    targetDimmer
                );
                
                // Strobo solo con alta sensibilità
                if (fixture.type === 'par-led' && beat && beat.detected && sensitivity > 1.2) {
                    if (beat.strength > 0.6) {
                        fixture.values[5] = 50;
                        fixture.values[6] = Math.floor(255 * sensitivity);
                        
                        this.app.dmxController.setChannel(fixture.startChannel + 5, fixture.values[5]);
                        this.app.dmxController.setChannel(fixture.startChannel + 6, fixture.values[6]);
                        
                        setTimeout(() => {
                            fixture.values[5] = 0;
                            this.app.dmxController.setChannel(fixture.startChannel + 5, 0);
                        }, 50 + (10 - this.sensitivity) * 10); // Durata strobo basata su sensibilità
                    }
                }
            } else if (fixture.type === 'moving-head') {
                const time = Date.now() / 1000;
                
                // Movimento basato su sensibilità
                if (sensitivity < 0.6) {
                    // Movimenti molto lenti
                    fixture.values[0] = Math.floor(Math.sin(time * 0.1) * 30 + 128);
                    fixture.values[2] = Math.floor(Math.cos(time * 0.1) * 20 + 100);
                    fixture.values[5] = 10;
                } else if (sensitivity > 1.4) {
                    // Movimenti frenetici
                    if (beat && beat.detected) {
                        fixture.values[0] = Math.floor(Math.random() * 255);
                        fixture.values[2] = Math.floor(Math.random() * 255);
                        fixture.values[5] = 255;
                    } else {
                        fixture.values[0] = Math.floor(Math.sin(time * 2) * 127 + 128);
                        fixture.values[2] = Math.floor(Math.cos(time * 2) * 127 + 128);
                        fixture.values[5] = 200;
                    }
                } else {
                    // Normale
                    if (beat && beat.detected) {
                        fixture.values[0] = Math.floor(Math.random() * 255);
                        fixture.values[2] = Math.floor(Math.random() * 128 + 64);
                        fixture.values[5] = 255;
                    } else {
                        fixture.values[0] = Math.floor(Math.sin(time * 0.5) * 100 + 128);
                        fixture.values[2] = Math.floor(Math.cos(time * 0.3) * 50 + 100);
                        fixture.values[5] = 50;
                    }
                }
                
                this.app.dmxController.setChannel(fixture.startChannel, fixture.values[0]);
                this.app.dmxController.setChannel(fixture.startChannel + 2, fixture.values[2]);
                this.app.dmxController.setChannel(fixture.startChannel + 5, fixture.values[5]);
                
                // Colori
                const r = Math.floor(bass * 255);
                const g = Math.floor(mid * 255);
                const b = Math.floor(treble * 255);
                const dimmer = beat && beat.detected ? 255 : Math.floor(100 + energy * 155);
                
                this.app.fixtureManager.applyColorToFixture(fixture, r, g, b, dimmer);
            }
        });
    }

    applyMovingHeadShow(analysis, sensitivity) {
        const { bass, mid, treble, beat, energy, spectralCentroid } = analysis;
        
        this.app.fixtures.forEach((fixture, index) => {
            if (fixture.type === 'moving-head') {
                const time = Date.now() / 1000;
                const pattern = Math.floor(time / 4) % 4;
                
                switch(pattern) {
                    case 0:
                        fixture.values[0] = Math.floor(Math.sin(time * bass * 2) * 127 + 128);
                        fixture.values[2] = Math.floor(Math.cos(time * bass * 2) * 64 + 100);
                        break;
                    case 1:
                        fixture.values[0] = Math.floor(Math.sin(time * mid) * 127 + 128);
                        fixture.values[2] = Math.floor(Math.sin(time * mid * 2) * 64 + 100);
                        break;
                    case 2:
                        if (beat && beat.detected) {
                            fixture.values[0] = Math.floor(Math.random() * 255);
                            fixture.values[2] = Math.floor(Math.random() * 128 + 64);
                        }
                        break;
                    case 3:
                        fixture.values[0] = Math.floor((time * 50) % 255);
                        fixture.values[2] = Math.floor(spectralCentroid * 255);
                        break;
                }
                
                fixture.values[5] = Math.floor(50 + energy * 205);
                
                if (beat && beat.detected && beat.strength > 0.7) {
                    fixture.values[18] = Math.floor(Math.random() * 255);
                    this.app.dmxController.setChannel(fixture.startChannel + 18, fixture.values[18]);
                }
                
                if (analysis.isDrop) {
                    fixture.values[7] = 255;
                } else {
                    fixture.values[7] = 0;
                }
                
                this.app.dmxController.setChannel(fixture.startChannel, fixture.values[0]);
                this.app.dmxController.setChannel(fixture.startChannel + 2, fixture.values[2]);
                this.app.dmxController.setChannel(fixture.startChannel + 5, fixture.values[5]);
                this.app.dmxController.setChannel(fixture.startChannel + 7, fixture.values[7]);
                
                const r = Math.floor(bass * 255 * sensitivity);
                const g = Math.floor(mid * 255 * sensitivity);
                const b = Math.floor(treble * 255 * sensitivity);
                
                this.app.fixtureManager.applyColorToFixture(fixture, r, g, b, 255);
            } else {
                const smoothedColors = this.parSmoothing.smooth({
                    r: Math.floor(bass * 200),
                    g: Math.floor(mid * 200),
                    b: Math.floor(treble * 200)
                }, fixture.id);
                
                this.app.fixtureManager.applyColorToFixture(
                    fixture,
                    smoothedColors.r,
                    smoothedColors.g,
                    smoothedColors.b,
                    Math.floor(100 + energy * 155)
                );
            }
        });
    }

    updateVisualizer() {
        if (!this.visualizerCtx || !this.dataArray) return;
        
        const width = this.visualizerCanvas.width;
        const height = this.visualizerCanvas.height;
        
        const gradient = this.visualizerCtx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, 'rgba(139, 92, 246, 0.1)');
        gradient.addColorStop(1, 'rgba(236, 72, 153, 0.1)');
        this.visualizerCtx.fillStyle = gradient;
        this.visualizerCtx.fillRect(0, 0, width, height);
        
        const barWidth = width / this.dataArray.length * 2;
        
        for (let i = 0; i < this.dataArray.length; i++) {
            const barHeight = (this.dataArray[i] / 255) * height;
            const hue = (i / this.dataArray.length) * 120 + 240;
            
            this.visualizerCtx.fillStyle = `hsl(${hue}, 100%, 60%)`;
            this.visualizerCtx.fillRect(
                i * barWidth,
                height - barHeight,
                barWidth - 1,
                barHeight
            );
        }
    }

    updateMusicTabVisualizers(analysis) {
        if (analysis) {
            document.getElementById('freq-bass').textContent = Math.round(analysis.bass * 100) + '%';
            document.getElementById('freq-lowmid').textContent = Math.round(analysis.lowMid * 100) + '%';
            document.getElementById('freq-mid').textContent = Math.round(analysis.mid * 100) + '%';
            document.getElementById('freq-highmid').textContent = Math.round(analysis.highMid * 100) + '%';
            document.getElementById('freq-treble').textContent = Math.round(analysis.treble * 100) + '%';
        }
        
        if (this.musicTabCtx && this.dataArray) {
            const width = this.musicTabCanvas.width;
            const height = this.musicTabCanvas.height;
            
            this.musicTabCtx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            this.musicTabCtx.fillRect(0, 0, width, height);
            
            const barWidth = width / this.dataArray.length * 2;
            
            for (let i = 0; i < this.dataArray.length; i++) {
                const barHeight = (this.dataArray[i] / 255) * height;
                const hue = (i / this.dataArray.length) * 360;
                
                this.musicTabCtx.fillStyle = `hsl(${hue}, 100%, 50%)`;
                this.musicTabCtx.fillRect(
                    i * barWidth,
                    height - barHeight,
                    barWidth - 1,
                    barHeight
                );
            }
        }
        
        if (this.waveformCtx && this.dataArray) {
            const width = this.waveformCanvas.width;
            const height = this.waveformCanvas.height;
            
            this.waveformCtx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            this.waveformCtx.fillRect(0, 0, width, height);
            
            this.waveformCtx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
            this.waveformCtx.lineWidth = 2;
            this.waveformCtx.beginPath();
            
            const sliceWidth = width / this.dataArray.length;
            let x = 0;
            
            for (let i = 0; i < this.dataArray.length; i++) {
                const v = this.dataArray[i] / 255;
                const y = v * height;
                
                if (i === 0) {
                    this.waveformCtx.moveTo(x, y);
                } else {
                    this.waveformCtx.lineTo(x, y);
                }
                
                x += sliceWidth;
            }
            
            this.waveformCtx.stroke();
        }
    }

    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
}

// Beat Detector Class
class BeatDetectorAdvanced {
    constructor() {
        this.energyHistory = [];
        this.historySize = 30; // Ridotto per più reattività
        this.beatThreshold = 1.15; // Soglia più bassa per rilevare più beat
        this.lastBeat = 0;
        this.minBeatInterval = 100; // Intervallo minimo ridotto
        this.beatCount = 0;
        this.dropHistory = [];
        this.buildUpCounter = 0;
        this.peakDetector = new PeakDetector();
    }

    detect(dataArray) {
        const energy = this.calculateEnergy(dataArray);
        this.energyHistory.push(energy);
        
        if (this.energyHistory.length > this.historySize) {
            this.energyHistory.shift();
        }
        
        if (this.energyHistory.length < 10) {
            return { detected: false, strength: 0, count: this.beatCount };
        }
        
        // Media mobile per rilevamento più accurato
        const recentAvg = this.energyHistory.slice(-5).reduce((a, b) => a + b) / 5;
        const historicalAvg = this.energyHistory.reduce((a, b) => a + b) / this.energyHistory.length;
        
        const now = Date.now();
        
        // Rileva beat con multiple condizioni
        const isEnergyPeak = energy > historicalAvg * this.beatThreshold;
        const isRecentPeak = recentAvg > historicalAvg * 1.1;
        const timingOk = now - this.lastBeat > this.minBeatInterval;
        
        if ((isEnergyPeak || isRecentPeak) && timingOk) {
            this.lastBeat = now;
            this.beatCount++;
            
            const strength = Math.min((energy / historicalAvg - 1) / 0.3, 1);
            return { 
                detected: true, 
                strength: Math.max(strength, 0.5), // Forza minima 0.5
                count: this.beatCount 
            };
        }
        
        return { detected: false, strength: 0, count: this.beatCount };
    }

    calculateEnergy(dataArray) {
        // Focus sui bassi (0-64 Hz range)
        let sum = 0;
        const bassRange = Math.min(dataArray.length, 32);
        
        for (let i = 0; i < bassRange; i++) {
            // Peso maggiore alle frequenze basse
            const weight = 1 + (1 - i / bassRange) * 0.5;
            sum += dataArray[i] * dataArray[i] * weight;
        }
        
        return Math.sqrt(sum / bassRange) / 255;
    }

    detectDrop(currentEnergy) {
        this.dropHistory.push(currentEnergy);
        if (this.dropHistory.length > 20) {
            this.dropHistory.shift();
        }
        
        if (this.dropHistory.length < 20) return false;
        
        const recent = this.dropHistory.slice(-5).reduce((a, b) => a + b) / 5;
        const previous = this.dropHistory.slice(0, 15).reduce((a, b) => a + b) / 15;
        
        return recent > previous * 2;
    }

    detectBuildUp(currentEnergy) {
        if (this.energyHistory.length < 10) return false;
        
        const recent = this.energyHistory.slice(-10);
        let increasing = true;
        
        for (let i = 1; i < recent.length; i++) {
            if (recent[i] < recent[i-1] * 0.95) {
                increasing = false;
                break;
            }
        }
        
        if (increasing) {
            this.buildUpCounter++;
        } else {
            this.buildUpCounter = 0;
        }
        
        return this.buildUpCounter > 5;
    }
}

// Classe helper per rilevare picchi
class PeakDetector {
    constructor() {
        this.threshold = 0.7;
    }
    
    isPeak(value, history) {
        if (history.length < 3) return false;
        const avg = history.reduce((a, b) => a + b) / history.length;
        return value > avg * (1 + this.threshold);
    }
}

// PAR Smoothing Class
// PAR Smoothing class con modalità aggressive per stacchi
class ParSmoothing {
    constructor() {
        this.history = {};
        this.smoothingFactor = 0.15; // Più basso = più smooth
        this.aggressiveMode = false;
        this.lastBeatTime = 0;
        this.beatHistory = [];
    }

    smooth(targetColor, fixtureId, isBeat = false, energy = 0) {
        if (!this.history[fixtureId]) {
            this.history[fixtureId] = { 
                r: 0, g: 0, b: 0,
                lastR: 0, lastG: 0, lastB: 0,
                beatCounter: 0
            };
        }
        
        const current = this.history[fixtureId];
        
        // Detect sharp changes (stacchi)
        const deltaR = Math.abs(targetColor.r - current.r);
        const deltaG = Math.abs(targetColor.g - current.g);
        const deltaB = Math.abs(targetColor.b - current.b);
        const totalDelta = deltaR + deltaG + deltaB;
        
        // Se c'è uno stacco forte, risposta immediata
        if (totalDelta > 300 || isBeat || energy > 0.7) {
            // Risposta IMMEDIATA per stacchi
            current.r = targetColor.r;
            current.g = targetColor.g;
            current.b = targetColor.b;
            current.beatCounter = 10; // Mantieni per 10 frame
        } else if (current.beatCounter > 0) {
            // Mantieni il colore del beat per alcuni frame
            current.beatCounter--;
        } else {
            // Smoothing normale solo quando non c'è beat
            const factor = energy > 0.5 ? 0.4 : 0.2; // Più veloce con energia alta
            current.r += (targetColor.r - current.r) * factor;
            current.g += (targetColor.g - current.g) * factor;
            current.b += (targetColor.b - current.b) * factor;
        }
        
        const smoothed = {
            r: Math.floor(current.r),
            g: Math.floor(current.g),
            b: Math.floor(current.b)
        };
        
        this.history[fixtureId] = current;
        return smoothed;
    }

    reset() {
        this.history = {};
    }
}