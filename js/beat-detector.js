// Advanced Beat Detector with Meyda audio analysis
class BeatDetector {
    constructor() {
        this.energyHistory = [];
        this.spectralFluxHistory = [];
        this.onsetHistory = [];
        this.historySize = 43; // ~1 second at 43fps
        this.threshold = 1.3;
        this.lastBeat = 0;
        this.minInterval = 150; // Minimum ms between beats
        this.beatCount = 0;
        
        // Advanced detection parameters
        this.spectralCentroidHistory = [];
        this.zcr = 0; // Zero crossing rate
        this.rms = 0; // Root mean square
        
        // Adaptive threshold
        this.adaptiveThreshold = 1.3;
        this.beatStrength = 0;
        
        // Tempo tracking
        this.beatIntervals = [];
        this.estimatedBPM = 0;
        
        // Meyda analyzer (if available)
        this.meydaAnalyzer = null;
        this.audioContext = null;
        
        // Pattern detection
        this.beatPattern = [];
        this.maxPatternLength = 16;
    }

    // Initialize Meyda if available
    initializeMeyda(audioContext, source) {
        this.audioContext = audioContext;
        
        // Check if Meyda is available
        if (typeof Meyda !== 'undefined') {
            try {
                this.meydaAnalyzer = Meyda.createMeydaAnalyzer({
                    audioContext: audioContext,
                    source: source,
                    bufferSize: 512,
                    featureExtractors: [
                        'rms',
                        'energy',
                        'zcr',
                        'spectralCentroid',
                        'spectralFlux',
                        'spectralRolloff',
                        'mfcc',
                        'loudness',
                        'perceptualSpread',
                        'perceptualSharpness'
                    ],
                    callback: (features) => {
                        this.processMeydaFeatures(features);
                    }
                });
                
                console.log('[BEAT] ✅ Meyda analyzer ATTIVO con successo!');
                DMXMonitor.add('[MEYDA] ✅ Libreria Meyda ATTIVA - Analisi audio avanzata abilitata', 'success');
                return true;
            } catch (error) {
                console.warn('[BEAT] ⚠️ Meyda initialization failed:', error);
                DMXMonitor.add('[MEYDA] ⚠️ Meyda non disponibile - Usando fallback', 'warning');
                return false;
            }
        }
        
        console.log('[BEAT] ❌ Meyda NOT available - Using fallback detector');
        DMXMonitor.add('[MEYDA] ❌ Libreria Meyda NON TROVATA - Usando detector base', 'error');
        return false;
    }

    processMeydaFeatures(features) {
        if (!features) return;
        
        // Update advanced metrics
        this.rms = features.rms || 0;
        this.zcr = features.zcr || 0;
        
        // Spectral features for better beat detection
        const spectralFlux = features.spectralFlux || 0;
        const spectralCentroid = features.spectralCentroid || 0;
        const energy = features.energy || 0;
        
        // Add to history
        this.spectralFluxHistory.push(spectralFlux);
        this.spectralCentroidHistory.push(spectralCentroid);
        this.energyHistory.push(energy);
        
        // Keep history size limited
        if (this.spectralFluxHistory.length > this.historySize) {
            this.spectralFluxHistory.shift();
            this.spectralCentroidHistory.shift();
            this.energyHistory.shift();
        }
        
        // Detect onset using spectral flux
        const isOnset = this.detectOnset(spectralFlux);
        if (isOnset) {
            this.onsetHistory.push(Date.now());
            if (this.onsetHistory.length > 10) {
                this.onsetHistory.shift();
            }
        }
        
        // Update BPM estimation
        this.updateBPMEstimate();
    }

    // Main beat detection function
    detect(dataArray) {
        const energy = this.calculateEnergy(dataArray);
        const spectralFlux = this.calculateSpectralFlux(dataArray);
        
        // Add to history
        this.energyHistory.push(energy);
        this.spectralFluxHistory.push(spectralFlux);
        
        if (this.energyHistory.length > this.historySize) {
            this.energyHistory.shift();
        }
        if (this.spectralFluxHistory.length > this.historySize) {
            this.spectralFluxHistory.shift();
        }
        
        if (this.energyHistory.length < 10) {
            return { detected: false, strength: 0, count: this.beatCount, bpm: this.estimatedBPM };
        }
        
        // Calculate adaptive threshold
        this.updateAdaptiveThreshold();
        
        const now = Date.now();
        const timeSinceLastBeat = now - this.lastBeat;
        
        // Multi-criteria beat detection
        const energyBeat = this.detectEnergyBeat(energy);
        const fluxBeat = this.detectSpectralFluxBeat(spectralFlux);
        const timingOk = timeSinceLastBeat > this.minInterval;
        
        // Combined detection
        const isBeat = timingOk && (energyBeat || fluxBeat);
        
        if (isBeat) {
            this.lastBeat = now;
            this.beatCount++;
            
            // Track beat intervals for BPM
            if (this.beatIntervals.length > 0) {
                this.beatIntervals.push(timeSinceLastBeat);
                if (this.beatIntervals.length > 10) {
                    this.beatIntervals.shift();
                }
            } else {
                this.beatIntervals.push(timeSinceLastBeat);
            }
            
            // Calculate beat strength
            this.beatStrength = this.calculateBeatStrength(energy, spectralFlux);
            
            // Add to pattern
            this.beatPattern.push(1);
            if (this.beatPattern.length > this.maxPatternLength) {
                this.beatPattern.shift();
            }
            
            // Update BPM
            this.updateBPMEstimate();
            
            return { 
                detected: true, 
                strength: this.beatStrength, 
                count: this.beatCount,
                bpm: this.estimatedBPM,
                pattern: [...this.beatPattern]
            };
        } else {
            // Add non-beat to pattern
            this.beatPattern.push(0);
            if (this.beatPattern.length > this.maxPatternLength) {
                this.beatPattern.shift();
            }
        }
        
        return { 
            detected: false, 
            strength: 0, 
            count: this.beatCount,
            bpm: this.estimatedBPM,
            pattern: [...this.beatPattern]
        };
    }

    // Enhanced beat detection with custom threshold
    detectWithThreshold(bass, overall, customThreshold) {
        const energy = bass * 0.7 + overall * 0.3;
        this.energyHistory.push(energy);
        
        if (this.energyHistory.length > this.historySize) {
            this.energyHistory.shift();
        }
        
        if (this.energyHistory.length < this.historySize) {
            return false;
        }
        
        const average = this.energyHistory.reduce((a, b) => a + b) / this.energyHistory.length;
        const now = Date.now();
        
        // Use custom threshold for mood-aware detection
        const effectiveThreshold = this.threshold * (1 + customThreshold);
        
        if (energy > average * effectiveThreshold && 
            now - this.lastBeat > this.minInterval) {
            this.lastBeat = now;
            this.beatCount++;
            return true;
        }
        
        return false;
    }

    // Calculate energy from frequency data
    calculateEnergy(dataArray) {
        if (!dataArray || dataArray.length === 0) return 0;
        
        // Focus on bass frequencies (0-250Hz approx)
        const bassEnd = Math.min(32, dataArray.length);
        let sum = 0;
        
        for (let i = 0; i < bassEnd; i++) {
            // Weight lower frequencies more
            const weight = 1 + (1 - i / bassEnd) * 0.5;
            sum += dataArray[i] * dataArray[i] * weight;
        }
        
        return Math.sqrt(sum / bassEnd) / 255;
    }

    // Calculate spectral flux for onset detection
    calculateSpectralFlux(dataArray) {
        if (!dataArray || dataArray.length === 0) return 0;
        
        if (!this.previousSpectrum) {
            this.previousSpectrum = new Float32Array(dataArray.length);
        }
        
        let flux = 0;
        for (let i = 0; i < dataArray.length; i++) {
            const diff = dataArray[i] - this.previousSpectrum[i];
            if (diff > 0) {
                flux += diff;
            }
        }
        
        // Store current spectrum for next calculation
        this.previousSpectrum = new Float32Array(dataArray);
        
        return flux / dataArray.length;
    }

    // Detect beat based on energy
    detectEnergyBeat(currentEnergy) {
        if (this.energyHistory.length < 10) return false;
        
        const recentAvg = this.energyHistory.slice(-10).reduce((a, b) => a + b) / 10;
        const historicalAvg = this.energyHistory.reduce((a, b) => a + b) / this.energyHistory.length;
        
        return currentEnergy > historicalAvg * this.adaptiveThreshold && 
               currentEnergy > recentAvg * 1.1;
    }

    // Detect beat based on spectral flux
    detectSpectralFluxBeat(currentFlux) {
        if (this.spectralFluxHistory.length < 10) return false;
        
        const avg = this.spectralFluxHistory.reduce((a, b) => a + b) / this.spectralFluxHistory.length;
        const std = this.calculateStandardDeviation(this.spectralFluxHistory);
        
        return currentFlux > avg + std * 1.5;
    }

    // Detect onset (sudden change in spectral content)
    detectOnset(spectralFlux) {
        if (this.spectralFluxHistory.length < 3) return false;
        
        const recent = this.spectralFluxHistory.slice(-3);
        const avg = recent.reduce((a, b) => a + b) / recent.length;
        
        return spectralFlux > avg * 2;
    }

    // Update adaptive threshold based on recent history
    updateAdaptiveThreshold() {
        if (this.energyHistory.length < this.historySize) return;
        
        const std = this.calculateStandardDeviation(this.energyHistory);
        const avg = this.energyHistory.reduce((a, b) => a + b) / this.energyHistory.length;
        
        // Adjust threshold based on signal variance
        if (std / avg > 0.5) {
            // High variance - lower threshold
            this.adaptiveThreshold = 1.2;
        } else if (std / avg > 0.3) {
            // Medium variance
            this.adaptiveThreshold = 1.3;
        } else {
            // Low variance - higher threshold
            this.adaptiveThreshold = 1.4;
        }
    }

    // Calculate beat strength (0-1)
    calculateBeatStrength(energy, spectralFlux) {
        const energyAvg = this.energyHistory.reduce((a, b) => a + b) / this.energyHistory.length;
        const fluxAvg = this.spectralFluxHistory.reduce((a, b) => a + b) / this.spectralFluxHistory.length;
        
        const energyStrength = Math.min((energy / energyAvg - 1) / 0.5, 1);
        const fluxStrength = Math.min((spectralFlux / fluxAvg - 1) / 0.5, 1);
        
        return Math.max(energyStrength, fluxStrength);
    }

    // Estimate BPM from beat intervals
    updateBPMEstimate() {
        if (this.beatIntervals.length < 3) return;
        
        // Remove outliers
        const sorted = [...this.beatIntervals].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        
        // Filter intervals within reasonable range
        const filtered = this.beatIntervals.filter(
            interval => interval > median * 0.7 && interval < median * 1.3
        );
        
        if (filtered.length > 0) {
            const avgInterval = filtered.reduce((a, b) => a + b) / filtered.length;
            this.estimatedBPM = Math.round(60000 / avgInterval);
            
            // Clamp to reasonable range
            this.estimatedBPM = Math.max(60, Math.min(200, this.estimatedBPM));
        }
    }

    // Calculate standard deviation
    calculateStandardDeviation(values) {
        const avg = values.reduce((a, b) => a + b) / values.length;
        const squareDiffs = values.map(value => Math.pow(value - avg, 2));
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b) / values.length;
        return Math.sqrt(avgSquareDiff);
    }

    // Detect if we're in a drop (high energy section)
    detectDrop(currentEnergy) {
        if (this.energyHistory.length < 20) return false;
        
        const recent = this.energyHistory.slice(-5).reduce((a, b) => a + b) / 5;
        const previous = this.energyHistory.slice(0, 15).reduce((a, b) => a + b) / 15;
        
        return recent > previous * 2;
    }

    // Detect if we're in a build-up
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
        
        return increasing;
    }

    // Get beat phase (0-1) for syncing effects
    getBeatPhase() {
        if (this.estimatedBPM === 0) return 0;
        
        const msPerBeat = 60000 / this.estimatedBPM;
        const timeSinceLastBeat = Date.now() - this.lastBeat;
        
        return Math.min(timeSinceLastBeat / msPerBeat, 1);
    }

    // Reset detector
    reset() {
        this.energyHistory = [];
        this.spectralFluxHistory = [];
        this.onsetHistory = [];
        this.beatIntervals = [];
        this.beatPattern = [];
        this.beatCount = 0;
        this.lastBeat = 0;
        this.estimatedBPM = 0;
        this.previousSpectrum = null;
    }

    // Start Meyda analysis
    start() {
        if (this.meydaAnalyzer) {
            this.meydaAnalyzer.start();
        }
    }

    // Stop Meyda analysis
    stop() {
        if (this.meydaAnalyzer) {
            this.meydaAnalyzer.stop();
        }
    }
}