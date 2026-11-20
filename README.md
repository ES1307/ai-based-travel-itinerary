# AI-Based Travel Itinerary Generator

A full-stack travel-planning application that creates personalised, multi-day itineraries from a traveller's destination, trip duration, budget, pace, and interests.

The app ranks attractions from a bundled destination dataset, prioritises exact and related interests, filters results by budget, and organises recommendations into daily plans. The responsive React interface presents the itinerary and can export it as a PDF.

![Application screenshot](srms.png)

## Features

- Step-by-step trip planner for destination, duration, budget, pace, and interests
- Budget-aware recommendations: `economical`, `moderate`, or `luxury`
- Pace-aware schedules: `relaxed` (2 places/day), `mild` (3 places/day), or `fast` (4 places/day)
- Interest matching for history, art, food, nature, nightlife, and related categories
- Attraction ranking based on interest relevance, rating, and budget fit
- Clear handling of days with no remaining matches
- Animated React user interface and downloadable PDF itineraries
- Flask JSON API with CORS enabled for local development

## Tech stack

| Area | Technology |
| --- | --- |
| Frontend | React 19, Vite, Tailwind CSS, Framer Motion |
| PDF export | jsPDF |
| Backend | Python, Flask, Flask-CORS |
| Data | Local JSON attraction dataset |

## Project structure

```text
AI-based-travel-itinerary/
├── backend/
│   ├── app.py          # Flask API (`POST /generate`)
│   ├── planner.py      # Recommendation and itinerary logic
│   └── places.json     # Bundled attraction data
├── travel-ui/
│   ├── src/App.jsx     # React planner interface
│   └── package.json    # Frontend dependencies and scripts
├── srms.png            # Application screenshot
└── travel_itinerary_architecture.png
```

## Getting started

### Prerequisites

- Python 3.9+
- Node.js 18+ and npm

### 1. Start the backend

Open a terminal in the project root:

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment:

```bash
# Windows (PowerShell)
.venv\Scripts\Activate.ps1

# macOS/Linux
source .venv/bin/activate
```

Install the API dependencies and run the server:

```bash
pip install flask flask-cors
python app.py
```

The API starts at `http://127.0.0.1:5000`.

### 2. Start the frontend

In a second terminal, from the project root:

```bash
cd travel-ui
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`). Keep the Flask server running while using the planner.

## API

### `POST /generate`

Creates an itinerary from the supplied travel preferences.

Request body:

```json
{
  "city": "Jaipur",
  "days": 3,
  "budget": "moderate",
  "style": "mild",
  "interests": ["history", "food", "art"]
}
```

Example response shape:

```json
{
  "itinerary": [
    {
      "day": 1,
      "label": "Day 1",
      "places": []
    }
  ],
  "notice": "",
  "covered_interests": ["history", "food"]
}
```

The API returns a `400` response if required fields are missing, the number of days is invalid, or the city is not present in `backend/places.json`.

## Customising the destination data

Add or update entries in `backend/places.json` to support more destinations. Each attraction needs this shape:

```json
{
  "name": "Example Attraction",
  "city": "Example City",
  "category": "history",
  "budget": "moderate",
  "rating": 4.6
}
```

Supported budget values are `economical`, `moderate`, and `luxury`. Categories can be expanded by updating `RELATED_CATEGORIES` in `backend/planner.py`.

## Useful frontend commands

Run these from `travel-ui/`:

```bash
npm run dev      # Start the Vite development server
npm run build    # Create a production build
npm run lint     # Run ESLint
npm run preview  # Preview the production build
```

## Notes

- Recommendations are generated from the local JSON dataset; the app does not currently call an external AI or maps service.
- The frontend is configured to call the local Flask API at `http://127.0.0.1:5000/generate`.

## License

This project currently has no license. Add a `LICENSE` file before publishing if you want to specify reuse terms.
