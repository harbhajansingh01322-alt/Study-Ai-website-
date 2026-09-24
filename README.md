# StudyAI — Complete Working Educational Platform

Production-ready client app with real persistence, full quiz engine, AI chat (Gemini), auth, admin, favorites, planner, and more.

## Features (all working)

| Feature | Status |
|--------|--------|
| Login / Signup / Forgot password | Working (local + Firebase-ready) |
| Google login | Works with Firebase; local fallback without Firebase |
| PDF Library | Search, preview, download, favorites, admin upload |
| Quizzes | Timer, scoring, review, leaderboard, history, custom quizzes via admin |
| AI Assistant | Gemini API when key set; rich offline answers otherwise |
| Dashboard | Live streak, points, quiz history, favorites count, tasks |
| Study Planner | Tasks add/edit/delete + Pomodoro (saved) |
| Favorites | Persist per user |
| Global search | PDFs, quizzes, blogs, videos, courses |
| Blog | Loaded from DB; admin can publish |
| Contact form | Messages stored; visible in Admin |
| Notifications | Mark read, badge |
| Dark / Light mode | Saved |
| Hindi / English | Interface strings |
| Admin panel | Real analytics, upload PDF, publish blog, manage users/roles, messages |

## Quick start

1. Unzip and open `index.html` in a browser
   **or** run a local server:

```bash
cd StudyAI
npx serve .
# or: python3 -m http.server 8080
```

2. **Sign up** with any email + password (6+ characters).
3. **Admin:** use an email containing `admin` (e.g. `admin@studyai.com`) then open `/admin/`.

## Gemini AI (real chat)

1. Get a free key: https://aistudio.google.com/apikey
2. Open **AI Assistant** → paste key in sidebar → **Save Key**
3. Chat uses Gemini 1.5 Flash. Key is stored in browser settings only.

Optional: set default key in `js/firebase-config.js`:

```js
window.GEMINI_DEFAULT_KEY = 'your-key';
```

## Firebase (optional production backend)

1. Create project at Firebase Console
2. Enable Authentication (Email/Password + Google), Firestore, Storage
3. Edit `js/firebase-config.js` — set FIREBASE_ENABLED = true and paste config
4. Add Firebase SDK script tags before firebase-config.js

Without Firebase, the app uses a full localStorage database (`js/db.js`) so every feature still works.

## Folder structure

```
StudyAI/
├── index.html
├── css/styles.css
├── js/
│   ├── db.js
│   ├── main.js
│   ├── quiz.js
│   └── firebase-config.js
├── pages/
├── admin/index.html
└── README.md
```

## License

MIT
