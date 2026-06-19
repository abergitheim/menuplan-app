# Was git's z'ässe? 🍽️

Familienmenüplan Bernheim — Web-App für iPhone, iPad und Mac.

## Features

- Tagesansicht mit 3 Mahlzeiten (Frühstück, Mittagessen, Abendessen)
- Personen-Chips pro Mahlzeit (Alain, Sibylle, Noah) — ein Tap zum Toggeln
- Inline-Editing: Tippen → Fertig → automatisch gespeichert
- Echtzeit-Synchronisation via Firebase Realtime Database
- Offline-Modus mit LocalStorage-Fallback
- PWA: zum Home-Screen hinzufügbar (kein App Store)
- Swipe-Geste für Datumsnavigation

## Setup

### 1. Firebase konfigurieren (einmalig)

1. [Firebase Console](https://console.firebase.google.com) → Projekt `menuplan-bernheim`
2. Realtime Database erstellen (Region: europe-west1, Testmodus)
3. Projekteinstellungen → Web-App hinzufügen → `firebaseConfig` kopieren
4. `firebase-config.js` mit echten Werten ausfüllen (Datei ist in `.gitignore`)

### 2. Lokal testen

```bash
cd menuplan-app/
python3 -m http.server 8000
# Browser: http://localhost:8000
```

### 3. Auf GitHub Pages deployen

```bash
git init
git add .          # firebase-config.js wird von .gitignore ausgeschlossen
git commit -m "Initial commit: Menüplan-App Phase 1"
# GitHub Repo erstellen: https://github.com/new (Name: menuplan-app)
git remote add origin https://github.com/DEIN_USERNAME/menuplan-app.git
git branch -M main
git push -u origin main
# GitHub → Settings → Pages → main / (root) → Save
```

Für den Produktiv-Betrieb die Firebase-Konfiguration direkt in `app.js` eintragen
(akzeptabel für eine nicht öffentlich verlinkte Familien-App).

## Dateistruktur

```
menuplan-app/
├── index.html          # Single-Page-App
├── style.css           # Alle Styles (Mobile-First)
├── app.js              # App-Logik + Firebase-Integration
├── firebase-config.js  # Firebase-Keys (NICHT in Git!)
├── manifest.json       # PWA-Manifest
├── sw.js               # Service Worker (Phase 2)
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
├── .gitignore
└── README.md
```

## Tech Stack

- Vanilla HTML5 / CSS3 / JavaScript (ES6+) — kein Build-Prozess
- Firebase Realtime Database — Echtzeit-Sync
- GitHub Pages — Hosting
- PWA — Home-Screen installierbar

---

*Familie Bernheim — Phase 1, Juni 2026*
