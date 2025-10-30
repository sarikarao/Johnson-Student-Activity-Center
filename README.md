# JSAC Student Insights Dashboard

Interactive dashboard for the Johnson STEM Activity Center to explore student demographics and attendance trends from exported Excel files (e.g., OneTap). Built with React, TypeScript, Vite, Chart.js, and react-chartjs-2.

## Overview

Upload a .xlsx/.xls file and the app will:

- Parse rows into normalized student records.
- Identify unique students and compute summary metrics.
- Visualize breakdowns by county, grade, gender, zip, school, and age.
- Show activity over time (by month and by week) as tables or charts.
- List currently checked-in students (not yet checked out) and details.
- Let you drill into a specific student’s full check-in/out history.

No backend or database is required. All processing is done in the browser.

## Tech Stack

- React 18 + TypeScript
- Vite 5 (dev server and build)
- Chart.js 4 + react-chartjs-2
- date-fns for date parsing/formatting
- xlsx for reading Excel files

## Getting Started

Prerequisites:

- Node.js 18+ and npm

Install dependencies:

```bash
npm install
```

Run the app in development:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

Then open the local URL printed by the CLI.

## Using the App

1. Start the app and open it in your browser.
2. Click “Select Excel file” and choose a .xlsx/.xls export.
3. The app auto-detects the header row, parses records, and renders:
   - Summary metrics cards.
   - A preview table of unique student records (first 20).
   - An “Active Check-ins” selector to view current check-ins.
   - Multiple charts showing breakdowns.
   - Activity over time with Table/Chart toggle for Monthly and Weekly views.

## Expected Excel Format

The app maps columns by normalizing header text and matching to known fields. These headers are expected (case-insensitive, punctuation-insensitive):

- Student Name (or First/Last Name combined into Name)
- Gender
- Age
- Team Name
- Team Number
- School Name
- County
- Home Zip Code
- Grade
- Check-In Date
- Check-Out Date
- Elapsed Time (min)

Notes on parsing:

- Dates: Supports Excel serial dates, ISO strings, common date strings, and strings like `YYYY-MM-DD HH:MM AM/PM ±HH:MM` with timezone offset.
- Booleans: `checkedIn`, `checkedOut`, and `adult?` accept values like yes/no, true/false, y/n, adult/youth/child, or 1/0.
- Unique Students: Computed from name + age + team name + team number when a valid check-in date is present.
- Active Check-ins: Records with `checkedIn = true` and not `checkedOut = true`, deduped by email/name with the latest check-in time.

## Charts and Tables

- Breakdown charts: County (pie), Grade (bar), Gender (pie), Zip (bar), School (bar), Age (bar).
- Activity over time:
  - Monthly: counts per calendar month.
  - Weekly: Sunday-Saturday ranges in UTC for stable grouping.
- Tables mirror the same aggregations for easy copy/paste.

## Troubleshooting

- If parsing fails: ensure your export includes the expected headers and that date columns are actual dates or consistent date strings.
- If counts look off: verify Name/Age/Team fields; these are used to dedupe unique students.
- Large files: parsing happens in-browser; very large sheets may be slow.

## Project Structure

- `index.html`: App entry mounting the React root.
- `src/main.tsx`: React root bootstrapping.
- `src/App.tsx`: All UI, parsing, aggregation, and chart rendering.
- `src/App.css`: Styling for layout, tables, and cards.
- `vite.config.ts`: Vite + React plugin configuration.

## NPM Scripts

- `npm run dev`: Start dev server.
- `npm run build`: Type-check and build the app.
- `npm run preview`: Preview the production build locally.
