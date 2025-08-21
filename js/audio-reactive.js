// Audio Reactive Module - Using Native Web Audio API
class AudioReactive {
    constructor(app) {
        this.app = app;
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.source = null;
        this.dataArray = null;
        this.freqDataArray = null;
        this.isActive = false;
        this.mode = 'colors';
        this.sensitivity = 5;
        this.visualizerCanvas = null;
        this.visualizerCtx = null;
        this.animationId = null;
        
        // FFT Configuration
        this.fftSize = 2048;
        this.bufferLength = 0;
        
        // Smoothing per transizioni più fluide
        this.lastValues = {
            bass: 0,
            mid: 0,
            treble: 0,
            energy: 0
        };
        
        // Beat detection nativo con threshold visibile
        this.beatDetector = {
            lastEnergy: 0,
            energyHistory: [],
            beatThreshold: 1.3,
            lastBeat: 0,
            beatCooldown: 200, // ms
            beatCount: 0,
            currentEnergy: 0,
            averageEnergy: 0,
            beatAnimation: 0 // Per animazione visiva del beat
        };
        
        // Controllo strobo per teste mobili
        this.strobeControl = {
            enabled: false,
            lastStrobeTime: 0,
            strobeDuration: 50, // ms - durata del flash
            strobeCooldown: 500, // ms - tempo minimo tra flash
            intensity: 0.7 // soglia energia per attivare strobo
        };
        
        // Frequency ranges (basate su sample rate 44100Hz)
        this.frequencyRanges = {
            subBass: { min: 20, max: 60 },      // 20-60 Hz
            bass: { min: 60, max: 250 },        // 60-250 Hz
            lowMid: { min: 250, max: 500 },     // 250-500 Hz
            mid: { min: 500, max: 2000 },       // 500-2000 Hz
            highMid: { min: 2000, max: 4000 },  // 2000-4000 Hz
            treble: { min: 4000, max: 8000 },   // 4000-8000 Hz
            highTreble: { min: 8000, max: 20000 } // 8000-20000 Hz
        };
    }

    async initialize() {
        try {
            this.visualizerCanvas = document.getElementById('audio-visualizer');
            if (this.visualizerCanvas) {
                this.visualizerCtx = this.visualizerCanvas.getContext('2d');
                this.resizeCanvas();
            }

            // Setup controls
            const toggleBtn = document.getElementById('toggle-audio');
            const sensitivitySlider = document.getElementById('audio-sensitivity');
            const modeSelect = document.getElementById('audio-mode');

            if (toggleBtn) {
                toggleBtn.addEventListener('click', () => this.toggle());
            }

            if (sensitivitySlider) {
                sensitivitySlider.addEventListener('input', (e) => {
                    this.sensitivity = parseInt(e.target.value);
                    // Aggiorna threshold basato sulla sensibilità
                    // Sensibilità alta = threshold più basso (più sensibile ai beat)
                    this.beatDetector.beatThreshold = 2.0 - (this.sensitivity / 10); // Range: 1.9 (sens=1) a 1.0 (sens=10)
                    document.getElementById('audio-sensitivity-value').textContent = this.sensitivity;
                });
            }

            if (modeSelect) {
                modeSelect.addEventListener('change', (e) => {
                    this.mode = e.target.value;
                });
            }

            window.addEventListener('resize', () => this.resizeCanvas());
            
            DMXMonitor.add('[AUDIO] Sistema audio reactive inizializzato', 'success');
            
        } catch (error) {
            console.error('Errore inizializzazione audio reactive:', error);
            DMXMonitor.add('[AUDIO] Errore inizializzazione: ' + error.message, 'error');
        }
    }

    resizeCanvas() {
        if (this.visualizerCanvas) {
            const rect = this.visualizerCanvas.getBoundingClientRect();
            // Assicurati che il canvas abbia dimensioni minime
            this.visualizerCanvas.width = Math.max(rect.width, 300);
            this.visualizerCanvas.height = Math.max(rect.height, 80);
            
            // Se il canvas è attivo, ridisegna
            if (this.isActive) {
                this.drawVisualizerWithIndicators();
            } else {
                // Mostra messaggio quando inattivo
                this.visualizerCtx.fillStyle = 'rgba(0, 0, 0, 0.95)';
                this.visualizerCtx.fillRect(0, 0, this.visualizerCanvas.width, this.visualizerCanvas.height);
                this.visualizerCtx.font = '11px monospace';
                this.visualizerCtx.fillStyle = 'rgba(100, 100, 100, 0.8)';
                this.visualizerCtx.textAlign = 'center';
                this.visualizerCtx.fillText('🎤 Clicca "Attiva Microfono" per iniziare', this.visualizerCanvas.width / 2, this.visualizerCanvas.height / 2);
                this.visualizerCtx.textAlign = 'left';
            }
        }
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
            // Richiedi accesso al microfono
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: { 
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                } 
            });

            // Crea audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Crea analyser node
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = this.fftSize;
            this.analyser.smoothingTimeConstant = 0.8;
            this.analyser.minDecibels = -90;
            this.analyser.maxDecibels = -10;
            
            // Setup buffer
            this.bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(this.bufferLength);
            this.freqDataArray = new Uint8Array(this.bufferLength);
            
            // Connetti microfono
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            this.microphone.connect(this.analyser);
            
            // Imposta threshold iniziale basato sulla sensibilità
            this.beatDetector.beatThreshold = 2.0 - (this.sensitivity / 10);
            
            this.isActive = true;
            this.updateUI();
            this.animate();
            
            DMXMonitor.add('[AUDIO] Microfono attivato - FFT Size: ' + this.fftSize, 'success');
            
        } catch (error) {
            console.error('Errore avvio audio reactive:', error);
            DMXMonitor.add('[AUDIO] Errore: ' + error.message, 'error');
            this.updateUI();
        }
    }

    stop() {
        if (this.microphone) {
            this.microphone.disconnect();
            const stream = this.microphone.mediaStream;
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        }
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        this.isActive = false;
        this.analyser = null;
        this.microphone = null;
        this.dataArray = null;
        this.freqDataArray = null;
        
        // Clear visualizer
        if (this.visualizerCtx && this.visualizerCanvas) {
            this.visualizerCtx.clearRect(0, 0, this.visualizerCanvas.width, this.visualizerCanvas.height);
        }
        
        // Reset beat detector
        this.beatDetector.energyHistory = [];
        this.beatDetector.lastBeat = 0;
        this.beatDetector.beatCount = 0;
        this.beatDetector.currentEnergy = 0;
        this.beatDetector.averageEnergy = 0;
        
        this.updateUI();
        DMXMonitor.add('[AUDIO] Microfono disattivato', 'system');
    }

    // Converte frequenza Hz in indice del bin FFT
    getFrequencyIndex(frequency) {
        const nyquist = this.audioContext.sampleRate / 2;
        return Math.round(frequency / nyquist * this.bufferLength);
    }

    // Ottiene il valore medio di una banda di frequenza
    getFrequencyBandAverage(minFreq, maxFreq) {
        if (!this.audioContext || !this.freqDataArray) return 0;
        
        const minIndex = this.getFrequencyIndex(minFreq);
        const maxIndex = this.getFrequencyIndex(maxFreq);
        
        let sum = 0;
        let count = 0;
        
        for (let i = minIndex; i <= maxIndex && i < this.bufferLength; i++) {
            sum += this.freqDataArray[i];
            count++;
        }
        
        return count > 0 ? (sum / count) / 255 : 0;
    }

    analyzeFrequencies() {
        if (!this.analyser || !this.freqDataArray) {
            return {
                bass: 0,
                mid: 0,
                treble: 0,
                energy: 0,
                spectrum: null
            };
        }
        
        // Ottieni dati frequenza
        this.analyser.getByteFrequencyData(this.freqDataArray);
        
        // Analizza bande di frequenza
        const subBass = this.getFrequencyBandAverage(
            this.frequencyRanges.subBass.min, 
            this.frequencyRanges.subBass.max
        );
        const bass = this.getFrequencyBandAverage(
            this.frequencyRanges.bass.min, 
            this.frequencyRanges.bass.max
        );
        const lowMid = this.getFrequencyBandAverage(
            this.frequencyRanges.lowMid.min, 
            this.frequencyRanges.lowMid.max
        );
        const mid = this.getFrequencyBandAverage(
            this.frequencyRanges.mid.min, 
            this.frequencyRanges.mid.max
        );
        const highMid = this.getFrequencyBandAverage(
            this.frequencyRanges.highMid.min, 
            this.frequencyRanges.highMid.max
        );
        const treble = this.getFrequencyBandAverage(
            this.frequencyRanges.treble.min, 
            this.frequencyRanges.treble.max
        );
        
        // Combina sub-bass con bass per un bass più potente
        const combinedBass = Math.min(1, (subBass * 0.3 + bass * 0.7) * 1.2);
        const combinedMid = Math.min(1, (lowMid * 0.3 + mid * 0.5 + highMid * 0.2));
        const combinedTreble = Math.min(1, treble * 1.1);
        
        // Applica sensibilità
        const sensitivityFactor = this.sensitivity / 5;
        const adjustedBass = Math.min(1, combinedBass * sensitivityFactor);
        const adjustedMid = Math.min(1, combinedMid * sensitivityFactor);
        const adjustedTreble = Math.min(1, combinedTreble * sensitivityFactor);
        
        // Smoothing con fattore dinamico basato sulla sensibilità
        const smoothingFactor = this.sensitivity > 7 ? 0.1 : 0.3; // Meno smoothing ad alta sensibilità
        this.lastValues.bass = this.lastValues.bass * (1 - smoothingFactor) + adjustedBass * smoothingFactor;
        this.lastValues.mid = this.lastValues.mid * (1 - smoothingFactor) + adjustedMid * smoothingFactor;
        this.lastValues.treble = this.lastValues.treble * (1 - smoothingFactor) + adjustedTreble * smoothingFactor;
        
        // Energia totale
        const energy = (this.lastValues.bass * 0.5 + this.lastValues.mid * 0.3 + this.lastValues.treble * 0.2);
        this.lastValues.energy = this.lastValues.energy * 0.7 + energy * 0.3;
        
        return {
            bass: this.lastValues.bass,
            mid: this.lastValues.mid,
            treble: this.lastValues.treble,
            energy: this.lastValues.energy,
            spectrum: {
                subBass,
                bass,
                lowMid,
                mid,
                highMid,
                treble
            }
        };
    }

    detectBeat(energy) {
        // Aggiorna energia corrente per visualizzazione
        this.beatDetector.currentEnergy = energy;
        
        // Aggiungi energia alla storia
        this.beatDetector.energyHistory.push(energy);
        
        // Mantieni solo gli ultimi 43 campioni (~1 secondo a 43fps)
        if (this.beatDetector.energyHistory.length > 43) {
            this.beatDetector.energyHistory.shift();
        }
        
        // Calcola media energia
        const avgEnergy = this.beatDetector.energyHistory.reduce((a, b) => a + b, 0) / 
                         this.beatDetector.energyHistory.length;
        
        this.beatDetector.averageEnergy = avgEnergy;
        
        const now = Date.now();
        
        // Rileva beat se energia supera la soglia
        if (energy > avgEnergy * this.beatDetector.beatThreshold && 
            now - this.beatDetector.lastBeat > this.beatDetector.beatCooldown) {
            
            this.beatDetector.lastBeat = now;
            this.beatDetector.beatCount++;
            this.beatDetector.beatAnimation = 1.0; // Trigger animazione
            
            return {
                detected: true,
                count: this.beatDetector.beatCount,
                strength: energy / (avgEnergy * this.beatDetector.beatThreshold)
            };
        }
        
        // Decay animazione beat
        this.beatDetector.beatAnimation *= 0.9;
        
        return {
            detected: false,
            count: this.beatDetector.beatCount,
            strength: 0
        };
    }

    animate() {
        if (!this.isActive) return;
        
        this.animationId = requestAnimationFrame(() => this.animate());
        
        // Analizza frequenze
        const analysis = this.analyzeFrequencies();
        
        // Rileva beat
        const beat = this.detectBeat(analysis.energy);
        
        // Applica effetti DMX
        this.applyEffects({ ...analysis, beat });
        
        // Disegna visualizer con indicatori
        this.drawVisualizerWithIndicators();
    }

    applyEffects(analysis) {
        const { bass, mid, treble, energy, beat } = analysis;
        
        this.app.fixtures.forEach(fixture => {
            switch (this.mode) {
                case 'colors':
                    this.applyColorEffect(fixture, bass, mid, treble);
                    break;
                    
                case 'intensity':
                    this.applyIntensityEffect(fixture, energy);
                    break;
                    
                case 'movement':
                    if (fixture.type === 'moving-head') {
                        this.applyMovementEffect(fixture, bass, treble);
                    }
                    this.applyColorEffect(fixture, bass, mid, treble);
                    break;
                    
                case 'strobe':
                    this.applyStrobeEffect(fixture, energy, beat);
                    break;
                    
                case 'full':
                    this.applyFullEffect(fixture, bass, mid, treble, energy, beat);
                    break;
            }
        });
    }

    applyColorEffect(fixture, bass, mid, treble) {
        if (fixture.type === 'moving-head') {
            // RGB Front
            fixture.values[7] = Math.floor(bass * 255);
            fixture.values[8] = Math.floor(mid * 255);
            fixture.values[9] = Math.floor(treble * 255);
            
            // RGB Back (invertiti per contrasto)
            fixture.values[10] = Math.floor(treble * 255);
            fixture.values[11] = Math.floor(bass * 255);
            fixture.values[12] = Math.floor(mid * 255);
            
            // Update DMX
            for (let i = 7; i <= 12; i++) {
                this.app.dmxController.setChannel(fixture.startChannel + i, fixture.values[i]);
            }
        } else if (fixture.type === 'par' || fixture.type === 'par-led') {
            fixture.values[2] = Math.floor(bass * 255);
            fixture.values[3] = Math.floor(mid * 255);
            fixture.values[4] = Math.floor(treble * 255);
            
            for (let i = 2; i <= 4; i++) {
                this.app.dmxController.setChannel(fixture.startChannel + i, fixture.values[i]);
            }
        } else if (fixture.type === 'fixed-light') {
            // RGBW
            fixture.values[1] = Math.floor(bass * 255);
            fixture.values[2] = Math.floor(mid * 255);
            fixture.values[3] = Math.floor(treble * 255);
            fixture.values[4] = Math.floor(energy * 100); // White basato su energia
            
            for (let i = 1; i <= 4; i++) {
                this.app.dmxController.setChannel(fixture.startChannel + i, fixture.values[i]);
            }
        }
        
        this.app.fixtureManager.updateFixtureColor(fixture);
    }

    applyIntensityEffect(fixture, energy) {
        const intensity = Math.floor(energy * 255);
        
        if (fixture.type === 'moving-head') {
            fixture.values[4] = intensity; // Dimmer
            this.app.dmxController.setChannel(fixture.startChannel + 4, intensity);
        } else if (fixture.type === 'par' || fixture.type === 'par-led') {
            fixture.values[0] = intensity; // Master dimmer
            this.app.dmxController.setChannel(fixture.startChannel, intensity);
        } else if (fixture.type === 'fixed-light') {
            fixture.values[0] = intensity; // Dimmer
            this.app.dmxController.setChannel(fixture.startChannel, intensity);
        }
    }

    applyMovementEffect(fixture, bass, treble) {
        if (fixture.type !== 'moving-head') return;
        
        // Pan basato sui bassi (movimento più limitato)
        const pan = 128 + Math.floor((bass - 0.5) * 100); // Ridotto da 255 a 100
        fixture.values[0] = Math.max(0, Math.min(255, pan));
        
        // Tilt basato sugli alti (movimento più limitato)
        const tilt = 128 + Math.floor((treble - 0.5) * 60); // Ridotto da 128 a 60
        fixture.values[2] = Math.max(0, Math.min(255, tilt));
        
        this.app.dmxController.setChannel(fixture.startChannel, fixture.values[0]);
        this.app.dmxController.setChannel(fixture.startChannel + 2, fixture.values[2]);
    }

    applyStrobeEffect(fixture, energy, beat) {
        const now = Date.now();
        
        if (fixture.type === 'moving-head') {
            // Strobo MOLTO più limitato per teste mobili
            // Solo su beat forti e con cooldown lungo
            if (beat.detected && 
                energy > 0.8 && // Solo su energie molto alte
                now - this.strobeControl.lastStrobeTime > this.strobeControl.strobeCooldown) {
                
                fixture.values[5] = 200; // Strobo moderato invece di 255
                this.strobeControl.lastStrobeTime = now;
                
                // Auto-spegnimento dopo durata breve
                setTimeout(() => {
                    fixture.values[5] = 0;
                    this.app.dmxController.setChannel(fixture.startChannel + 5, 0);
                }, this.strobeControl.strobeDuration);
            } else {
                fixture.values[5] = 0;
            }
            
            this.app.dmxController.setChannel(fixture.startChannel + 5, fixture.values[5]);
            
        } else if (fixture.type === 'par' || fixture.type === 'par-led') {
            // PAR può avere strobo più frequente
            fixture.values[6] = beat.detected ? 11 : 0; // Mode 11 = strobe
            this.app.dmxController.setChannel(fixture.startChannel + 6, fixture.values[6]);
            
        } else if (fixture.type === 'fixed-light') {
            const strobeValue = beat.detected ? 200 : 0;
            fixture.values[7] = strobeValue;
            this.app.dmxController.setChannel(fixture.startChannel + 7, strobeValue);
        }
    }

    applyFullEffect(fixture, bass, mid, treble, energy, beat) {
        this.applyColorEffect(fixture, bass, mid, treble);
        this.applyIntensityEffect(fixture, energy);
        
        if (fixture.type === 'moving-head') {
            this.applyMovementEffect(fixture, bass, treble);
        }
        
        // Strobo solo su beat molto forti
        if (beat.detected && energy > 0.85) {
            this.applyStrobeEffect(fixture, energy, beat);
        }
    }

    drawVisualizerWithIndicators() {
        if (!this.visualizerCtx || !this.visualizerCanvas) return;
        
        const width = this.visualizerCanvas.width;
        const height = this.visualizerCanvas.height;
        
        // Clear canvas completamente
        this.visualizerCtx.fillStyle = 'rgba(0, 0, 0, 0.95)';
        this.visualizerCtx.fillRect(0, 0, width, height);
        
        // Se non ci sono dati, mostra messaggio
        if (!this.freqDataArray || !this.isActive) {
            this.visualizerCtx.font = '12px monospace';
            this.visualizerCtx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            this.visualizerCtx.textAlign = 'center';
            this.visualizerCtx.fillText('Attiva il microfono per vedere l\'analisi', width / 2, height / 2);
            this.visualizerCtx.textAlign = 'left';
            return;
        }
        
        // === SEZIONE 1: Barre di frequenza (60% dell'altezza) ===
        const barsHeight = height * 0.6;
        const barCount = 32; // Ridotto per barre più visibili
        const barWidth = (width / barCount) - 2;
        const barSpacing = 2;
        
        // Disegna le barre di frequenza
        for (let i = 0; i < barCount; i++) {
            const freqIndex = Math.floor((i / barCount) * this.bufferLength * 0.5); // Usa solo metà dello spettro
            const value = this.freqDataArray[freqIndex] || 0;
            const barHeight = (value / 255) * barsHeight;
            
            // Colore basato sull'intensità
            const intensity = value / 255;
            const hue = 120 - (intensity * 120); // Da verde a rosso
            
            this.visualizerCtx.fillStyle = `hsl(${hue}, 100%, ${50 + intensity * 30}%)`;
            this.visualizerCtx.fillRect(
                i * (barWidth + barSpacing), 
                barsHeight - barHeight, 
                barWidth, 
                barHeight
            );
            
            // Cappello sopra la barra
            if (barHeight > 2) {
                this.visualizerCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                this.visualizerCtx.fillRect(
                    i * (barWidth + barSpacing), 
                    barsHeight - barHeight - 2, 
                    barWidth, 
                    2
                );
            }
        }
        
        // === SEZIONE 2: Indicatore Beat e Threshold (40% dell'altezza) ===
        const indicatorY = barsHeight + 10;
        const indicatorHeight = height - indicatorY - 10;
        const margin = 10;
        
        // Background per la sezione indicatori con bordo
        this.visualizerCtx.fillStyle = 'rgba(20, 20, 30, 0.8)';
        this.visualizerCtx.fillRect(margin, indicatorY, width - margin * 2, indicatorHeight);
        
        // Bordo
        this.visualizerCtx.strokeStyle = 'rgba(100, 100, 100, 0.5)';
        this.visualizerCtx.lineWidth = 1;
        this.visualizerCtx.strokeRect(margin, indicatorY, width - margin * 2, indicatorHeight);
        
        // Calcola dimensioni delle barre
        const maxBarWidth = width - (margin * 4);
        const barHeight = Math.min(20, indicatorHeight / 4);
        const spacing = 5;
        
        // === BARRE DI ENERGIA ===
        const startY = indicatorY + 10;
        
        // 1. Barra Energia Corrente (verde brillante)
        const currentEnergyWidth = Math.min(this.beatDetector.currentEnergy, 1) * maxBarWidth;
        
        // Background della barra
        this.visualizerCtx.fillStyle = 'rgba(0, 50, 0, 0.3)';
        this.visualizerCtx.fillRect(margin * 2, startY, maxBarWidth, barHeight);
        
        // Barra energia corrente
        const greenGradient = this.visualizerCtx.createLinearGradient(margin * 2, 0, margin * 2 + currentEnergyWidth, 0);
        greenGradient.addColorStop(0, 'rgba(0, 150, 0, 0.8)');
        greenGradient.addColorStop(1, 'rgba(0, 255, 0, 1)');
        this.visualizerCtx.fillStyle = greenGradient;
        this.visualizerCtx.fillRect(margin * 2, startY, currentEnergyWidth, barHeight);
        
        // Label
        this.visualizerCtx.font = 'bold 10px monospace';
        this.visualizerCtx.fillStyle = 'rgba(0, 255, 0, 0.9)';
        this.visualizerCtx.fillText('CURRENT', margin * 2, startY - 2);
        this.visualizerCtx.fillText((this.beatDetector.currentEnergy * 100).toFixed(0) + '%', margin * 2 + currentEnergyWidth + 5, startY + barHeight/2 + 3);
        
        // 2. Barra Media Energia (blu)
        const avgY = startY + barHeight + spacing;
        const avgEnergyWidth = Math.min(this.beatDetector.averageEnergy, 1) * maxBarWidth;
        
        // Background della barra
        this.visualizerCtx.fillStyle = 'rgba(0, 0, 50, 0.3)';
        this.visualizerCtx.fillRect(margin * 2, avgY, maxBarWidth, barHeight);
        
        // Barra media
        const blueGradient = this.visualizerCtx.createLinearGradient(margin * 2, 0, margin * 2 + avgEnergyWidth, 0);
        blueGradient.addColorStop(0, 'rgba(0, 100, 200, 0.8)');
        blueGradient.addColorStop(1, 'rgba(0, 150, 255, 1)');
        this.visualizerCtx.fillStyle = blueGradient;
        this.visualizerCtx.fillRect(margin * 2, avgY, avgEnergyWidth, barHeight);
        
        // Label
        this.visualizerCtx.fillStyle = 'rgba(0, 150, 255, 0.9)';
        this.visualizerCtx.fillText('AVERAGE', margin * 2, avgY - 2);
        this.visualizerCtx.fillText((this.beatDetector.averageEnergy * 100).toFixed(0) + '%', margin * 2 + avgEnergyWidth + 5, avgY + barHeight/2 + 3);
        
        // 3. Linea Threshold (rosso verticale)
        const thresholdPosition = Math.min(this.beatDetector.averageEnergy * this.beatDetector.beatThreshold, 1) * maxBarWidth;
        
        this.visualizerCtx.strokeStyle = 'rgba(255, 0, 0, 1)';
        this.visualizerCtx.lineWidth = 3;
        this.visualizerCtx.setLineDash([5, 3]);
        this.visualizerCtx.beginPath();
        this.visualizerCtx.moveTo(margin * 2 + thresholdPosition, startY - 5);
        this.visualizerCtx.lineTo(margin * 2 + thresholdPosition, avgY + barHeight + 5);
        this.visualizerCtx.stroke();
        this.visualizerCtx.setLineDash([]);
        
        // Label threshold
        this.visualizerCtx.fillStyle = 'rgba(255, 0, 0, 1)';
        this.visualizerCtx.font = 'bold 10px monospace';
        this.visualizerCtx.save();
        this.visualizerCtx.translate(margin * 2 + thresholdPosition, startY - 8);
        this.visualizerCtx.rotate(-Math.PI / 4);
        this.visualizerCtx.fillText(`THRESHOLD ${this.beatDetector.beatThreshold.toFixed(1)}x`, 0, 0);
        this.visualizerCtx.restore();
        
        // === INDICATORE BEAT DETECTION (grande e visibile) ===
        if (this.beatDetector.beatAnimation > 0.1) {
            // Beat indicator grande al centro-destra
            const beatX = width - 60;
            const beatY = indicatorY + indicatorHeight / 2;
            const radius = 20 + (this.beatDetector.beatAnimation * 15);
            
            // Cerchio esterno pulsante
            this.visualizerCtx.beginPath();
            this.visualizerCtx.arc(beatX, beatY, radius, 0, Math.PI * 2);
            const beatGradient = this.visualizerCtx.createRadialGradient(beatX, beatY, 0, beatX, beatY, radius);
            beatGradient.addColorStop(0, `rgba(255, 100, 0, ${this.beatDetector.beatAnimation})`);
            beatGradient.addColorStop(0.5, `rgba(255, 50, 0, ${this.beatDetector.beatAnimation * 0.7})`);
            beatGradient.addColorStop(1, `rgba(255, 0, 0, ${this.beatDetector.beatAnimation * 0.3})`);
            this.visualizerCtx.fillStyle = beatGradient;
            this.visualizerCtx.fill();
            
            // Cerchio interno
            this.visualizerCtx.beginPath();
            this.visualizerCtx.arc(beatX, beatY, radius * 0.6, 0, Math.PI * 2);
            this.visualizerCtx.fillStyle = `rgba(255, 255, 255, ${this.beatDetector.beatAnimation * 0.9})`;
            this.visualizerCtx.fill();
            
            // Testo BEAT
            this.visualizerCtx.font = `bold ${12 + this.beatDetector.beatAnimation * 4}px monospace`;
            this.visualizerCtx.fillStyle = `rgba(255, 0, 0, ${this.beatDetector.beatAnimation})`;
            this.visualizerCtx.textAlign = 'center';
            this.visualizerCtx.fillText('BEAT', beatX, beatY + 3);
            this.visualizerCtx.textAlign = 'left';
            
            // Flash effect leggero su tutto il canvas
            this.visualizerCtx.fillStyle = `rgba(255, 255, 255, ${this.beatDetector.beatAnimation * 0.1})`;
            this.visualizerCtx.fillRect(0, 0, width, barsHeight);
        }
        
        // === INFO TEXT ===
        this.visualizerCtx.font = 'bold 11px monospace';
        this.visualizerCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.visualizerCtx.fillText(`MODE: ${this.mode.toUpperCase()}`, 5, 12);
        this.visualizerCtx.fillText(`SENS: ${this.sensitivity}/10`, 120, 12);
        this.visualizerCtx.fillText(`BEATS: ${this.beatDetector.beatCount}`, 200, 12);
        
        // Suggerimento sensibilità con colore
        const suggestion = this.getSensitivitySuggestion();
        if (suggestion) {
            if (suggestion.includes('↑')) {
                this.visualizerCtx.fillStyle = 'rgba(255, 200, 0, 1)';
            } else if (suggestion.includes('↓')) {
                this.visualizerCtx.fillStyle = 'rgba(255, 100, 100, 1)';
            } else if (suggestion.includes('✓')) {
                this.visualizerCtx.fillStyle = 'rgba(0, 255, 100, 1)';
            } else {
                this.visualizerCtx.fillStyle = 'rgba(200, 200, 200, 0.8)';
            }
            this.visualizerCtx.font = 'bold 10px monospace';
            this.visualizerCtx.fillText(suggestion, 5, 25);
        }
    }
    
    getSensitivitySuggestion() {
        const ratio = this.beatDetector.currentEnergy / (this.beatDetector.averageEnergy * this.beatDetector.beatThreshold);
        
        if (this.beatDetector.energyHistory.length < 20) {
            return "Calibrating...";
        }
        
        if (ratio < 0.5 && this.sensitivity < 8) {
            return "↑ Increase sensitivity (signal too weak)";
        } else if (ratio > 1.5 && this.sensitivity > 3) {
            return "↓ Decrease sensitivity (too many beats)";
        } else if (ratio > 0.9 && ratio < 1.1) {
            return "✓ Sensitivity optimal";
        }
        
        return null;
    }

    updateUI() {
        const toggleBtn = document.getElementById('toggle-audio');
        const statusDiv = document.getElementById('audio-status');
        
        if (toggleBtn) {
            toggleBtn.textContent = this.isActive ? '🔇 Disattiva Microfono' : '🎤 Attiva Microfono';
            toggleBtn.className = this.isActive ? 
                'w-full bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-lg transition-all duration-200 font-medium' :
                'w-full bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-lg transition-all duration-200 font-medium';
        }
        
        if (statusDiv) {
            if (this.isActive) {
                const thresholdInfo = `Threshold: ${this.beatDetector.beatThreshold.toFixed(2)}x`;
                statusDiv.innerHTML = `
                    <div class="text-green-400">Microfono attivo</div>
                    <div class="text-xs mt-1">Mode: ${this.mode} | ${thresholdInfo}</div>
                    <div class="text-xs">Beats: ${this.beatDetector.beatCount}</div>
                `;
            } else {
                statusDiv.textContent = 'Microfono disattivato';
                statusDiv.className = 'text-xs text-center text-gray-400';
            }
        }
    }
}