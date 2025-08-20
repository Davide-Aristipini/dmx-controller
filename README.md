markdown# DMX Light Controller Pro

Sistema professionale per il controllo luci DMX512 via browser.

## 🎯 Caratteristiche

- **Controllo DMX512 completo** con refresh rate continuo (25-40Hz)
- **Supporto multi-fixture**: Teste mobili (21ch), PAR LED (7ch), Luci fisse (8ch)
- **Scene Manager** con salvataggio/caricamento progetti
- **AI Scene Generator** con mood preimpostati
- **Shortcuts personalizzabili** per scene (qualsiasi lettera A-Z)
- **Visualizzazione palco** interattiva con canvas
- **BPM Sync** con tap tempo
- **Monitor DMX** in tempo reale

## 🔧 Requisiti

- **Browser**: Chrome/Edge (richiede Web Serial API)
- **Adapter DMX**: DSD TECH SH-RS09B USB to DMX Cable
- **Sistema**: Windows/Mac/Linux con porta USB

## 📁 Struttura Progettodmx-controller/
├── index.html              # Pagina principale
├── css/
│   └── styles.css         # Stili custom
├── js/
│   ├── main.js            # App principale e inizializzazione
│   ├── dmx-controller.js  # Comunicazione DMX512
│   ├── fixtures.js        # Gestione fixture
│   ├── scenes.js          # Gestione scene
│   ├── shortcuts.js       # Shortcuts tastiera
│   ├── ui-manager.js      # Gestione interfaccia
│   ├── canvas-stage.js    # Visualizzazione palco
│   ├── ai-generator.js    # Generatore scene AI
│   └── utils.js           # Utility e monitor
└── README.md

## 🚀 Installazione

1. Clona o scarica il repository
2. Apri `index.html` in Chrome o Edge
3. Collega l'adapter DMX USB
4. Clicca su "📡 Connetti" e seleziona la porta seriale

## ⌨️ Shortcuts Tastiera

### Shortcuts Riservate
- **1-9**: Macro colori (tutte le fixture)
- **Space**: Tap tempo
- **B**: Blackout globale
- **F**: Full on globale
- **S**: Sync to beat
- **Ctrl+S**: Salva scena
- **F1**: Emergency Stop
- **F2**: Panic Reset
- **F3**: System Reset

### Shortcuts Personalizzabili
- **A-Z** (eccetto B, F, S): Assegnabili alle scene
- Clicca ⌨️ su una scena per assegnare un tasto

## 🎮 Controllo DMX

### Protocollo
- **Baud Rate**: 250000
- **Data Bits**: 8
- **Stop Bits**: 2
- **Frame**: BREAK + MAB + 513 byte (start code + 512 canali)

### Loop Continuo
Il sistema mantiene un loop DMX continuo a 33Hz (configurabile 25-40Hz) per evitare che le luci tornino in modalità automatica. Il loop continua anche quando il browser è in background.

## 💡 Tipi di Fixture Supportate

### Testa Mobile (21 canali)
- Pan/Tilt con fine control
- Dimmer e Strobe
- RGB Front + Back
- Auto movement e macros

### PAR LED (7 canali)
- Master Dimmer
- RGB
- Funzioni speciali (strobe, jump, gradient, pulse, music)
- Controllo velocità effetti

### Luce Fissa (8 canali)
- Dimmer
- RGBW + Amber + UV
- Strobe

## 🎬 Scene e Progetti

### Salvataggio Scene
1. Imposta le luci come desiderato
2. Clicca "💾 Salva Scena"
3. Assegna un nome
4. (Opzionale) Assegna un tasto rapido

### Import/Export Progetti
- **Salva Progetto**: Esporta tutto in JSON
- **Carica Progetto**: Importa configurazione completa
- Include: fixture, scene, shortcuts, posizioni palco

## 🤖 AI Scene Generator

Modalità preimpostate:
- **Party**: Colori vivaci, cambio veloce
- **Romantico**: Toni caldi, transizioni lente
- **Energetico**: Colori brillanti, ritmo sostenuto
- **Chill**: Blu/cyan, movimento rilassato
- **Drammatico**: Contrasti forti, effetti teatrali
- **Casuale**: Generazione randomica continua

## 🐛 Troubleshooting

### Le luci tornano in automatico
- Verifica che il loop DMX sia attivo (33Hz)
- Controlla nel monitor che i frame vengano inviati
- Non minimizzare/chiudere il browser

### Connessione fallita
- Usa Chrome o Edge (non Firefox/Safari)
- Verifica che l'adapter sia collegato
- Prova a scollegare/ricollegare l'USB

### Comandi non rispondono
- Controlla l'indirizzo DMX delle fixture
- Verifica che i canali non si sovrappongano
- Usa F2 (Panic Reset) per resettare

## 📝 Note Tecniche

### Performance
- Loop DMX con `setInterval` invece di `requestAnimationFrame` per continuare in background
- Throttling slider a 50ms per evitare flood
- Buffer DMX aggiornato in tempo reale, frame inviati dal loop

### Storage
- LocalStorage per salvare configurazione
- Export/Import progetti in JSON
- Persistenza shortcuts e scene

## 🔗 Link Utili

- [Web Serial API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API)
- [DMX512 Protocol](https://en.wikipedia.org/wiki/DMX512)
- [DSD TECH Adapter](https://www.amazon.it/dp/B07F3RH5TY)

## 📄 Licenza

MIT License - Uso libero per progetti personali e commerciali

## 👨‍💻 Autore

Sviluppato per controllo professionale luci DMX via browser.
