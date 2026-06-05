# hermes-todo

A task management application with a dark editorial aesthetic. SQLite-backed REST API (Express) + React 19 frontend (Vite).

## Structure

```
hermes-todo/
├── server/          # Express + better-sqlite3 API
│   ├── src/
│   │   ├── index.js
│   │   ├── db.js
│   │   └── routes/
│   │       └── tasks.js
│   └── package.json
└── client/          # React 19 + Vite
    ├── src/
    │   ├── main.jsx
    │   ├── App.jsx
    │   ├── styles/
    │   │   └── tokens.css    # Design tokens (extracted from personal-portfolio)
    │   ├── components/
    │   └── lib/
    │       └── api.js
    └── package.json
```

## Design Tokens

Colors, typography, spacing and motion extracted from `~/workspace/personal-portfolio/`:

- **Background**: `#0c0c0d` (deep black)
- **Text**: `#f2efe8` (warm off-white)
- **Muted**: `#9b978c`, **Faint**: `#57564f`
- **Accent**: `#c5e063` (lime)
- **Fonts**: Inter (sans) + JetBrains Mono (mono)
- **Spacing**: 4pt scale, **Radii**: 4/8/12 + pill
- **Borders**: 1px hairlines, focus outline 2px lime

## Setup

```bash
# Backend
cd server
npm install
npm run dev          # → http://localhost:3001

# Frontend (in a separate terminal)
cd client
npm install
npm run dev          # → http://localhost:5173
```

## API

| Method | Endpoint             | Description           |
|--------|----------------------|-----------------------|
| GET    | `/api/tasks`         | List all tasks        |
| POST   | `/api/tasks`         | Create a task         |
| PATCH  | `/api/tasks/:id`     | Update a task         |
| DELETE | `/api/tasks/:id`     | Delete a task         |
| GET    | `/api/tasks/stats`   | Aggregate statistics  |

Task shape:
```json
{
  "id": 1,
  "title": "string",
  "description": "string | null",
  "status": "pending | in_progress | done",
  "priority": "low | medium | high",
  "due_date": "ISO string | null",
  "created_at": "ISO string",
  "updated_at": "ISO string"
}
```
