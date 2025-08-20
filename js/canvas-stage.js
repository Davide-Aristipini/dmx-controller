// Stage canvas visualization
class StageCanvas {
    constructor(app) {
        this.app = app;
        this.canvas = null;
        this.ctx = null;
        this.stageFixtures = [];
        this.draggingFixture = null;
        this.offsetX = 0;
        this.offsetY = 0;
    }

    initialize() {
        this.canvas = document.getElementById('dmx-canvas');
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
            this.resizeCanvas();
            window.addEventListener('resize', () => this.resizeCanvas());
            this.setupEventListeners();
            this.startRenderLoop();
        }
    }

    setupEventListeners() {
        if (!this.canvas) return;
        
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.handleMouseUp());
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
    }

    resizeCanvas() {
        if (!this.canvas) return;
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
    }

    startRenderLoop() {
        if (!this.canvas || !this.ctx) return;
        
        const render = () => {
            this.drawStage();
            requestAnimationFrame(render);
        };
        render();
    }

    drawStage() {
        if (!this.canvas || !this.ctx) return;
        
        // Clear canvas
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid
        this.ctx.strokeStyle = 'rgba(75, 85, 99, 0.3)';
        this.ctx.lineWidth = 1;
        for (let x = 0; x < this.canvas.width; x += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        for (let y = 0; y < this.canvas.height; y += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        
        // Draw fixtures
        this.stageFixtures.forEach(sf => {
            const fixture = sf.fixture;
            const dimmerIndex = fixture.type === 'moving-head' ? 6 : 0;
            const dimmer = fixture.values[dimmerIndex] / 255;
            
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
            
            // Draw light effect
            if (dimmer > 0) {
                const radius = 80 * dimmer;
                const gradient = this.ctx.createRadialGradient(sf.x, sf.y, 0, sf.x, sf.y, radius);
                gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${dimmer * 0.8})`);
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();
                this.ctx.arc(sf.x, sf.y, radius, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            // Draw fixture
            const size = fixture.type === 'moving-head' ? 20 : 15;
            this.ctx.fillStyle = fixture.id === this.app.selectedFixtureId ? '#3B82F6' : '#6B7280';
            this.ctx.beginPath();
            this.ctx.arc(sf.x, sf.y, size, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.strokeStyle = fixture.id === this.app.selectedFixtureId ? '#60A5FA' : '#9CA3AF';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // Draw name
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = '12px Inter';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(fixture.name, sf.x, sf.y + size + 15);
            
            // Draw pan indicator for moving heads
            if (fixture.type === 'moving-head') {
                const pan = fixture.values[0] || 0;
                
                this.ctx.strokeStyle = '#FBBF24';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                const angle = (pan / 255) * Math.PI * 2;
                const lineLength = size + 10;
                this.ctx.moveTo(sf.x, sf.y);
                this.ctx.lineTo(
                    sf.x + Math.cos(angle) * lineLength,
                    sf.y + Math.sin(angle) * lineLength
                );
                this.ctx.stroke();
            }
        });
    }

    handleClick(e) {
        if (!this.app.selectedFixtureId) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const fixture = this.app.fixtures.find(f => f.id === this.app.selectedFixtureId);
        if (fixture) {
            this.stageFixtures = this.stageFixtures.filter(sf => sf.fixture.id !== fixture.id);
            
            this.stageFixtures.push({
                fixture: fixture,
                x: x,
                y: y
            });
            
            DMXMonitor.add(`[PALCO] ${fixture.name} posizionata`, 'system');
            this.app.saveToStorage();
        }
    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        for (let i = this.stageFixtures.length - 1; i >= 0; i--) {
            const sf = this.stageFixtures[i];
            const distance = Math.sqrt((mouseX - sf.x) ** 2 + (mouseY - sf.y) ** 2);
            const size = sf.fixture.type === 'moving-head' ? 20 : 15;
            
            if (distance < size) {
                this.draggingFixture = sf;
                this.offsetX = mouseX - sf.x;
                this.offsetY = mouseY - sf.y;
                this.app.fixtureManager.selectFixture(sf.fixture.id);
                return;
            }
        }
    }

    handleMouseMove(e) {
        if (!this.draggingFixture) return;
        
        const rect = this.canvas.getBoundingClientRect();
        this.draggingFixture.x = e.clientX - rect.left - this.offsetX;
        this.draggingFixture.y = e.clientY - rect.top - this.offsetY;
    }

    handleMouseUp() {
        this.draggingFixture = null;
    }

    clearStage() {
        this.stageFixtures = [];
        DMXMonitor.add('[PALCO] Pulito', 'system');
        this.app.saveToStorage();
    }
}