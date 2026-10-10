# AppCapsule

**La tua app. In un file.**

Trasforma un'applicazione Vite in una demo HTML interattiva, utilizzabile anche offline. Registra un percorso con dati dimostrativi, incorpora frontend e risposte API, poi verifica lo stesso percorso con la rete disabilitata.

## Provala

```sh
git clone https://github.com/carlogiovannifalocco-byte/appcapsule.git
cd appcapsule
npm ci
npx playwright install chromium
npm run build
npm run demo
```

Apri `capsules/signal.html`. Puoi cercare e salvare progetti, passare dalla griglia alla lista, cambiare tema, aggiungere attività, completare passaggi e creare progetti temporanei. **Ctrl/⌘ K** apre la ricerca rapida di progetti e azioni. Il server è già stato spento dallo script.

Con **Inside the capsule** esplori le risposte registrate, cerchi gli endpoint e controlli quali sono stati usati. Puoi scaricare un resoconto della sessione senza i corpi delle risposte, ridurre i controlli o ricominciare la demo. Questo resoconto è distinto dal rapporto di verifica offline del file.

Servono Node.js 22.12+ e Chromium per creare e verificare le capsule. Chi riceve il file usa il browser. Il pacchetto già compilato e tre demo sono disponibili nelle [release](https://github.com/carlogiovannifalocco-byte/appcapsule/releases).

## Cosa supporta

App Vite con un ingresso HTML, interazioni locali, navigazione tramite hash, risposte GET/HEAD JSON o testo, fetch e una parte documentata di XHR. La verifica automatica usa Chromium offline e produce un rapporto legato al file mediante SHA-256.

La prima versione non esporta il backend: autenticazione, scritture HTTP, streaming, risorse esterne e percorsi non registrati non diventano disponibili offline. Usa dati fittizi e controlla il contenuto prima di condividere. Il controllo dei dati sensibili è parziale, non una garanzia di anonimizzazione.

[Guida completa in inglese](../README.md) · [Compatibilità](compatibility.md) · [Configurazione](configuration.md)
