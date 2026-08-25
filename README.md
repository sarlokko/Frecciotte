# Frecciotte

Clone web di **Amaze GO! / Freccia Rompicapo**: un rompicapo minimalista in cui fai uscire le frecce dalla griglia nell'ordine giusto.

## Come si gioca

1. Ogni freccia punta in una direzione (↑ → ↓ ←).
2. Tocca una freccia solo se il percorso fino al bordo è libero.
3. Un tocco bloccato costa un cuore (ne hai 3 per livello).
4. Svuota la griglia per completare il livello.
5. Usa **Suggerimento** per evidenziare una mossa sicura.

## Avvio

```bash
npm install
npm run dev
```

Poi apri l'URL mostrato da Vite (di solito `http://localhost:5173`).

```bash
npm run build
npm run preview
```

## Stack

- Vite + TypeScript
- Nessuna dipendenza di runtime: tutto client-side, progresso in `localStorage`
