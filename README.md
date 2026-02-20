# Squarespace Blog Overlay Plugin

A full-stack application that enables custom blog layouts on Squarespace sites through code injection.

## How It Works

1. **Configuration App**: Users configure their blog layout preferences via a React web interface
2. **Code Injection**: Users paste a `<script>` tag into Squarespace's Code Injection settings
3. **Loader Script**: The injected `loader.js` fetches site config from `GET /api/config/:siteKey`
4. **Renderer**: The `renderer.js` bundle overlays a custom layout on the Squarespace blog page using the fetched config and Squarespace's blog JSON

## Architecture

```
squarespace-blog/
├── client/                      # React frontend (Vite + TypeScript)
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       └── components/
├── server/                      # Node.js backend (Express + TypeScript)
│   └── src/
│       ├── index.ts             # Express server entry
│       ├── routes/
│       │   └── config.ts        # Config endpoints
│       └── db/
│           ├── index.ts         # SQLite connection
│           └── schema.sql       # Database schema
└── scripts/                     # Squarespace injection scripts
    ├── loader.js                # Lightweight loader for code injection
    └── renderer.js              # Blog overlay renderer
```

## Tech Stack

- **Frontend**: React + Vite + TypeScript
- **Backend**: Express.js + TypeScript
- **Database**: SQLite (better-sqlite3)
- **Monorepo**: npm workspaces

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/config/:siteKey` | GET | Returns site config JSON (public, for loader.js) |
| `/api/config` | POST | Save/update site config |
| `/api/user` | GET | Get current user info (authenticated) |

## Development

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
npm install
```

### Running Locally

Start the backend server:
```bash
npm run dev --workspace=server
```

Start the frontend dev server:
```bash
npm run dev --workspace=client
```

### Testing the Config Endpoint

```bash
curl http://localhost:3001/api/config/demo-site-key
```

## Squarespace Integration

Add the following to your Squarespace site's Code Injection (Settings > Advanced > Code Injection):

```html
<script src="https://your-domain.com/loader.js" data-site-key="YOUR_SITE_KEY"></script>
```

The loader will automatically fetch your config and apply your custom blog layout.
