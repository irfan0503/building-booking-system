# Sitebook

A full-stack mini project for browsing construction projects and requesting site visits. The React client talks to an Express API, and booking records are stored in `data/bookings.json` so they persist between restarts.

## Run locally

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Open the Vite URL printed in the terminal (normally `http://localhost:5173`). The API runs on `http://localhost:3001`.

## Deploy on Render

Push the project to GitHub, then create a Blueprint instance in Render and connect the repository. Render reads `render.yaml` to build and serve the app as one web service. The Blueprint provisions a 1 GB persistent disk for booking and project-tracking data; Render's Starter service and disk require a paid plan. After the service deploys, use its `onrender.com` URL.

## Features

- Search projects and filter by project category or start date.
- Track project completion, stage milestones, and site journal updates in real time.
- Submit a site visit request with contact details, a preferred date, and notes.
- Review requests, mark visits confirmed or complete, and cancel requests.
- Persist bookings locally as JSON; project directory data is served by the API.

## API

- `GET /api/health`
- `GET /` serves the production-built React application.
- `GET /api/projects`
- `GET /api/projects/events` (Server-Sent Events stream)
- `PATCH /api/projects/:id/tracking`
- `GET /api/bookings`
- `POST /api/bookings`
- `PATCH /api/bookings/:id`
- `DELETE /api/bookings/:id`