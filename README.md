# Ethara Seat Allocation & Project Mapping System

Simple Vite + React demo for managing Ethara employee seating, project mapping, new joiner allocation, dashboard utilization, and natural language seat queries.

## Tech Stack

- Frontend: React with Vite
- Styling: Plain CSS, black and white theme
- Data: In-memory generated seed data for local demo
- AI Assistant: Rule-based natural language parser fallback

## Run Locally

```bash
npm install
npm run dev
```

Frontend local URL:

```text
http://127.0.0.1:5173
```

Backend local run:

```bash
npm run backend
```

Backend local URL:

```text
http://127.0.0.1:4000
```

## Demo Data Included

- 1,000 employees
- 2,500 seats
- 5 floors
- 6 zones
- 11 projects
- 500 reserved seats
- 150 maintenance seats
- More than 200 available seats
- 20 employees pending allocation

## Features

- Dashboard summary for employees, total seats, occupied, available, reserved, and pending joiners
- Project-wise seat utilization
- Floor-wise occupancy
- Employee search by name, employee ID, email, and project
- Filters for project, floor, zone, and seat status
- New joiner form with duplicate email validation
- Seat allocation based on project preferred zone
- Seat release flow that makes the seat available again
- Rule-based AI assistant for seat, project, available seat, neighbor, allocation, and utilization queries

## Business Rules Covered

- One employee can have only one active seat
- One seat can be allocated to only one employee
- Released seats become available
- Reserved and maintenance seats are not allocated by the allocator
- New joiner allocation prefers the project team zone
- Duplicate employee email is blocked
- Dashboard values update after allocation and release

## Suggested Database Schema

```sql
CREATE TABLE projects (
  id INTEGER PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  manager_name VARCHAR(120),
  status VARCHAR(30) DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE employees (
  id INTEGER PRIMARY KEY,
  employee_code VARCHAR(30) UNIQUE NOT NULL,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) UNIQUE NOT NULL,
  department VARCHAR(80),
  role VARCHAR(80),
  joining_date DATE,
  status VARCHAR(40),
  project_id INTEGER REFERENCES projects(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE seats (
  id INTEGER PRIMARY KEY,
  floor INTEGER NOT NULL,
  zone VARCHAR(10) NOT NULL,
  bay INTEGER NOT NULL,
  seat_number VARCHAR(30) NOT NULL,
  status VARCHAR(30) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (floor, zone, seat_number)
);

CREATE TABLE seat_allocations (
  id INTEGER PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id),
  seat_id INTEGER REFERENCES seats(id),
  project_id INTEGER REFERENCES projects(id),
  allocation_status VARCHAR(30),
  allocation_date DATE,
  released_date DATE
);
```

## API Documentation

For this quick Vite demo, APIs are represented by React functions and documented here for backend implementation.

### Employee APIs

- `POST /employees` - Create employee
- `GET /employees` - List employees
- `GET /employees/{id}` - Get employee details
- `PUT /employees/{id}` - Update employee
- `DELETE /employees/{id}` - Deactivate employee

### Project APIs

- `POST /projects` - Create project
- `GET /projects` - List projects
- `GET /projects/{id}/employees` - List project employees

### Seat APIs

- `POST /seats` - Create seat
- `GET /seats` - List seats
- `GET /seats/available` - List available seats
- `POST /seats/allocate` - Allocate seat
- `POST /seats/release` - Release seat

### Dashboard APIs

- `GET /dashboard/summary`
- `GET /dashboard/project-utilization`
- `GET /dashboard/floor-utilization`

### AI Assistant API

```http
POST /ai/query
Content-Type: application/json

{
  "query": "Where is my seat? My email is amit@ethara.ai"
}
```

```json
{
  "answer": "Amit Sharma is seated on Floor 1, Zone A, Bay 1, Seat A1-01. Project: Indigo."
}
```

## Sample Queries

- Where is employee Amit seated?
- Where is my seat? My email is amit@ethara.ai
- Show all available seats on Floor 3
- Who is sitting near me?
- How many seats are occupied for Project Indigo?
- Allocate a seat for a new employee joining today

## Deployment Notes

Recommended quick deployment:

- Frontend: Vercel or Netlify
- Backend: Render or Railway
- Database later: PostgreSQL on Railway, Render, or Neon

Build command:

```bash
npm run build
```

Output directory:

```text
dist
```

Backend deploy settings:

```text
Build command: npm install
Start command: npm start
Health/API test path: /dashboard/summary
```

## Submission Fields

- GitHub Repository Link: paste the GitHub repo URL after pushing this folder.
- Frontend Hosted URL: paste the Vercel or Netlify app URL.
- Backend Hosted URL: paste the Render or Railway API URL.
- AI_prompt.MD: upload the included `AI_PROMPTS.md` file.

## Screenshots

Capture screenshots after running locally:

- Dashboard
- Search and filters
- New joiner allocation
- AI assistant response

## Sample Login

Authentication is not added in this quick demo. The app opens directly.
