// DMX communication controller
class DMXController {
    constructor() {
        this.port = null;
        this.writer = null;
        this.isConnected = false;
        this.dmxChannels = new Array(512).fill(0);
        this.dmxLoopRunning = false;
        this.dmxLoopInterval = null;
        this.dmxFrameCounter = 0;
        this.dmxRefreshRate = 30; // milliseconds (33Hz)
    }

    async connect() {
        if (!('serial' in navigator)) {
            DMXMonitor.add('[ERRORE] Web Serial API non supportata. Usa Chrome/Edge.', 'error');
            return false;
        }

        try {
            this.port = await navigator.serial.requestPort();
            
            await this.port.open({ 
                baudRate: 250000,
                dataBits: 8,
                stopBits: 2,
                parity: 'none',
                bufferSize: 4096,
                flowControl: 'none'
            });
            
            this.writer = this.port.writable.getWriter();
            this.isConnected = true;
            
            DMXMonitor.add('[CONNESSIONE] DMX512 connesso', 'success');
            
            // Initialize all channels to 0
            for (let i = 0; i < 512; i++) {
                this.dmxChannels[i] = 0;
            }
            
            // Start continuous loop
            await this.startContinuousDmxLoop();
            
            return true;
        } catch (error) {
            DMXMonitor.add(`[ERRORE] Connessione: ${error.message}`, 'error');
            return false;
        }
    }

    async disconnect() {
        this.stopContinuousDmxLoop();
        
        // Send blackout before disconnecting
        if (this.isConnected && this.writer) {
            for (let i = 0; i < 512; i++) {
                this.dmxChannels[i] = 0;
            }
            await this.sendDmxFrame();
            await this.delay(50);
        }
        
        if (this.writer) {
            await this.writer.close();
            this.writer = null;
        }
        if (this.port) {
            await this.port.close();
            this.port = null;
        }

        this.isConnected = false;
        this.dmxFrameCounter = 0;
        DMXMonitor.add('[CONNESSIONE] Disconnesso', 'system');
    }

    async startContinuousDmxLoop() {
        if (this.dmxLoopRunning) return;
        
        this.dmxLoopRunning = true;
        DMXMonitor.add(`[DMX] Loop continuo avviato (${Math.round(1000/this.dmxRefreshRate)}Hz)`, 'success');
        
        // Use setInterval for background operation
        this.dmxLoopInterval = setInterval(async () => {
            if (!this.dmxLoopRunning || !this.isConnected || !this.writer) {
                clearInterval(this.dmxLoopInterval);
                this.dmxLoopRunning = false;
                return;
            }
            
            await this.sendDmxFrame();
            this.dmxFrameCounter++;
            
            // Log every 100 frames
            if (this.dmxFrameCounter % 100 === 0) {
                const fps = Math.round(1000 / this.dmxRefreshRate);
                DMXMonitor.add(`[DMX] ${this.dmxFrameCounter} frame @ ${fps}Hz`, 'system');
            }
        }, this.dmxRefreshRate);
    }

    stopContinuousDmxLoop() {
        this.dmxLoopRunning = false;
        if (this.dmxLoopInterval) {
            clearInterval(this.dmxLoopInterval);
            this.dmxLoopInterval = null;
        }
        DMXMonitor.add('[DMX] Loop continuo fermato', 'system');
    }

    async sendDmxFrame() {
        if (!this.isConnected || !this.writer) return;
        
        try {
            // BREAK signal
            await this.port.setSignals({ break: true });
            await this.delay(0.1); // 100µs
            
            // MAB - Mark After Break
            await this.port.setSignals({ break: false });
            await this.delay(0.012); // 12µs
            
            // Prepare DMX512 frame
            const frame = new Uint8Array(513);
            frame[0] = 0x00; // Start code
            
            // Copy current values
            for (let i = 0; i < 512; i++) {
                frame[i + 1] = this.dmxChannels[i] & 0xFF;
            }
            
            // Send frame
            await this.writer.write(frame);
            
        } catch (error) {
            if (this.dmxFrameCounter % 50 === 0) {
                DMXMonitor.add(`[ERRORE] Frame DMX: ${error.message}`, 'error');
            }
        }
    }

    setChannel(channel, value) {
        if (channel < 1 || channel > 512) return;
        
        // Update buffer only - frame will be sent automatically
        this.dmxChannels[channel - 1] = value & 0xFF;
        DMXMonitor.add(`[DMX] Buffer Ch${channel}=${value}`, 'send');
    }

    setRefreshRate(rate) {
        if (rate >= 20 && rate <= 50) {
            this.dmxRefreshRate = rate;
            const hz = Math.round(1000 / rate);
            DMXMonitor.add(`[DMX] Refresh rate: ${hz}Hz (${rate}ms)`, 'system');
            
            // Restart loop with new rate if running
            if (this.dmxLoopRunning) {
                this.stopContinuousDmxLoop();
                this.startContinuousDmxLoop();
            }
        }
    }

    delay(ms) {
        return new Promise(resolve => {
            if (ms < 1) {
                const start = performance.now();
                while (performance.now() - start < ms) {
                    // Busy wait for precise timing
                }
                resolve();
            } else {
                setTimeout(resolve, ms);
            }
        });
    }

    getStats() {
        const fps = Math.round(1000 / this.dmxRefreshRate);
        const activeChannels = this.dmxChannels.filter(v => v > 0).length;
        return {
            fps: fps,
            frameCount: this.dmxFrameCounter,
            activeChannels: activeChannels,
            loopRunning: this.dmxLoopRunning
        };
    }
}