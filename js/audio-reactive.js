// Audio Reactive Controller
class AudioReactive {
    constructor(app) {
        this.app = app;
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.source = null;
        this.dataArray = null;
        this.isActive = false;
        this.sensitivity = 5;
        this.mode = 'colors';
        this.visualizerCanvas = null;
        this.visualizerCtx = null;
        this.beatDetector = new BeatDetector();
        this.lastBeatTime = 0;
        this.beatInterval = null;
    }

    async initialize() {
        this.visualizerCanvas = document.getElementById('audio-visualizer');
        if (this.visualizerCanvas) {
            this.visualizerCtx = this.visualizerCanvas.getContext('2d');
            this.visualizerCanvas.width = this.visualizerCanvas.offsetWidth;
            this.visualizerCanvas.height = this.visualizerCanvas.offsetHeight;
        }

        // Setup event listeners
        document.getElementById('toggle-audio')?.addEventListener('click', () => this.toggle());
        document.getElementById('audio-sensitivity')?.addEventListener('input', (e) => {
            this.sensitivity = parseInt(e.target.value);
            document.getElementById('audio-sensitivity-value').textContent = this.sensitivity;
            
            let description = '';
            if (this.sensitivity <= 3) description = ' (Sottile)';
            else if (this.sensitivity <= 6) description = ' (Normale)';
            else if (this.sensitivity <= 8) description = ' (Forte)';
            else description = ' (Estremo)';
            
            DMXMonitor.add(`[AUDIO] Sensibilità: ${this.sensitivity}${description}`, 'system');
        });
        document.getElementById('audio-mode')?.addEventListener('change', (e) => {
            this.mode = e.target.value;
            DMXMonitor.add(`[AUDIO] Modalità: ${this.mode}`, 'system');
        });
    }

    async toggle() {
        if (this.isActive) {
            this.stop();
        } else {
            await this.start();
        }
    }

    async start() {
        try {
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                } 
            });

            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.analyser.smoothingTimeConstant = 0.8;

            // Connect microphone
            this.source = this.audioContext.createMediaStreamSource(stream);
            this.source.connect(this.analyser);

            // Setup data array
            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);

            this.isActive = true;
            this.microphone = stream;

            // Update UI
            const btn = document.getElementById('toggle-audio');
            btn.textContent = '⏹️ Ferma Microfono';
            btn.classList.remove('bg-green-600');
            btn.classList.add('bg-red-600');

            document.getElementById('audio-status').textContent = 'Microfono attivo';
            DMXMonitor.add('[AUDIO] Microfono attivato', 'success');

            // Start processing
            this.process();

        } catch (error) {
            DMXMonitor.add(`[AUDIO] Errore: ${error.message}`, 'error');
            alert('Impossibile accedere al microfono. Verifica i permessi.');
        }
    }

    stop() {
        this.isActive = false;

        if (this.microphone) {
            this.microphone.getTracks().forEach(track => track.stop());
        }

        if (this.source) {
            this.source.disconnect();
        }

        if (this.audioContext) {
            this.audioContext.close();
        }

        // Clear beat interval if exists
        if (this.beatInterval) {
            clearInterval(this.beatInterval);
            this.beatInterval = null;
        }

        // Reset all fixtures
        this.app.fixtures.forEach(fixture => {
            if (fixture.type === 'moving-head') {
                // Reset movement
                fixture.values[5] = 128; // Center speed
            }
        });

        // Update UI
        const btn = document.getElementById('toggle-audio');
        btn.textContent = '🎤 Attiva Microfono';
        btn.classList.remove('bg-red-600');
        btn.classList.add('bg-green-600');

        document.getElementById('audio-status').textContent = 'Microfono disattivato';
        DMXMonitor.add('[AUDIO] Microfono disattivato', 'system');
    }

    process() {
        if (!this.isActive) return;

        // Get frequency data
        this.analyser.getByteFrequencyData(this.dataArray);

        // Calculate audio levels
        const bass = this.getFrequencyRange(0, 10);
        const mid = this.getFrequencyRange(10, 30);
        const treble = this.getFrequencyRange(30, 80);
        const overall = this.getOverallLevel();

        // Detect beat
        const isBeat = this.beatDetector.detect(bass, overall);

        // Apply effects based on mode
        switch (this.mode) {
            case 'colors':
                this.applyColorEffect(bass, mid, treble);
                break;
            case 'intensity':
                this.applyIntensityEffect(overall);
                break;
            case 'movement':
                this.applyMovementEffect(bass, mid, treble, isBeat);
                break;
            case 'strobe':
                this.applyStrobeEffect(isBeat);
                break;
            case 'full':
                this.applyFullEffect(bass, mid, treble, overall, isBeat);
                break;
        }

        // Update visualizer
        this.updateVisualizer();

        // Continue processing
        requestAnimationFrame(() => this.process());
    }

    getFrequencyRange(start, end) {
        let sum = 0;
        for (let i = start; i < end && i < this.dataArray.length; i++) {
            sum += this.dataArray[i];
        }
        return (sum / (end - start)) / 255; // Normalize to 0-1
    }

    getOverallLevel() {
        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            sum += this.dataArray[i];
        }
        return (sum / this.dataArray.length) / 255; // Normalize to 0-1
    }

    applyColorEffect(bass, mid, treble) {
        const sensitivity = this.sensitivity / 5;
        
        // Rileva picchi (stacchi)
        const threshold = 0.6;
        const isBassHit = bass > threshold;
        const isMidHit = mid > threshold;
        const isTrebleHit = treble > threshold;
        
        this.app.fixtures.forEach(fixture => {
            let r, g, b;
            
            if (isBassHit || isMidHit || isTrebleHit) {
                // Colori PIENI sui picchi
                r = isBassHit ? 255 : 0;
                g = isMidHit ? 255 : 0;
                b = isTrebleHit ? 255 : 0;
                
                // Se tutti e tre sono alti, bianco pieno
                if (isBassHit && isMidHit && isTrebleHit) {
                    r = g = b = 255;
                }
            } else {
                // Mapping normale con più contrasto
                r = bass > 0.3 ? Math.floor(bass * 255 * sensitivity * 1.5) : 0;
                g = mid > 0.3 ? Math.floor(mid * 255 * sensitivity * 1.5) : 0;
                b = treble > 0.3 ? Math.floor(treble * 255 * sensitivity * 1.5) : 0;
            }
            
            // Dimmer basato sull'energia totale
            const overallEnergy = (bass + mid + treble) / 3;
            const dimmer = overallEnergy > threshold ? 255 : Math.floor(100 + overallEnergy * 155 * sensitivity);
            
            this.app.fixtureManager.applyColorToFixture(fixture, r, g, b, dimmer);
        });
    }

    applyIntensityEffect(level) {
        const sensitivity = this.sensitivity / 5;
        const dimmer = Math.floor(level * 255 * sensitivity);
        
        this.app.fixtures.forEach(fixture => {
            const dimmerIndex = fixture.type === 'moving-head' ? 6 : 0;
            fixture.values[dimmerIndex] = dimmer;
            this.app.dmxController.setChannel(fixture.startChannel + dimmerIndex, dimmer);
        });
    }

    applyMovementEffect(bass, mid, treble, isBeat) {
        const sensitivity = this.sensitivity / 5;
        
        this.app.fixtures.forEach(fixture => {
            if (fixture.type === 'moving-head') {
                // Pan based on bass
                const pan = Math.floor(bass * 255 * sensitivity);
                fixture.values[0] = pan;
                this.app.dmxController.setChannel(fixture.startChannel, pan);
                
                // Tilt based on mid
                const tilt = Math.floor(mid * 128 * sensitivity) + 64; // Keep in middle range
                fixture.values[2] = tilt;
                this.app.dmxController.setChannel(fixture.startChannel + 2, tilt);
                
                // Speed based on treble
                const speed = Math.floor((1 - treble) * 255 * sensitivity);
                fixture.values[5] = speed;
                this.app.dmxController.setChannel(fixture.startChannel + 5, speed);
                
                // On beat, trigger movement macro
                if (isBeat) {
                    const autoMove = Math.floor(Math.random() * 50) + 200;
                    fixture.values[16] = autoMove;
                    this.app.dmxController.setChannel(fixture.startChannel + 16, autoMove);
                }
            }
            
            // Colors for all fixtures
            const r = Math.floor(bass * 255 * sensitivity);
            const g = Math.floor(mid * 255 * sensitivity);
            const b = Math.floor(treble * 255 * sensitivity);
            
            this.app.fixtureManager.applyColorToFixture(fixture, r, g, b, 255);
        });
    }

    applyStrobeEffect(isBeat) {
        if (isBeat) {
            this.app.fixtures.forEach(fixture => {
                const strobeIndex = fixture.type === 'moving-head' ? 7 : 
                                  fixture.type === 'par-led' ? 5 : 7;
                
                // Trigger strobe
                fixture.values[strobeIndex] = 200;
                this.app.dmxController.setChannel(fixture.startChannel + strobeIndex, 200);
                
                // Auto-stop after 100ms
                setTimeout(() => {
                    fixture.values[strobeIndex] = 0;
                    this.app.dmxController.setChannel(fixture.startChannel + strobeIndex, 0);
                }, 100);
            });
        }
    }

    applyFullEffect(bass, mid, treble, overall, isBeat) {
        const sensitivity = this.sensitivity / 5;
        
        this.app.fixtures.forEach(fixture => {
            // Colors based on frequency
            const r = Math.floor(bass * 255 * sensitivity);
            const g = Math.floor(mid * 255 * sensitivity);
            const b = Math.floor(treble * 255 * sensitivity);
            
            // Dimmer based on overall level
            const dimmer = Math.floor(overall * 255 * sensitivity);
            
            if (fixture.type === 'moving-head') {
                // Complex movement
                const pan = Math.floor((bass + mid) * 127 * sensitivity);
                const tilt = Math.floor((mid + treble) * 127 * sensitivity);
                const speed = Math.floor((1 - overall) * 255);
                
                fixture.values[0] = pan;
                fixture.values[2] = tilt;
                fixture.values[5] = speed;
                fixture.values[6] = dimmer;
                
                this.app.dmxController.setChannel(fixture.startChannel, pan);
                this.app.dmxController.setChannel(fixture.startChannel + 2, tilt);
                this.app.dmxController.setChannel(fixture.startChannel + 5, speed);
                this.app.dmxController.setChannel(fixture.startChannel + 6, dimmer);
                
                // Beat triggers
                if (isBeat) {
                    // Random color macro
                    const colorMacro = Math.floor(Math.random() * 255);
                    fixture.values[18] = colorMacro;
                    this.app.dmxController.setChannel(fixture.startChannel + 18, colorMacro);
                    
                    // Short strobe
                    fixture.values[7] = 255;
                    this.app.dmxController.setChannel(fixture.startChannel + 7, 255);
                    setTimeout(() => {
                        fixture.values[7] = 0;
                        this.app.dmxController.setChannel(fixture.startChannel + 7, 0);
                    }, 50);
                }
            }
            
            this.app.fixtureManager.applyColorToFixture(fixture, r, g, b, dimmer);
        });
    }

    updateVisualizer() {
        if (!this.visualizerCtx || !this.dataArray) return;

        const width = this.visualizerCanvas.width;
        const height = this.visualizerCanvas.height;
        const barWidth = width / this.dataArray.length;

        // Clear canvas
        this.visualizerCtx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.visualizerCtx.fillRect(0, 0, width, height);

        // Draw frequency bars
        for (let i = 0; i < this.dataArray.length; i++) {
            const barHeight = (this.dataArray[i] / 255) * height;
            
            // Color based on frequency
            const hue = (i / this.dataArray.length) * 360;
            this.visualizerCtx.fillStyle = `hsl(${hue}, 100%, 50%)`;
            
            this.visualizerCtx.fillRect(
                i * barWidth,
                height - barHeight,
                barWidth - 1,
                barHeight
            );
        }
    }
}

// Beat detection algorithm
class BeatDetector {
    constructor() {
        this.history = [];
        this.historySize = 43; // ~1 second at 43fps
        this.threshold = 1.3;
        this.lastBeat = 0;
        this.minInterval = 200; // Minimum ms between beats
    }

    detect(bass, overall) {
        const energy = bass * 0.7 + overall * 0.3;
        this.history.push(energy);
        
        if (this.history.length > this.historySize) {
            this.history.shift();
        }
        
        if (this.history.length < this.historySize) {
            return false;
        }
        
        const average = this.history.reduce((a, b) => a + b) / this.history.length;
        const now = Date.now();
        
        if (energy > average * this.threshold && 
            now - this.lastBeat > this.minInterval) {
            this.lastBeat = now;
            return true;
        }
        
        return false;
    }
}