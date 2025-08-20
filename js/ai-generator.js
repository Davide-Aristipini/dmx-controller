// Enhanced AI Scene Generator
class AIGenerator {
    constructor(app) {
        this.app = app;
        this.allIntervals = [];
        this.isRunning = false;
        this.currentMood = null;
    }

    initialize() {
        this.renderControls();
    }

    renderControls() {
        const container = document.getElementById('ai-controls');
        if (!container) return;

        container.innerHTML = `
            <button onclick="dmxApp.aiGenerator.generateScene('party')" 
                    class="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white py-2 px-3 rounded-lg transition-all duration-200 font-medium text-sm">
                🎉 Party Mode
            </button>
            <button onclick="dmxApp.aiGenerator.generateScene('romantic')" 
                    class="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white py-2 px-3 rounded-lg transition-all duration-200 font-medium text-sm">
                💕 Romantico
            </button>
            <button onclick="dmxApp.aiGenerator.generateScene('energetic')" 
                    class="w-full bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700 text-white py-2 px-3 rounded-lg transition-all duration-200 font-medium text-sm">
                ⚡ Energetico
            </button>
            <button onclick="dmxApp.aiGenerator.generateScene('chill')" 
                    class="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white py-2 px-3 rounded-lg transition-all duration-200 font-medium text-sm">
                🌊 Chill
            </button>
            <button onclick="dmxApp.aiGenerator.generateScene('dramatic')" 
                    class="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-2 px-3 rounded-lg transition-all duration-200 font-medium text-sm">
                🎭 Drammatico
            </button>
            <button onclick="dmxApp.aiGenerator.generateScene('random')" 
                    class="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white py-2 px-3 rounded-lg transition-all duration-200 font-medium text-sm">
                🎲 Casuale
            </button>
            <button onclick="dmxApp.aiGenerator.stopAll()" 
                    class="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-lg transition-all duration-200 font-medium text-sm">
                ⏹️ Stop AI
            </button>
        `;
    }

    generateScene(mood) {
        this.stopAll();
        this.currentMood = mood;
        DMXMonitor.add(`[AI] Generando scena: ${mood}`, 'system');
        
        switch(mood) {
            case 'party':
                this.partyMode();
                break;
            case 'romantic':
                this.romanticMode();
                break;
            case 'energetic':
                this.energeticMode();
                break;
            case 'chill':
                this.chillMode();
                break;
            case 'dramatic':
                this.dramaticMode();
                break;
            case 'random':
                this.randomMode();
                break;
        }
        
        this.isRunning = true;
    }

    partyMode() {
        let colorIndex = 0;
        let movementPhase = 0;
        const colors = [
            [255, 0, 255], [0, 255, 255], [255, 255, 0], 
            [255, 100, 0], [0, 255, 0], [255, 0, 0]
        ];
        
        const interval = setInterval(() => {
            if (!this.isRunning) {
                clearInterval(interval);
                return;
            }
            
            const color = colors[colorIndex % colors.length];
            
            this.app.fixtures.forEach((fixture, index) => {
                // Staggered colors
                const fixtureColor = colors[(colorIndex + index) % colors.length];
                
                if (fixture.type === 'moving-head') {
                    // Fast movement patterns
                    const time = Date.now() / 100;
                    const pan = Math.sin(time * 0.5 + index) * 127 + 128;
                    const tilt = Math.cos(time * 0.3 + index) * 64 + 128;
                    
                    fixture.values[0] = Math.floor(pan);
                    fixture.values[2] = Math.floor(tilt);
                    fixture.values[5] = 255; // Fast movement
                    fixture.values[7] = movementPhase % 4 === 0 ? 150 : 0; // Strobe on beat
                    
                    // Auto movement patterns
                    if (movementPhase % 8 === 0) {
                        fixture.values[16] = Math.floor(Math.random() * 55) + 200;
                        this.app.dmxController.setChannel(fixture.startChannel + 16, fixture.values[16]);
                    }
                    
                    this.app.dmxController.setChannel(fixture.startChannel, fixture.values[0]);
                    this.app.dmxController.setChannel(fixture.startChannel + 2, fixture.values[2]);
                    this.app.dmxController.setChannel(fixture.startChannel + 5, fixture.values[5]);
                    this.app.dmxController.setChannel(fixture.startChannel + 7, fixture.values[7]);
                }
                
                this.app.fixtureManager.applyColorToFixture(
                    fixture, fixtureColor[0], fixtureColor[1], fixtureColor[2], 255
                );
            });
            
            colorIndex++;
            movementPhase++;
            this.app.uiManager.renderControlPanel();
        }, 300); // Fast changes
        
        this.allIntervals.push(interval);
    }

    romanticMode() {
        let phase = 0;
        
        const interval = setInterval(() => {
            if (!this.isRunning) {
                clearInterval(interval);
                return;
            }
            
            const intensity = (Math.sin(phase * 0.05) + 1) / 2;
            
            this.app.fixtures.forEach((fixture, index) => {
                // Warm colors with slow transitions
                const r = Math.floor(200 + intensity * 55);
                const g = Math.floor(50 + intensity * 100);
                const b = Math.floor(50 + intensity * 50);
                const dimmer = Math.floor(100 + intensity * 155);
                
                if (fixture.type === 'moving-head') {
                    // Slow, smooth movements
                    const pan = Math.sin(phase * 0.01 + index) * 50 + 128;
                    const tilt = Math.cos(phase * 0.008) * 30 + 128;
                    
                    fixture.values[0] = Math.floor(pan);
                    fixture.values[2] = Math.floor(tilt);
                    fixture.values[5] = 50; // Very slow movement
                    
                    this.app.dmxController.setChannel(fixture.startChannel, fixture.values[0]);
                    this.app.dmxController.setChannel(fixture.startChannel + 2, fixture.values[2]);
                    this.app.dmxController.setChannel(fixture.startChannel + 5, fixture.values[5]);
                }
                
                this.app.fixtureManager.applyColorToFixture(fixture, r, g, b, dimmer);
            });
            
            phase++;
            this.app.uiManager.renderControlPanel();
        }, 100); // Smooth updates
        
        this.allIntervals.push(interval);
    }

    energeticMode() {
        let beat = 0;
        const positions = [
            {pan: 0, tilt: 64}, {pan: 255, tilt: 64},
            {pan: 128, tilt: 0}, {pan: 128, tilt: 255}
        ];
        
        const interval = setInterval(() => {
            if (!this.isRunning) {
                clearInterval(interval);
                return;
            }
            
            const isBeat = beat % 2 === 0;
            const position = positions[Math.floor(beat / 4) % positions.length];
            
            this.app.fixtures.forEach((fixture, index) => {
                // High energy colors
                const r = isBeat ? 255 : 100;
                const g = isBeat ? 100 : 255;
                const b = 0;
                
                if (fixture.type === 'moving-head') {
                    // Sharp, fast movements
                    if (isBeat) {
                        fixture.values[0] = position.pan;
                        fixture.values[2] = position.tilt;
                        fixture.values[5] = 255; // Maximum speed
                        fixture.values[7] = 200; // Strobe effect
                        
                        // Color macros
                        fixture.values[18] = Math.floor(Math.random() * 255);
                        
                        this.app.dmxController.setChannel(fixture.startChannel, fixture.values[0]);
                        this.app.dmxController.setChannel(fixture.startChannel + 2, fixture.values[2]);
                        this.app.dmxController.setChannel(fixture.startChannel + 5, fixture.values[5]);
                        this.app.dmxController.setChannel(fixture.startChannel + 7, fixture.values[7]);
                        this.app.dmxController.setChannel(fixture.startChannel + 18, fixture.values[18]);
                    } else {
                        fixture.values[7] = 0; // Stop strobe
                        this.app.dmxController.setChannel(fixture.startChannel + 7, 0);
                    }
                }
                
                this.app.fixtureManager.applyColorToFixture(fixture, r, g, b, 255);
            });
            
            beat++;
            this.app.uiManager.renderControlPanel();
        }, 200); // Fast beat
        
        this.allIntervals.push(interval);
    }

    chillMode() {
        let wave = 0;
        
        const interval = setInterval(() => {
            if (!this.isRunning) {
                clearInterval(interval);
                return;
            }
            
            this.app.fixtures.forEach((fixture, index) => {
                // Ocean colors
                const phase = wave + index * 0.5;
                const r = Math.floor((Math.sin(phase * 0.02) + 1) * 50);
                const g = Math.floor((Math.sin(phase * 0.025) + 1) * 100 + 50);
                const b = Math.floor((Math.sin(phase * 0.03) + 1) * 127 + 128);
                const dimmer = Math.floor((Math.sin(phase * 0.01) + 1) * 75 + 105);
                
                if (fixture.type === 'moving-head') {
                    // Wave-like movements
                    const pan = Math.sin(phase * 0.015) * 100 + 128;
                    const tilt = Math.cos(phase * 0.02) * 50 + 128;
                    
                    fixture.values[0] = Math.floor(pan);
                    fixture.values[2] = Math.floor(tilt);
                    fixture.values[5] = 20; // Very slow, smooth
                    
                    this.app.dmxController.setChannel(fixture.startChannel, fixture.values[0]);
                    this.app.dmxController.setChannel(fixture.startChannel + 2, fixture.values[2]);
                    this.app.dmxController.setChannel(fixture.startChannel + 5, fixture.values[5]);
                }
                
                this.app.fixtureManager.applyColorToFixture(fixture, r, g, b, dimmer);
            });
            
            wave++;
            this.app.uiManager.renderControlPanel();
        }, 50); // Smooth wave effect
        
        this.allIntervals.push(interval);
    }

    dramaticMode() {
        let scene = 0;
        const scenes = ['blackout', 'spotlight', 'redAlert', 'whiteFlash', 'colorSweep'];
        
        const interval = setInterval(() => {
            if (!this.isRunning) {
                clearInterval(interval);
                return;
            }
            
            const currentScene = scenes[scene % scenes.length];
            
            this.app.fixtures.forEach((fixture, index) => {
                switch(currentScene) {
                    case 'blackout':
                        this.app.fixtureManager.applyColorToFixture(fixture, 0, 0, 0, 0);
                        break;
                        
                    case 'spotlight':
                        if (index === 0) {
                            this.app.fixtureManager.applyColorToFixture(fixture, 255, 255, 255, 255);
                            if (fixture.type === 'moving-head') {
                                fixture.values[0] = 128;
                                fixture.values[2] = 64;
                                this.app.dmxController.setChannel(fixture.startChannel, 128);
                                this.app.dmxController.setChannel(fixture.startChannel + 2, 64);
                            }
                        } else {
                            this.app.fixtureManager.applyColorToFixture(fixture, 0, 0, 0, 0);
                        }
                        break;
                        
                    case 'redAlert':
                        this.app.fixtureManager.applyColorToFixture(fixture, 255, 0, 0, 255);
                        if (fixture.type === 'moving-head') {
                            fixture.values[7] = 150; // Strobe
                            this.app.dmxController.setChannel(fixture.startChannel + 7, 150);
                        }
                        break;
                        
                    case 'whiteFlash':
                        this.app.fixtureManager.applyColorToFixture(fixture, 255, 255, 255, 255);
                        break;
                        
                    case 'colorSweep':
                        const sweepColor = [
                            [255, 0, 0], [0, 255, 0], [0, 0, 255]
                        ][(scene + index) % 3];
                        this.app.fixtureManager.applyColorToFixture(
                            fixture, sweepColor[0], sweepColor[1], sweepColor[2], 255
                        );
                        
                        if (fixture.type === 'moving-head') {
                            const sweepPan = (scene * 50 + index * 30) % 255;
                            fixture.values[0] = sweepPan;
                            fixture.values[5] = 200;
                            this.app.dmxController.setChannel(fixture.startChannel, sweepPan);
                            this.app.dmxController.setChannel(fixture.startChannel + 5, 200);
                        }
                        break;
                }
            });
            
            scene++;
            this.app.uiManager.renderControlPanel();
        }, 1500); // Dramatic timing
        
        this.allIntervals.push(interval);
    }

    randomMode() {
        const interval = setInterval(() => {
            if (!this.isRunning) {
                clearInterval(interval);
                return;
            }
            
            this.app.fixtures.forEach(fixture => {
                const r = Math.floor(Math.random() * 256);
                const g = Math.floor(Math.random() * 256);
                const b = Math.floor(Math.random() * 256);
                const dimmer = Math.floor(Math.random() * 155) + 100;
                
                if (fixture.type === 'moving-head') {
                    // Random movements
                    if (Math.random() > 0.7) { // 30% chance to move
                        fixture.values[0] = Math.floor(Math.random() * 256);
                        fixture.values[2] = Math.floor(Math.random() * 256);
                        fixture.values[5] = Math.floor(Math.random() * 200) + 55;
                        
                        this.app.dmxController.setChannel(fixture.startChannel, fixture.values[0]);
                        this.app.dmxController.setChannel(fixture.startChannel + 2, fixture.values[2]);
                        this.app.dmxController.setChannel(fixture.startChannel + 5, fixture.values[5]);
                    }
                    
                    // Random effects
                    if (Math.random() > 0.9) { // 10% chance for special effect
                        const effect = Math.floor(Math.random() * 3);
                        switch(effect) {
                            case 0: // Strobe
                                fixture.values[7] = 200;
                                this.app.dmxController.setChannel(fixture.startChannel + 7, 200);
                                setTimeout(() => {
                                    fixture.values[7] = 0;
                                    this.app.dmxController.setChannel(fixture.startChannel + 7, 0);
                                }, 200);
                                break;
                            case 1: // Color macro
                                fixture.values[18] = Math.floor(Math.random() * 255);
                                this.app.dmxController.setChannel(fixture.startChannel + 18, fixture.values[18]);
                                break;
                            case 2: // Auto movement
                                fixture.values[16] = Math.floor(Math.random() * 55) + 200;
                                this.app.dmxController.setChannel(fixture.startChannel + 16, fixture.values[16]);
                                break;
                        }
                    }
                }
                
                this.app.fixtureManager.applyColorToFixture(fixture, r, g, b, dimmer);
            });
            
            this.app.uiManager.renderControlPanel();
        }, 500 + Math.random() * 1500); // Random timing
        
        this.allIntervals.push(interval);
    }

    stopAll() {
        this.allIntervals.forEach(interval => clearInterval(interval));
        this.allIntervals = [];
        this.isRunning = false;
        this.currentMood = null;
        
        // Reset all moving heads to center position
        this.app.fixtures.forEach(fixture => {
            if (fixture.type === 'moving-head') {
                fixture.values[0] = 128; // Pan center
                fixture.values[2] = 128; // Tilt center
                fixture.values[5] = 128; // Medium speed
                fixture.values[7] = 0;   // No strobe
                fixture.values[16] = 0;  // No auto movement
                fixture.values[18] = 0;  // No color macro
                
                this.app.dmxController.setChannel(fixture.startChannel, 128);
                this.app.dmxController.setChannel(fixture.startChannel + 2, 128);
                this.app.dmxController.setChannel(fixture.startChannel + 5, 128);
                this.app.dmxController.setChannel(fixture.startChannel + 7, 0);
                this.app.dmxController.setChannel(fixture.startChannel + 16, 0);
                this.app.dmxController.setChannel(fixture.startChannel + 18, 0);
            }
        });
        
        DMXMonitor.add('[AI] Tutti gli effetti fermati', 'system');
    }
}