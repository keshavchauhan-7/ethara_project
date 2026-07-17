# AI Prompts Used

## Prompt 1 - Architecture

Need to build a quick Vite React demo for Ethara Seat Allocation & Project Mapping System. Keep UI very simple in black and white. Include dashboard, employee search, project mapping, seat allocation, new joiner flow, and AI assistant fallback. Generate seed data in frontend for 1,000 employees and 2,500 seats.

## Prompt 2 - Database

Design database schema for employees, projects, seats, and seat_allocations. Include constraints for duplicate employee email, duplicate seat number per floor and zone, one active seat per employee, and one active employee per seat.

## Prompt 3 - Backend APIs

Create REST API documentation for employees, projects, seats, dashboard summary, project utilization, floor utilization, and AI query endpoint. Keep it compatible with a future Express or FastAPI backend.

## Prompt 4 - Seat Allocation Logic

Build simple allocation logic where a pending employee gets an available seat near the preferred project zone. If the preferred zone is full, suggest any available seat. Reserved and maintenance seats should not be allocated.

## Prompt 5 - AI Assistant

Create a rule-based natural language assistant that can answer: where is my seat, which project am I assigned to, show available seats on a floor, who is sitting near me, how many seats are occupied for a project, and suggest allocation for a new joiner.

## Prompt 6 - Frontend

Create a simple responsive black and white React UI with dashboard cards, filters, employee table, allocation buttons, new joiner form, AI assistant input, and utilization bars. Avoid complex styling and keep the app demo-ready.

## Prompt 7 - Testing

Validate that generated data includes at least 1,000 employees, 2,500 seats, 6 zones, 5 projects, 500 reserved seats, 200 available seats, and 20 pending allocation employees. Run lint and production build.

## Prompt 8 - Debugging

Fix any React runtime, lint, or build issues. Check allocation and release updates dashboard counts correctly. Check duplicate email validation and AI query responses.

## Prompt 9 - Deployment

Document deployment steps for Vercel or Netlify. Use npm run build and dist as output directory. Mention backend can be deployed later on Render or Railway.

## Prompt 10 - Refactoring

Keep the implementation in a compact Vite React app. Avoid overengineering. Make code readable enough for assessment review and keep docs submission-ready.

## What AI Generated Correctly

- Vite React app structure
- Seed data generation approach
- Dashboard metrics
- Employee search and filters
- Seat allocation and release flows
- Rule-based AI assistant
- README and API documentation

## What AI Generated Incorrectly

- Initial scaffold was only the default Vite starter and did not include business features.
- Backend APIs are documented but not implemented as a real server because the requested quick delivery was a simple Vite app.
- The AI assistant is a keyword-based fallback, not an external OpenAI, Claude, Gemini, or LangChain integration.

## Candidate Manual Fixes

- Replaced default Vite screen with Ethara-specific UI.
- Added generated seed data meeting the assessment counts.
- Added duplicate email validation.
- Added allocation logic that avoids reserved and maintenance seats.
- Added README with schema and API documentation.
- Added this AI prompt usage file for assessment submission.

## Verification Performed

- Checked app compiles with Vite production build.
- Checked lint command.
- Verified dashboard count logic from generated employees and seats.
- Verified seat release changes occupied seat to available.
- Verified allocation changes pending employee to active and assigns a seat.
- Verified assistant sample queries return meaningful answers.
