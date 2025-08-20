// Fixture management
class FixtureManager {
    constructor(app) {
        this.app = app;
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('add-moving-head')?.addEventListener('click', 
            () => this.showAddFixtureModal('moving-head'));
        document.getElementById('add-par')?.addEventListener('click', 
            () => this.showAddFixtureModal('par'));
        document.getElementById('add-par-led')?.addEventListener('click', 
            () => this.showAddFixtureModal('par-led'));
    }

    addFixture(type, name, startChannel, channels) {
        const fixture = {
            id: Date.now(),
            name: name || this.getDefaultFixtureName(type),
            type: type,
            startChannel: startChannel || this.getNextAvailableChannel(),
            channels: channels || this.getChannelCount(type),
            values: new Array(this.getChannelCount(type)).fill(0),
            x: 200,
            y: 200,
            color: 'rgb(0,0,0)'
        };
        
        this.app.fixtures.push(fixture);
        this.updateFixtureList();
        this.selectFixture(fixture.id);
        this.app.saveToStorage();
        DMXMonitor.add(`[FIXTURE] Aggiunta: ${fixture.name} (Ch${fixture.startChannel}-${fixture.startChannel + fixture.channels - 1})`, 'system');
    }

    deleteFixture(id) {
        const fixture = this.app.fixtures.find(f => f.id === id);
        if (fixture) {
            DMXMonitor.add(`[FIXTURE] Rimossa: ${fixture.name}`, 'system');
        }
        
        this.app.fixtures = this.app.fixtures.filter(f => f.id !== id);
        this.app.stageCanvas.stageFixtures = this.app.stageCanvas.stageFixtures.filter(sf => sf.fixture.id !== id);
        
        if (this.app.selectedFixtureId === id) {
            this.app.selectedFixtureId = null;
        }
        
        this.updateFixtureList();
        this.app.uiManager.renderControlPanel();
        this.app.saveToStorage();
    }

    selectFixture(id) {
        this.app.selectedFixtureId = id;
        this.updateFixtureList();
        this.app.uiManager.renderControlPanel();
        
        const fixture = this.app.fixtures.find(f => f.id === id);
        if (fixture) {
            DMXMonitor.add(`[SELEZIONE] ${fixture.name}`, 'system');
        }
    }

    updateFixtureList() {
        const list = document.getElementById('fixture-list');
        if (!list) return;

        list.innerHTML = '';

        if (this.app.fixtures.length === 0) {
            list.innerHTML = '<div class="text-gray-500 text-sm text-center p-4">Nessuna fixture aggiunta</div>';
            return;
        }

        this.app.fixtures.forEach(fixture => {
            const div = document.createElement('div');
            div.className = `p-3 rounded-lg cursor-pointer transition-all duration-200 flex items-center justify-between ${
                fixture.id === this.app.selectedFixtureId ? 'bg-blue-600 shadow-lg' : 'bg-gray-700 hover:bg-gray-600'
            }`;
            
            div.innerHTML = `
                <div class="flex items-center space-x-2">
                    <span>${this.getFixtureIcon(fixture.type)}</span>
                    <div>
                        <div class="font-medium text-sm">${fixture.name}</div>
                        <div class="text-xs opacity-70">Ch ${fixture.startChannel}-${fixture.startChannel + fixture.channels - 1}</div>
                    </div>
                </div>
                <button class="text-red-400 hover:text-red-300 p-1" 
                        onclick="event.stopPropagation(); dmxApp.fixtureManager.deleteFixture(${fixture.id})" 
                        title="Elimina">
                    🗑️
                </button>
            `;
            
            div.onclick = () => this.selectFixture(fixture.id);
            list.appendChild(div);
        });
    }

    updateFixtureColor(fixture) {
        let r = 0, g = 0, b = 0;
        
        if (fixture.type === 'moving-head') {
            const redFront = fixture.values[8] || 0;
            const greenFront = fixture.values[9] || 0;
            const blueFront = fixture.values[10] || 0;
            const redBack = fixture.values[12] || 0;
            const greenBack = fixture.values[13] || 0;
            const blueBack = fixture.values[14] || 0;
            
            r = Math.floor((redFront + redBack) / 2);
            g = Math.floor((greenFront + greenBack) / 2);
            b = Math.floor((blueFront + blueBack) / 2);
        } else if (fixture.type === 'par-led') {
            r = fixture.values[1] || 0;
            g = fixture.values[2] || 0;
            b = fixture.values[3] || 0;
        } else {
            r = fixture.values[1] || 0;
            g = fixture.values[2] || 0;
            b = fixture.values[3] || 0;
        }
        
        fixture.color = `rgb(${r},${g},${b})`;
        
        const stageFixture = this.app.stageCanvas.stageFixtures.find(sf => sf.fixture.id === fixture.id);
        if (stageFixture) {
            stageFixture.fixture = fixture;
        }
    }

    applyColorToFixture(fixture, r, g, b, dimmer = 255) {
        let redIndex, greenIndex, blueIndex, dimmerIndex;
        
        if (fixture.type === 'moving-head') {
            dimmerIndex = 6;
            redIndex = 8;
            greenIndex = 9;
            blueIndex = 10;
            const redBackIndex = 12;
            const greenBackIndex = 13;
            const blueBackIndex = 14;
            
            fixture.values[dimmerIndex] = dimmer;
            fixture.values[redIndex] = r;
            fixture.values[greenIndex] = g;
            fixture.values[blueIndex] = b;
            fixture.values[redBackIndex] = r;
            fixture.values[greenBackIndex] = g;
            fixture.values[blueBackIndex] = b;
            
            this.app.dmxController.setChannel(fixture.startChannel + dimmerIndex, dimmer);
            this.app.dmxController.setChannel(fixture.startChannel + redIndex, r);
            this.app.dmxController.setChannel(fixture.startChannel + greenIndex, g);
            this.app.dmxController.setChannel(fixture.startChannel + blueIndex, b);
            this.app.dmxController.setChannel(fixture.startChannel + redBackIndex, r);
            this.app.dmxController.setChannel(fixture.startChannel + greenBackIndex, g);
            this.app.dmxController.setChannel(fixture.startChannel + blueBackIndex, b);
        } else if (fixture.type === 'par-led') {
            dimmerIndex = 0;
            redIndex = 1;
            greenIndex = 2;
            blueIndex = 3;
            
            fixture.values[dimmerIndex] = dimmer;
            fixture.values[redIndex] = r;
            fixture.values[greenIndex] = g;
            fixture.values[blueIndex] = b;
            
            this.app.dmxController.setChannel(fixture.startChannel + dimmerIndex, dimmer);
            this.app.dmxController.setChannel(fixture.startChannel + redIndex, r);
            this.app.dmxController.setChannel(fixture.startChannel + greenIndex, g);
            this.app.dmxController.setChannel(fixture.startChannel + blueIndex, b);
        } else {
            dimmerIndex = 0;
            redIndex = 1;
            greenIndex = 2;
            blueIndex = 3;
            
            fixture.values[dimmerIndex] = dimmer;
            fixture.values[redIndex] = r;
            fixture.values[greenIndex] = g;
            fixture.values[blueIndex] = b;
            
            this.app.dmxController.setChannel(fixture.startChannel + dimmerIndex, dimmer);
            this.app.dmxController.setChannel(fixture.startChannel + redIndex, r);
            this.app.dmxController.setChannel(fixture.startChannel + greenIndex, g);
            this.app.dmxController.setChannel(fixture.startChannel + blueIndex, b);
        }
        
        this.updateFixtureColor(fixture);
    }

    showAddFixtureModal(type) {
        const modalHtml = `
            <div id="add-fixture-modal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                <div class="bg-gray-800 rounded-lg p-6 w-96 border border-gray-600">
                    <h3 class="text-xl font-bold mb-4 text-blue-400">
                        ${this.getModalTitle(type)}
                    </h3>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium mb-2">Nome Fixture</label>
                            <input type="text" id="fixture-name-input" 
                                   class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white" 
                                   placeholder="Es: Testa Mobile 1" 
                                   value="${this.getDefaultFixtureName(type)}">
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-2">Canale DMX Iniziale</label>
                            <input type="number" id="fixture-start-channel" 
                                   class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white" 
                                   min="1" max="512" 
                                   value="${this.getNextAvailableChannel()}">
                        </div>
                        <div class="text-sm text-gray-400">
                            ${this.getFixtureDescription(type)}
                        </div>
                    </div>
                    <div class="flex space-x-3 mt-6">
                        <button onclick="dmxApp.fixtureManager.closeAddFixtureModal()" 
                                class="flex-1 bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded text-white transition-all">
                            Annulla
                        </button>
                        <button onclick="dmxApp.fixtureManager.confirmAddFixture('${type}')" 
                                class="flex-1 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white transition-all">
                            Aggiungi
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        document.getElementById('fixture-name-input').focus();
    }

    closeAddFixtureModal() {
        const modal = document.getElementById('add-fixture-modal');
        if (modal) modal.remove();
    }

    confirmAddFixture(type) {
        const name = document.getElementById('fixture-name-input').value.trim();
        const startChannel = parseInt(document.getElementById('fixture-start-channel').value);
        const channels = this.getChannelCount(type);
        
        if (!name) {
            CustomAlert.error('Inserisci un nome per la fixture');
            return;
        }
        
        if (startChannel < 1 || startChannel > 512) {
            CustomAlert.error('Canale iniziale deve essere tra 1 e 512');
            return;
        }
        
        if (startChannel + channels > 513) {
            alert('La fixture supererebbe il canale 512');
            return;
        }
        
        this.addFixture(type, name, startChannel, channels);
        this.closeAddFixtureModal();
    }

    getChannelNames(type) {
        if (type === 'moving-head') {
            return [
                'Pan', 'Pan Fine', 'Tilt', 'Tilt Fine', 'Continuous Rotation',
                'Move Speed', 'Dimmer', 'Strobe', 'Red (Front)', 'Green (Front)',
                'Blue (Front)', 'White (Front)', 'Red (Back)', 'Green (Back)',
                'Blue (Back)', 'White (Back)', 'Auto Movement', 'Auto Movement Speed',
                'Color Macros', 'Color Macro Speed', 'Reset'
            ];
        } else if (type === 'par-led') {
            return [
                'Master Dimmer', 'Red', 'Green', 'Blue', 'Empty', 'Function', 'Function Speed'
            ];
        } else {
            return ['Dimmer', 'Red', 'Green', 'Blue', 'White', 'Amber', 'UV', 'Strobe'];
        }
    }

    getDefaultFixtureName(type) {
        const count = this.app.fixtures.filter(f => f.type === type).length + 1;
        if (type === 'moving-head') return `Testa Mobile ${count}`;
        if (type === 'par') return `Luce Fissa ${count}`;
        if (type === 'par-led') return `PAR LED ${count}`;
        return `Fixture ${count}`;
    }

    getNextAvailableChannel() {
        if (this.app.fixtures.length === 0) return 1;
        const lastFixture = this.app.fixtures[this.app.fixtures.length - 1];
        return lastFixture.startChannel + lastFixture.channels;
    }

    getChannelCount(type) {
        if (type === 'moving-head') return 21;
        if (type === 'par') return 8;
        if (type === 'par-led') return 7;
        return 8;
    }

    getFixtureIcon(type) {
        if (type === 'moving-head') return '🎯';
        if (type === 'par-led') return '🎨';
        return '💡';
    }

    getModalTitle(type) {
        if (type === 'moving-head') return '🎯 Aggiungi Testa Mobile';
        if (type === 'par') return '💡 Aggiungi Luce Fissa';
        if (type === 'par-led') return '🎨 Aggiungi PAR LED';
        return '⚙️ Fixture Personalizzata';
    }

    getFixtureDescription(type) {
        if (type === 'moving-head') return 'Testa mobile WL-MI0810 (21 canali)';
        if (type === 'par') return 'Luce fissa PAR RGBW (8 canali)';
        if (type === 'par-led') return 'PAR LED Digital Display (7 canali)';
        return 'Fixture personalizzata';
    }

    setDimmer(fixtureId, value) {
        const fixture = this.app.fixtures.find(f => f.id === fixtureId);
        if (!fixture) return;
        
        const dimmerIndex = fixture.type === 'moving-head' ? 6 : 0;
        fixture.values[dimmerIndex] = parseInt(value);
        this.app.dmxController.setChannel(fixture.startChannel + dimmerIndex, parseInt(value));
        this.updateFixtureColor(fixture);
    }

    setRGB(fixtureId, color, value) {
        const fixture = this.app.fixtures.find(f => f.id === fixtureId);
        if (!fixture) return;
        
        value = parseInt(value);
        
        if (fixture.type === 'moving-head') {
            const indices = { r: 8, g: 9, b: 10 };
            const backIndices = { r: 12, g: 13, b: 14 };
            
            fixture.values[indices[color]] = value;
            fixture.values[backIndices[color]] = value;
            
            this.app.dmxController.setChannel(fixture.startChannel + indices[color], value);
            this.app.dmxController.setChannel(fixture.startChannel + backIndices[color], value);
        } else if (fixture.type === 'par-led') {
            const indices = { r: 1, g: 2, b: 3 };
            fixture.values[indices[color]] = value;
            this.app.dmxController.setChannel(fixture.startChannel + indices[color], value);
        } else {
            const indices = { r: 1, g: 2, b: 3 };
            fixture.values[indices[color]] = value;
            this.app.dmxController.setChannel(fixture.startChannel + indices[color], value);
        }
        
        this.updateFixtureColor(fixture);
    }

    setPanTilt(fixtureId, axis, value) {
        const fixture = this.app.fixtures.find(f => f.id === fixtureId);
        if (!fixture || fixture.type !== 'moving-head') return;
        
        value = parseInt(value);
        
        if (axis === 'pan') {
            fixture.values[0] = value;
            this.app.dmxController.setChannel(fixture.startChannel, value);
        } else if (axis === 'tilt') {
            fixture.values[2] = value;
            this.app.dmxController.setChannel(fixture.startChannel + 2, value);
        }
    }

    setPARFunction(fixtureId, value) {
        const fixture = this.app.fixtures.find(f => f.id === fixtureId);
        if (!fixture || fixture.type !== 'par-led') return;
        
        fixture.values[5] = parseInt(value);
        this.app.dmxController.setChannel(fixture.startChannel + 5, parseInt(value));
        
        const functionNames = {
            0: 'OFF',
            25: 'Strobo',
            75: 'Jump',
            125: 'Gradient',
            175: 'Pulse',
            225: 'Music'
        };
        
        DMXMonitor.add(`[PAR LED] ${fixture.name}: ${functionNames[value]} mode`, 'system');
    }

    toggleFixture(fixtureId) {
        const fixture = this.app.fixtures.find(f => f.id === fixtureId);
        if (!fixture) return;
        
        const dimmerIndex = fixture.type === 'moving-head' ? 6 : 0;
        const currentDimmer = fixture.values[dimmerIndex];
        
        if (currentDimmer > 0) {
            // Turn OFF
            fixture.values[dimmerIndex] = 0;
            this.app.dmxController.setChannel(fixture.startChannel + dimmerIndex, 0);
        } else {
            // Turn ON
            fixture.values[dimmerIndex] = 255;
            this.app.dmxController.setChannel(fixture.startChannel + dimmerIndex, 255);
        }
        
        this.updateFixtureColor(fixture);
        this.app.uiManager.renderControlPanel();
    }

    // Quick actions for all fixtures
    allOn() {
        this.app.fixtures.forEach(fixture => {
            this.applyColorToFixture(fixture, 255, 255, 255, 255);
        });
        this.app.uiManager.renderControlPanel();
        DMXMonitor.add('[QUICK] Tutte le fixture ON', 'success');
    }

    allOff() {
        this.app.fixtures.forEach(fixture => {
            this.applyColorToFixture(fixture, 0, 0, 0, 0);
        });
        this.app.uiManager.renderControlPanel();
        DMXMonitor.add('[QUICK] Tutte le fixture OFF', 'system');
    }

    fadeAll() {
        let fadeValue = 255;
        const fadeInterval = setInterval(() => {
            fadeValue -= 5;
            if (fadeValue <= 0) {
                fadeValue = 0;
                clearInterval(fadeInterval);
            }
            
            this.app.fixtures.forEach(fixture => {
                const dimmerIndex = fixture.type === 'moving-head' ? 6 : 0;
                fixture.values[dimmerIndex] = fadeValue;
                this.app.dmxController.setChannel(fixture.startChannel + dimmerIndex, fadeValue);
            });
            
            if (fadeValue === 0) {
                this.app.uiManager.renderControlPanel();
                DMXMonitor.add('[QUICK] Fade completato', 'success');
            }
        }, 50);
    }

    strobeAll() {
        this.app.fixtures.forEach(fixture => {
            this.app.shortcutManager.applyStrobeToFixture(fixture);
        });
        this.app.uiManager.renderControlPanel();
        DMXMonitor.add('[QUICK] Strobo su tutte le fixture', 'warning');
    }
}