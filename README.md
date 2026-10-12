# Sitebook

A full-stack mini project for browsing construction projects and requesting site visits. The React client talks to an Express API, and booking records are stored in `data/bookings.json` so they persist between restarts.

## Run locally

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
``` https://github.com/irfan0503/building-booking-system.git

Open the Vite URL printed in the terminal (normally `http://localhost:5173`). The API runs on `http://localhost:3001`.

## Features

- Search projects and filter by project category or start date.
- Submit a site visit request with contact details, a preferred date, and notes.
- Review requests, mark visits confirmed or complete, and cancel requests.
- Persist bookings locally as JSON; project directory data is served by the API.

## API

- `GET /api/health`
- `GET /api/projects`
- `GET /api/bookings`
- `POST /api/bookings`
- `PATCH /api/bookings/:id`
- `DELETE /api/bookings/:id`
