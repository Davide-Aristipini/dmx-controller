// Enhanced AI Scene Generator with Emotional Moods
class AIGenerator {
    constructor(app) {
        this.app = app;
        this.allIntervals = [];
        this.isRunning = false;
        this.currentMood = null;
        this.moodConfigs = this.initializeMoodConfigs();
    }

    initializeMoodConfigs() {
        return {
            // Emozioni positive
            party: {
                name: '🎉 Party',
                colors: 'vivaci',
                speed: 'veloce',
                intensity: 'alta',
                movement: 'frenetico',
                description: 'Colori vivaci, cambio veloce, movimento frenetico'
            },
            felice: {
                name: '😊 Felice',
                colors: 'caldi_brillanti',
                speed: 'medio',
                intensity: 'medio-alta',
                movement: 'fluido',
                description: 'Colori caldi e brillanti, movimento fluido'
            },
            energetico: {
                name: '⚡ Energetico',
                colors: 'brillanti',
                speed: 'veloce',
                intensity: 'alta',
                movement: 'dinamico',
                description: 'Colori brillanti, ritmo sostenuto'
            },
            euforico: {
                name: '🌟 Euforico',
                colors: 'arcobaleno',
                speed: 'veloce',
                intensity: 'massima',
                movement: 'esplosivo',
                description: 'Esplosione di colori, massima energia'
            },
            
            // Emozioni calme
            romantico: {
                name: '💕 Romantico',
                colors: 'caldi_soft',
                speed: 'lento',
                intensity: 'bassa',
                movement: 'delicato',
                description: 'Toni caldi, transizioni lente'
            },
            chill: {
                name: '🌊 Chill',
                colors: 'freddi',
                speed: 'molto_lento',
                intensity: 'bassa',
                movement: 'ondulatorio',
                description: 'Blu/cyan, movimento rilassato'
            },
            meditativo: {
                name: '🧘 Meditativo',
                colors: 'pastello',
                speed: 'lentissimo',
                intensity: 'minima',
                movement: 'statico',
                description: 'Colori pastello, quasi statico'
            },
            sognante: {
                name: '☁️ Sognante',
                colors: 'eterei',
                speed: 'lento',
                intensity: 'soft',
                movement: 'fluttuante',
                description: 'Colori eterei, movimento fluttuante'
            },
            
            // Emozioni tristi/malinconiche
            triste: {
                name: '😢 Triste',
                colors: 'freddi_scuri',
                speed: 'lentissimo',
                intensity: 'molto_bassa',
                movement: 'minimo',
                description: 'Blu scuro, viola, movimento minimo'
            },
            malinconico: {
                name: '🌧️ Malinconico',
                colors: 'grigi_blu',
                speed: 'lento',
                intensity: 'bassa',
                movement: 'pendolare',
                description: 'Grigi e blu, movimento pendolare'
            },
            nostalgico: {
                name: '📷 Nostalgico',
                colors: 'seppia',
                speed: 'lento',
                intensity: 'media_bassa',
                movement: 'ciclico',
                description: 'Toni seppia e ambra, ciclico'
            },
            
            // Emozioni intense
            drammatico: {
                name: '🎭 Drammatico',
                colors: 'contrasti',
                speed: 'variabile',
                intensity: 'variabile',
                movement: 'teatrale',
                description: 'Contrasti forti, effetti teatrali'
            },
            ansioso: {
                name: '😰 Ansioso',
                colors: 'intermittenti',
                speed: 'irregolare',
                intensity: 'pulsante',
                movement: 'nervoso',
                description: 'Colori intermittenti, movimento nervoso'
            },
            arrabbiato: {
                name: '😠 Arrabbiato',
                colors: 'rossi',
                speed: 'medio_veloce',
                intensity: 'alta',
                movement: 'aggressivo',
                description: 'Rossi intensi, movimento aggressivo'
            },
            
            // Emozioni avventurose/misteriose
            avventuroso: {
                name: '🗺️ Avventuroso',
                colors: 'terra',
                speed: 'medio',
                intensity: 'dinamica',
                movement: 'esplorativo',
                description: 'Colori terra e foresta, movimento esplorativo'
            },
            misterioso: {
                name: '🔮 Misterioso',
                colors: 'viola_verde',
                speed: 'lento',
                intensity: 'pulsante',
                movement: 'imprevedibile',
                description: 'Viola e verde scuro, imprevedibile'
            },
            spaziale: {
                name: '🚀 Spaziale',
                colors: 'cosmici',
                speed: 'medio',
                intensity: 'variabile',
                movement: 'orbitale',
                description: 'Colori cosmici, movimento orbitale'
            },
            
            // Stati neutri
            concentrato: {
                name: '🎯 Concentrato',
                colors: 'bianco_blu',
                speed: 'statico',
                intensity: 'costante',
                movement: 'fisso',
                description: 'Luce bianca/blu costante per concentrazione'
            },
            neutro: {
                name: '⚪ Neutro',
                colors: 'bianco',
                speed: 'statico',
                intensity: 'media',
                movement: 'nessuno',
                description: 'Luce bianca neutra'
            }
        };
    }

    initializeBeatSync() {
        this.beatSyncEnabled = false;
        this.lastBeatTime = 0;
        this.beatPhase = 0;
        this.currentBPM = 120;
        this.beatMultiplier = 1; // 1 = ogni beat, 2 = ogni 2 beat, etc.
    }

    // Nuovo metodo per ricevere beat
    onBeatDetected(beat) {
        if (!this.isRunning || !this.currentMood) return;
        
        const now = Date.now();
        this.lastBeatTime = now;
        
        // Se abbiamo il BPM, calcola la fase
        if (beat.bpm) {
            this.currentBPM = beat.bpm;
        }
        
        // Trigger azioni basate sul mood e sul beat
        this.applyBeatToMood(beat);
    }

    applyBeatToMood(beat) {
        const config = this.moodConfigs[this.currentMood];
        if (!config) return;
        
        // Azioni diverse per ogni mood sul beat
        switch (this.currentMood) {
            case 'party':
                this.onBeatParty(beat);
                break;
            case 'romantico':
                this.onBeatRomantico(beat);
                break;
            case 'energetico':
                this.onBeatEnergetico(beat);
                break;
            case 'drammatico':
                this.onBeatDrammatico(beat);
                break;
            // Aggiungi altri mood...
        }
    }

    onBeatParty(beat) {
        // Cambio colore su ogni beat
        const colors = [
            [255, 0, 0], [0, 255, 0], [0, 0, 255],
            [255, 255, 0], [255, 0, 255], [0, 255, 255]
        ];
        const color = colors[beat.count % colors.length];
        
        this.app.fixtures.forEach(fixture => {
            // Flash immediato sul beat
            this.app.fixtureManager.applyColorToFixture(
                fixture, color[0], color[1], color[2], 255
            );
            
            if (fixture.type === 'moving-head' && beat.strength > 0.7) {
                // Cambio posizione sui beat forti
                fixture.values[0] = Math.floor(Math.random() * 255);
                fixture.values[2] = Math.floor(Math.random() * 180) + 40;
                this.app.dmxController.setChannel(fixture.startChannel, fixture.values[0]);
                this.app.dmxController.setChannel(fixture.startChannel + 2, fixture.values[2]);
            }
        });
    }

    onBeatRomantico(beat) {
        // Pulsazione delicata sul beat
        const intensity = 150 + beat.strength * 105;
        
        this.app.fixtures.forEach(fixture => {
            const r = Math.floor(200 + beat.strength * 55);
            const g = Math.floor(100 + beat.strength * 50);
            const b = Math.floor(100);
            
            this.app.fixtureManager.applyColorToFixture(fixture, r, g, b, intensity);
        });
    }

    onBeatEnergetico(beat) {
        // Strobo veloce sui beat forti
        if (beat.strength > 0.6) {
            this.app.fixtures.forEach(fixture => {
                if (fixture.type === 'moving-head') {
                    fixture.values[7] = 200; // Strobo
                    this.app.dmxController.setChannel(fixture.startChannel + 7, 200);
                    
                    // Auto-off dopo 50ms
                    setTimeout(() => {
                        fixture.values[7] = 0;
                        this.app.dmxController.setChannel(fixture.startChannel + 7, 0);
                    }, 50);
                }
            });
        }
    }

    onBeatDrammatico(beat) {
        // Blackout e flash alternati
        const isFlash = beat.count % 4 === 0;
        
        this.app.fixtures.forEach(fixture => {
            if (isFlash) {
                this.app.fixtureManager.applyColorToFixture(fixture, 255, 255, 255, 255);
            } else {
                this.app.fixtureManager.applyColorToFixture(fixture, 0, 0, 0, 0);
            }
        });
    }


    initialize() {
        this.renderControls();
        this.initializeBeatSync();
    }

    renderControls() {
        const container = document.getElementById('ai-controls');
        if (!container) return;

        // Raggruppa i mood per categoria
        const categories = {
            positive: ['party', 'felice', 'energetico', 'euforico'],
            calm: ['romantico', 'chill', 'meditativo', 'sognante'],
            sad: ['triste', 'malinconico', 'nostalgico'],
            intense: ['drammatico', 'ansioso', 'arrabbiato'],
            adventure: ['avventuroso', 'misterioso', 'spaziale'],
            neutral: ['concentrato', 'neutro']
        };

        let html = `
            <div class="mb-3">
                <label class="text-xs text-gray-400">Seleziona un Mood:</label>
            </div>
        `;

        // Mood positivi
        html += `<div class="mb-2"><span class="text-xs text-green-400">Positivi</span></div>`;
        categories.positive.forEach(mood => {
            const config = this.moodConfigs[mood];
            html += `
                <button onclick="dmxApp.aiGenerator.generateScene('${mood}')" 
                        class="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-2 px-3 rounded-lg transition-all duration-200 font-medium text-sm mb-2"
                        title="${config.description}">
                    ${config.name}
                </button>
            `;
        });

        // Mood calmi
        html += `<div class="mb-2 mt-3"><span class="text-xs text-blue-400">Calmi</span></div>`;
        categories.calm.forEach(mood => {
            const config = this.moodConfigs[mood];
            html += `
                <button onclick="dmxApp.aiGenerator.generateScene('${mood}')" 
                        class="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white py-2 px-3 rounded-lg transition-all duration-200 font-medium text-sm mb-2"
                        title="${config.description}">
                    ${config.name}
                </button>
            `;
        });

        // Mood tristi
        html += `<div class="mb-2 mt-3"><span class="text-xs text-indigo-400">Malinconici</span></div>`;
        categories.sad.forEach(mood => {
            const config = this.moodConfigs[mood];
            html += `
                <button onclick="dmxApp.aiGenerator.generateScene('${mood}')" 
                        class="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-2 px-3 rounded-lg transition-all duration-200 font-medium text-sm mb-2"
                        title="${config.description}">
                    ${config.name}
                </button>
            `;
        });

        // Mood intensi
        html += `<div class="mb-2 mt-3"><span class="text-xs text-orange-400">Intensi</span></div>`;
        categories.intense.forEach(mood => {
            const config = this.moodConfigs[mood];
            html += `
                <button onclick="dmxApp.aiGenerator.generateScene('${mood}')" 
                        class="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white py-2 px-3 rounded-lg transition-all duration-200 font-medium text-sm mb-2"
                        title="${config.description}">
                    ${config.name}
                </button>
            `;
        });

        // Mood avventurosi
        html += `<div class="mb-2 mt-3"><span class="text-xs text-yellow-400">Avventura</span></div>`;
        categories.adventure.forEach(mood => {
            const config = this.moodConfigs[mood];
            html += `
                <button onclick="dmxApp.aiGenerator.generateScene('${mood}')" 
                        class="w-full bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 text-white py-2 px-3 rounded-lg transition-all duration-200 font-medium text-sm mb-2"
                        title="${config.description}">
                    ${config.name}
                </button>
            `;
        });

        html += `
            <button onclick="dmxApp.aiGenerator.stopAll()" 
                    class="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-lg transition-all duration-200 font-medium text-sm mt-3">
                ⏹️ Stop AI
            </button>
        `;

        container.innerHTML = html;
    }

    generateScene(mood) {
        this.stopAll();
        this.currentMood = mood;
        const config = this.moodConfigs[mood];
        DMXMonitor.add(`[AI] Generando mood: ${config.name}`, 'system');
        
        // Check se c'è musica attiva
        const musicActive = (this.app.audioPlayer?.isPlaying || this.app.audioReactive?.isActive);
        
        if (musicActive) {
            this.beatSyncEnabled = true;
            DMXMonitor.add(`[AI] Beat sync ATTIVO per mood ${config.name}`, 'success');
        }
        
        // Chiama la funzione appropriata per ogni mood
        switch(mood) {
            // Positivi
            case 'party': this.partyMode(); break;
            case 'felice': this.feliceMode(); break;
            case 'energetico': this.energeticMode(); break;
            case 'euforico': this.euforicoMode(); break;
            
            // Calmi
            case 'romantico': this.romanticMode(); break;
            case 'chill': this.chillMode(); break;
            case 'meditativo': this.meditativoMode(); break;
            case 'sognante': this.sognanteMode(); break;
            
            // Tristi
            case 'triste': this.tristeMode(); break;
            case 'malinconico': this.malinconicoMode(); break;
            case 'nostalgico': this.nostalgicoMode(); break;
            
            // Intensi
            case 'drammatico': this.dramaticMode(); break;
            case 'ansioso': this.ansiosoMode(); break;
            case 'arrabbiato': this.arrabbiatoMode(); break;
            
            // Avventurosi
            case 'avventuroso': this.avventurosoMode(); break;
            case 'misterioso': this.misteriosoMode(); break;
            case 'spaziale': this.spazialeMode(); break;
            
            // Neutri
            case 'concentrato': this.concentratoMode(); break;
            case 'neutro': this.neutroMode(); break;
            
            default: this.neutroMode();
        }
        
        this.isRunning = true;
    }

    // MOOD POSITIVI
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
                const fixtureColor = colors[(colorIndex + index) % colors.length];
                
                if (fixture.type === 'moving-head') {
                    const time = Date.now() / 100;
                    const pan = Math.sin(time * 0.5 + index) * 127 + 128;
                    const tilt = Math.cos(time * 0.3 + index) * 64 + 128;
                    
                    fixture.values[0] = Math.floor(pan);
                    fixture.values[2] = Math.floor(tilt);
                    fixture.values[5] = 255;
                    fixture.values[7] = movementPhase % 4 === 0 ? 150 : 0;
                    
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
        }, 300);
        
        this.allIntervals.push(interval);
    }

    feliceMode() {
        let phase = 0;
        
        const interval = setInterval(() => {
            if (!this.isRunning) {
                clearInterval(interval);
                return;
            }
            
            const wave = Math.sin(phase * 0.05) * 0.5 + 0.5;
            
            this.app.fixtures.forEach((fixture, index) => {
                // Colori caldi e brillanti
                const r = Math.floor(255 * (0.7 + wave * 0.3));
                const g = Math.floor(200 * (0.6 + wave * 0.4));
                const b = Math.floor(100 * wave);
                const dimmer = Math.floor(180 + wave * 75);
                
                if (fixture.type === 'moving-head') {
                    // Movimento fluido e ampio
                    const pan = Math.sin(phase * 0.02 + index) * 100 + 128;
                    const tilt = Math.cos(phase * 0.015) * 50 + 100;
                    
                    fixture.values[0] = Math.floor(pan);
                    fixture.values[2] = Math.floor(tilt);
                    fixture.values[5] = 100;
                    
                    this.app.dmxController.setChannel(fixture.startChannel, fixture.values[0]);
                    this.app.dmxController.setChannel(fixture.startChannel + 2, fixture.values[2]);
                    this.app.dmxController.setChannel(fixture.startChannel + 5, fixture.values[5]);
                }
                
                this.app.fixtureManager.applyColorToFixture(fixture, r, g, b, dimmer);
            });
            
            phase++;
            this.app.uiManager.renderControlPanel();
        }, 50);
        
        this.allIntervals.push(interval);
    }

    euforicoMode() {
        let phase = 0;
        const rainbowSpeed = 0.1;
        
        const interval = setInterval(() => {
            if (!this.isRunning) {
                clearInterval(interval);
                return;
            }
            
            this.app.fixtures.forEach((fixture, index) => {
                // Arcobaleno veloce
                const hue = (phase * rainbowSpeed + index * 60) % 360;
                const rgb = this.hslToRgb(hue / 360, 1, 0.5);
                
                if (fixture.type === 'moving-head') {
                    // Movimento esplosivo
                    if (phase % 20 === 0) {
                        fixture.values[0] = Math.floor(Math.random() * 255);
                        fixture.values[2] = Math.floor(Math.random() * 255);
                        fixture.values[5] = 255;
                        
                        this.app.dmxController.setChannel(fixture.startChannel, fixture.values[0]);
                        this.app.dmxController.setChannel(fixture.startChannel + 2, fixture.values[2]);
                        this.app.dmxController.setChannel(fixture.startChannel + 5, fixture.values[5]);
                    }
                }
                
                this.app.fixtureManager.applyColorToFixture(
                    fixture, rgb[0], rgb[1], rgb[2], 255
                );
            });
            
            phase++;
            this.app.uiManager.renderControlPanel();
        }, 100);
        
        this.allIntervals.push(interval);
    }

    // MOOD CALMI
    romanticMode() {
        let phase = 0;
        
        const interval = setInterval(() => {
            if (!this.isRunning) {
                clearInterval(interval);
                return;
            }
            
            const intensity = (Math.sin(phase * 0.05) + 1) / 2;
            
            this.app.fixtures.forEach((fixture, index) => {
                const r = Math.floor(200 + intensity * 55);
                const g = Math.floor(50 + intensity * 100);
                const b = Math.floor(50 + intensity * 50);
                const dimmer = Math.floor(100 + intensity * 155);
                
                if (fixture.type === 'moving-head') {
                    const pan = Math.sin(phase * 0.01 + index) * 50 + 128;
                    const tilt = Math.cos(phase * 0.008) * 30 + 128;
                    
                    fixture.values[0] = Math.floor(pan);
                    fixture.values[2] = Math.floor(tilt);
                    fixture.values[5] = 50;
                    
                    this.app.dmxController.setChannel(fixture.startChannel, fixture.values[0]);
                    this.app.dmxController.setChannel(fixture.startChannel + 2, fixture.values[2]);
                    this.app.dmxController.setChannel(fixture.startChannel + 5, fixture.values[5]);
                }
                
                this.app.fixtureManager.applyColorToFixture(fixture, r, g, b, dimmer);
            });
            
            phase++;
            this.app.uiManager.renderControlPanel();
        }, 100);
        
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
                const phase = wave + index * 0.5;
                const r = Math.floor((Math.sin(phase * 0.02) + 1) * 50);
                const g = Math.floor((Math.sin(phase * 0.025) + 1) * 100 + 50);
                const b = Math.floor((Math.sin(phase * 0.03) + 1) * 127 + 128);
                const dimmer = Math.floor((Math.sin(phase * 0.01) + 1) * 75 + 105);
                
                if (fixture.type === 'moving-head') {
                    const pan = Math.sin(phase * 0.015) * 100 + 128;
                    const tilt = Math.cos(phase * 0.02) * 50 + 128;
                    
                    fixture.values[0] = Math.floor(pan);
                    fixture.values[2] = Math.floor(tilt);
                    fixture.values[5] = 20;
                    
                    this.app.dmxController.setChannel(fixture.startChannel, fixture.values[0]);
                    this.app.dmxController.setChannel(fixture.startChannel + 2, fixture.values[2]);
                    this.app.dmxController.setChannel(fixture.startChannel + 5, fixture.values[5]);
                }
                
                this.app.fixtureManager.applyColorToFixture(fixture, r, g, b, dimmer);
            });
            
            wave++;
            this.app.uiManager.renderControlPanel();
        }, 50);
        
        this.allIntervals.push(interval);
    }

    meditativoMode() {
        let breath = 0;
        
        const interval = setInterval(() => {
            if (!this.isRunning) {
                clearInterval(interval);
                return;
            }
            
            // Respiro molto lento
            const breathIntensity = (Math.sin(breath * 0.01) + 1) / 2;
            
            this.app.fixtures.forEach((fixture) => {
                // Colori pastello molto soft
                const r = Math.floor(150 + breathIntensity * 50);
                const g = Math.floor(130 + breathIntensity * 50);
                const b = Math.floor(200 + breathIntensity * 55);
                const dimmer = Math.floor(50 + breathIntensity * 50);
                
                if (fixture.type === 'moving-head') {
                    // Quasi statico, solo micro movimenti
                    fixture.values[0] = 128;
                    fixture.values[2] = 100;
                    fixture.values[5] = 10;
                    
                    this.app.dmxController.setChannel(fixture.startChannel, fixture.values[0]);
                    this.app.dmxController.setChannel(fixture.startChannel + 2, fixture.values[2]);
                    this.app.dmxController.setChannel(fixture.startChannel + 5, fixture.values[5]);
                }
                
                this.app.fixtureManager.applyColorToFixture(fixture, r, g, b, dimmer);
            });
            
            breath++;
            this.app.uiManager.renderControlPanel();
        }, 100);
        
        this.allIntervals.push(interval);
    }

    sognanteMode() {
        let dream = 0;
        
        const interval = setInterval(() => {
            if (!this.isRunning) {
                clearInterval(interval);
                return;
            }
            
            this.app.fixtures.forEach((fixture, index) => {
                // Colori eterei e fluttuanti
                const phase = dream * 0.02 + index * Math.PI / 4;
                const r = Math.floor((Math.sin(phase) + 1) * 80 + 100);
                const g = Math.floor((Math.sin(phase + Math.PI/3) + 1) * 80 + 80);
                const b = Math.floor((Math.sin(phase + 2*Math.PI/3) + 1) * 100 + 155);
                const dimmer = Math.floor((Math.sin(dream * 0.015) + 1) * 50 + 100);
                
                if (fixture.type === 'moving-head') {
                    // Movimento fluttuante tipo nuvola
                    const pan = Math.sin(dream * 0.01 + index) * 80 + 128;
                    const tilt = Math.sin(dream * 0.012) * 40 + 100;
                    
                    fixture.values[0] = Math.floor(pan);
                    fixture.values[2] = Math.floor(tilt);
                    fixture.values[5] = 30;
                    
                    this.app.dmxController.setChannel(fixture.startChannel, fixture.values[0]);
                    this.app.dmxController.setChannel(fixture.startChannel + 2, fixture.values[2]);
                    this.app.dmxController.setChannel(fixture.startChannel + 5, fixture.values[5]);
                }
                
                this.app.fixtureManager.applyColorToFixture(fixture, r, g, b, dimmer);
            });
            
            dream++;
            this.app.uiManager.renderControlPanel();
        }, 80);
        
        this.allIntervals.push(interval);
    }

    // MOOD TRISTI
    tristeMode() {
        let sadness = 0;
        
        const interval = setInterval(() => {
            if (!this.isRunning) {
                clearInterval(interval);
                return;
            }
            
            // Respirazione molto lenta e profonda
            const breath = (Math.sin(sadness * 0.005) + 1) / 2;
            
            this.app.fixtures.forEach((fixture, index) => {
                // Blu scuro e viola, molto desaturati
                const r = Math.floor(20 + breath * 30);
                const g = Math.floor(10 + breath * 20);
                const b = Math.floor(60 + breath * 40);
                const dimmer = Math.floor(30 + breath * 40); // Molto basso
                
                if (fixture.type === 'moving-head') {
                    // Movimento minimo, teste chine
                    const pan = 128 + Math.sin(sadness * 0.002 + index) * 10;
                    const tilt = 180; // Testa chinata
                    
                    fixture.values[0] = Math.floor(pan);
                    fixture.values[2] = tilt;
                    fixture.values[5] = 5; // Movimento quasi impercettibile
                    
                    this.app.dmxController.setChannel(fixture.startChannel, fixture.values[0]);
                    this.app.dmxController.setChannel(fixture.startChannel + 2, fixture.values[2]);
                    this.app.dmxController.setChannel(fixture.startChannel + 5, fixture.values[5]);
                }
                
                this.app.fixtureManager.applyColorToFixture(fixture, r, g, b, dimmer);
            });
            
            sadness++;
            this.app.uiManager.renderControlPanel();
        }, 150);
        
        this.allIntervals.push(interval);
    }

    malinconicoMode() {
        let melancholy = 0;
        
        const interval = setInterval(() => {
            if (!this.isRunning) {
                clearInterval(interval);
                return;
            }
            
            const sway = Math.sin(melancholy * 0.01);
            
            this.app.fixtures.forEach((fixture, index) => {
                // Grigi con tocchi di blu
                const r = Math.floor(40 + sway * 20);
                const g = Math.floor(40 + sway * 20);
                const b = Math.floor(80 + sway * 40);
                const dimmer = Math.floor(60 + sway * 30);
                
                if (fixture.type === 'moving-head') {
                    // Movimento pendolare lento
                    const pan = 128 + Math.sin(melancholy * 0.008 + index * 0.5) * 60;
                    const tilt = 140 + Math.sin(melancholy * 0.006) * 20;
                    
                    fixture.values[0] = Math.floor(pan);
                    fixture.values[2] = Math.floor(tilt);
                    fixture.values[5] = 20;
                    
                    this.app.dmxController.setChannel(fixture.startChannel, fixture.values[0]);
                    this.app.dmxController.setChannel(fixture.startChannel + 2, fixture.values[2]);
                    this.app.dmxController.setChannel(fixture.startChannel + 5, fixture.values[5]);
                }
                
                this.app.fixtureManager.applyColorToFixture(fixture, r, g, b, dimmer);
            });
            
            melancholy++;
            this.app.uiManager.renderControlPanel();
        }, 100);
        
        this.allIntervals.push(interval);
    }

    nostalgicoMode() {
        let memory = 0;
        
        const interval = setInterval(() => {
            if (!this.isRunning) {
                clearInterval(interval);
                return;
            }
            
            // Effetto seppia/ambra
            const fade = (Math.sin(memory * 0.008) + 1) / 2;
            
            this.app.fixtures.forEach((fixture, index) => {
                // Toni seppia e ambra
                const r = Math.floor(180 + fade * 40);
                const g = Math.floor(140 + fade * 30);
                const b = Math.floor(60 + fade * 20);
                const dimmer = Math.floor(80 + fade * 60);
                
                if (fixture.type === 'moving-head') {
                    // Movimento ciclico come ricordi che ritornano
                    const cycle = memory * 0.01 + index * Math.PI / 3;
                    const pan = 128 + Math.sin(cycle) * 70;
                    const tilt = 110 + Math.cos(cycle * 0.7) * 30;
                    
                    fixture.values[0] = Math.floor(pan);
                    fixture.values[2] = Math.floor(tilt);
                    fixture.values[5] = 40;
                    
                    this.app.dmxController.setChannel(fixture.startChannel, fixture.values[0]);
                    this.app.dmxController.setChannel(fixture.startChannel + 2, fixture.values[2]);
                    this.app.dmxController.setChannel(fixture.startChannel + 5, fixture.values[5]);
                }
                
                this.app.fixtureManager.applyColorToFixture(fixture, r, g, b, dimmer);
            });
            
            memory++;
            this.app.uiManager.renderControlPanel();
        }, 80);
        
        this.allIntervals.push(interval);
    }

    // MOOD INTENSI
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
                            fixture.values[7] = 150;
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
        }, 1500);
        
        this.allIntervals.push(interval);
    }

    ansiosoMode() {
        let anxiety = 0;
        
        const interval = setInterval(() => {
            if (!this.isRunning) {
                clearInterval(interval);
                return;
            }
            
            // Pulsazione irregolare
            const pulse = Math.random() > 0.7 ? 1 : 0.3;
            const jitter = Math.random() * 0.2;
            
            this.app.fixtures.forEach((fixture, index) => {
                // Colori che cambiano nervosamente
                const r = Math.floor((100 + Math.random() * 100) * pulse);
                const g = Math.floor((50 + Math.random() * 50) * pulse);
                const b = Math.floor((100 + Math.random() * 100) * pulse);
                const dimmer = Math.floor((80 + Math.random() * 120) * (pulse + jitter));
                
                if (fixture.type === 'moving-head') {
                    // Movimento nervoso e irregolare
                    if (Math.random() > 0.8) {
                        fixture.values[0] = Math.floor(Math.random() * 255);
                        fixture.values[2] = Math.floor(80 + Math.random() * 100);
                        fixture.values[5] = Math.floor(150 + Math.random() * 105);
                        
                        this.app.dmxController.setChannel(fixture.startChannel, fixture.values[0]);
                        this.app.dmxController.setChannel(fixture.startChannel + 2, fixture.values[2]);
                        this.app.dmxController.setChannel(fixture.startChannel + 5, fixture.values[5]);
                    }
                }
                
                this.app.fixtureManager.applyColorToFixture(fixture, r, g, b, dimmer);
            });
            
            anxiety++;
            this.app.uiManager.renderControlPanel();
        }, 200 + Math.random() * 300); // Timing irregolare
        
        this.allIntervals.push(interval);
    }

    arrabbiatoMode() {
        let anger = 0;
        
        const interval = setInterval(() => {
            if (!this.isRunning) {
                clearInterval(interval);
                return;
            }
            
            const intensity = Math.abs(Math.sin(anger * 0.1));
            
            this.app.fixtures.forEach((fixture, index) => {
                // Rossi intensi e aggressivi
                const r = Math.floor(200 + intensity * 55);
                const g = Math.floor(intensity * 50);
                const b = 0;
                const dimmer = Math.floor(150 + intensity * 105);
                
                if (fixture.type === 'moving-head') {
                    // Movimento aggressivo e veloce
                    const aggressive = Math.sin(anger * 0.3 + index);
                    const pan = 128 + aggressive * 127;
                    const tilt = 100 + Math.abs(aggressive) * 80;
                    
                    fixture.values[0] = Math.floor(pan);
                    fixture.values[2] = Math.floor(tilt);
                    fixture.values[5] = 200;
                    
                    // Strobo occasionale per enfasi
                    if (anger % 10 === 0) {
                        fixture.values[7] = 255;
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
                
                this.app.fixtureManager.applyColorToFixture(fixture, r, g, b, dimmer);
            });
            
            anger++;
            this.app.uiManager.renderControlPanel();
        }, 150);
        
        this.allIntervals.push(interval);
    }

    // MOOD AVVENTUROSI
    avventurosoMode() {
        let adventure = 0;
        
        const interval = setInterval(() => {
            if (!this.isRunning) {
                clearInterval(interval);
                return;
            }
            
            // Simulazione giorno/notte per avventura
            const dayNight = (Math.sin(adventure * 0.02) + 1) / 2;
            
            this.app.fixtures.forEach((fixture, index) => {
                // Colori della natura e terra
                const isDay = dayNight > 0.5;
                const r = isDay ? Math.floor(200 + dayNight * 55) : Math.floor(50 * dayNight);
                const g = isDay ? Math.floor(150 + dayNight * 50) : Math.floor(30 * dayNight);
                const b = isDay ? Math.floor(50 + dayNight * 50) : Math.floor(100 * (1 - dayNight));
                const dimmer = Math.floor(100 + dayNight * 155);
                
                if (fixture.type === 'moving-head') {
                    // Movimento esplorativo
                    const explore = adventure * 0.015 + index * Math.PI / 4;
                    const pan = 128 + Math.sin(explore) * 100;
                    const tilt = 100 + Math.cos(explore * 0.7) * 60;
                    
                    fixture.values[0] = Math.floor(pan);
                    fixture.values[2] = Math.floor(tilt);
                    fixture.values[5] = 80;
                    
                    this.app.dmxController.setChannel(fixture.startChannel, fixture.values[0]);
                    this.app.dmxController.setChannel(fixture.startChannel + 2, fixture.values[2]);
                    this.app.dmxController.setChannel(fixture.startChannel + 5, fixture.values[5]);
                }
                
                this.app.fixtureManager.applyColorToFixture(fixture, r, g, b, dimmer);
            });
            
            adventure++;
            this.app.uiManager.renderControlPanel();
        }, 100);
        
        this.allIntervals.push(interval);
    }

    misteriosoMode() {
        let mystery = 0;
        
        const interval = setInterval(() => {
            if (!this.isRunning) {
                clearInterval(interval);
                return;
            }
            
            this.app.fixtures.forEach((fixture, index) => {
                // Viola e verde scuro misteriosi
                const phase = mystery * 0.01 + index * 0.5;
                const pulse = Math.sin(phase) * 0.5 + 0.5;
                
                const r = Math.floor(80 + pulse * 100);
                const g = Math.floor(20 + pulse * 60);
                const b = Math.floor(120 + pulse * 135);
                const dimmer = Math.floor(50 + pulse * 100);
                
                if (fixture.type === 'moving-head') {
                    // Movimento imprevedibile
                    if (Math.random() > 0.95) {
                        // Cambio improvviso
                        fixture.values[0] = Math.floor(Math.random() * 255);
                        fixture.values[2] = Math.floor(Math.random() * 180 + 40);
                        fixture.values[5] = Math.floor(50 + Math.random() * 150);
                    } else {
                        // Movimento lento e fluido
                        const pan = 128 + Math.sin(phase) * 80;
                        const tilt = 100 + Math.cos(phase * 1.3) * 50;
                        
                        fixture.values[0] = Math.floor(pan);
                        fixture.values[2] = Math.floor(tilt);
                        fixture.values[5] = 40;
                    }
                    
                    this.app.dmxController.setChannel(fixture.startChannel, fixture.values[0]);
                    this.app.dmxController.setChannel(fixture.startChannel + 2, fixture.values[2]);
                    this.app.dmxController.setChannel(fixture.startChannel + 5, fixture.values[5]);
                }
                
                this.app.fixtureManager.applyColorToFixture(fixture, r, g, b, dimmer);
            });
            
            mystery++;
            this.app.uiManager.renderControlPanel();
        }, 150);
        
        this.allIntervals.push(interval);
    }

    spazialeMode() {
        let space = 0;
        
        const interval = setInterval(() => {
            if (!this.isRunning) {
                clearInterval(interval);
                return;
            }
            
            this.app.fixtures.forEach((fixture, index) => {
                // Colori cosmici - blu profondo con stelle
                const starTwinkle = Math.random() > 0.98 ? 1 : 0;
                const cosmic = (Math.sin(space * 0.005 + index) + 1) / 2;
                
                const r = Math.floor(20 + cosmic * 50 + starTwinkle * 235);
                const g = Math.floor(10 + cosmic * 30 + starTwinkle * 245);
                const b = Math.floor(80 + cosmic * 175 + starTwinkle * 175);
                const dimmer = Math.floor(60 + cosmic * 100 + starTwinkle * 195);
                
                if (fixture.type === 'moving-head') {
                    // Movimento orbitale
                    const orbit = space * 0.01 + index * Math.PI * 2 / this.app.fixtures.length;
                    const pan = 128 + Math.sin(orbit) * 100;
                    const tilt = 100 + Math.cos(orbit * 2) * 60;
                    
                    fixture.values[0] = Math.floor(pan);
                    fixture.values[2] = Math.floor(tilt);
                    fixture.values[5] = 60;
                    
                    this.app.dmxController.setChannel(fixture.startChannel, fixture.values[0]);
                    this.app.dmxController.setChannel(fixture.startChannel + 2, fixture.values[2]);
                    this.app.dmxController.setChannel(fixture.startChannel + 5, fixture.values[5]);
                }
                
                this.app.fixtureManager.applyColorToFixture(fixture, r, g, b, dimmer);
            });
            
            space++;
            this.app.uiManager.renderControlPanel();
        }, 100);
        
        this.allIntervals.push(interval);
    }

    // MOOD NEUTRI
    concentratoMode() {
        // Luce costante per concentrazione
        this.app.fixtures.forEach((fixture) => {
            // Bianco freddo costante
            const r = 200;
            const g = 200;
            const b = 255;
            const dimmer = 180;
            
            if (fixture.type === 'moving-head') {
                // Posizione fissa verso il basso
                fixture.values[0] = 128;
                fixture.values[2] = 160;
                fixture.values[5] = 0;
                
                this.app.dmxController.setChannel(fixture.startChannel, fixture.values[0]);
                this.app.dmxController.setChannel(fixture.startChannel + 2, fixture.values[2]);
                this.app.dmxController.setChannel(fixture.startChannel + 5, fixture.values[5]);
            }
            
            this.app.fixtureManager.applyColorToFixture(fixture, r, g, b, dimmer);
        });
        
        this.app.uiManager.renderControlPanel();
    }

    neutroMode() {
        // Luce bianca neutra
        this.app.fixtures.forEach((fixture) => {
            const r = 255;
            const g = 255;
            const b = 255;
            const dimmer = 150;
            
            if (fixture.type === 'moving-head') {
                fixture.values[0] = 128;
                fixture.values[2] = 128;
                fixture.values[5] = 0;
                
                this.app.dmxController.setChannel(fixture.startChannel, fixture.values[0]);
                this.app.dmxController.setChannel(fixture.startChannel + 2, fixture.values[2]);
                this.app.dmxController.setChannel(fixture.startChannel + 5, fixture.values[5]);
            }
            
            this.app.fixtureManager.applyColorToFixture(fixture, r, g, b, dimmer);
        });
        
        this.app.uiManager.renderControlPanel();
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
                const r = isBeat ? 255 : 100;
                const g = isBeat ? 100 : 255;
                const b = 0;
                
                if (fixture.type === 'moving-head') {
                    if (isBeat) {
                        fixture.values[0] = position.pan;
                        fixture.values[2] = position.tilt;
                        fixture.values[5] = 255;
                        fixture.values[7] = 200;
                        fixture.values[18] = Math.floor(Math.random() * 255);
                        
                        this.app.dmxController.setChannel(fixture.startChannel, fixture.values[0]);
                        this.app.dmxController.setChannel(fixture.startChannel + 2, fixture.values[2]);
                        this.app.dmxController.setChannel(fixture.startChannel + 5, fixture.values[5]);
                        this.app.dmxController.setChannel(fixture.startChannel + 7, fixture.values[7]);
                        this.app.dmxController.setChannel(fixture.startChannel + 18, fixture.values[18]);
                    } else {
                        fixture.values[7] = 0;
                        this.app.dmxController.setChannel(fixture.startChannel + 7, 0);
                    }
                }
                
                this.app.fixtureManager.applyColorToFixture(fixture, r, g, b, 255);
            });
            
            beat++;
            this.app.uiManager.renderControlPanel();
        }, 200);
        
        this.allIntervals.push(interval);
    }

    // Utility function
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

    stopAll() {
        this.allIntervals.forEach(interval => clearInterval(interval));
        this.allIntervals = [];
        this.isRunning = false;
        this.currentMood = null;
        
        // Reset all moving heads to center position
        this.app.fixtures.forEach(fixture => {
            if (fixture.type === 'moving-head') {
                fixture.values[0] = 128;
                fixture.values[2] = 128;
                fixture.values[5] = 128;
                fixture.values[7] = 0;
                fixture.values[16] = 0;
                fixture.values[18] = 0;
                
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