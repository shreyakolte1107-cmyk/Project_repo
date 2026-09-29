# Exam Timetable (Basic)

A simple exam timetable website for a college. Admins add exams for a class (year + section); students log in and see only the exams for their own year and section.

Built with plain **HTML, CSS and JavaScript**. No backend or build step is needed; data is stored in the browser's `localStorage`.

## How to run

1. Download or clone this repository.
2. Open `index.html` in a browser (or use the VS Code "Live Server" extension).

## Deploy (optional)

Upload the folder to **Netlify**, **Vercel** or **GitHub Pages**. It is a static site, so no settings are needed.

## Test credentials

| Role    | Email               | Password   |
|---------|---------------------|------------|
| Admin   | admin@college.com   | admin123   |
| Student | student@college.com | student123 |

The demo student is in **Year 3, Section A**. Sample exams for other classes are included so you can check the filtering.

To register a new **Admin**, use the admin code `ADMIN123` (set in `script.js`). New students choose their year and section while registering.

## Features

- Separate Register and Login for Admin and Student (role selection).
- Admin dashboard: add exams (subject, year, section, date, start time, end time), view all exams, delete exams.
- Student dashboard: timetable filtered strictly by the student's own year and section, sorted by date and time.
- Validation: all fields are required, and end time must be after start time. Errors are listed clearly.
- Empty state: a student with no exams sees an informative message.
- Not included (by design): seating arrangement, clash detection, timetable generation.

## Files

- `index.html`: page structure (auth, admin and student views)
- `style.css`: layout and styling
- `script.js`: registration, login, exam management, filtering

## Note on code and tools

- **HTML** builds the three views (login/register, admin, student). JavaScript shows one view at a time based on the logged-in user's role.
- **CSS** uses variables, flexbox and grid, and works on mobile screens.
- **JavaScript** stores users and exams as JSON in `localStorage`. Passwords are hashed with SHA-256 (Web Crypto API) before saving. The session is kept in `sessionStorage`, so it ends when the tab closes. Exam text is escaped before it is shown on the page.
- **Filtering:** the student view uses `exam.year === user.year && exam.section === user.section`.

## Limitation

Because data lives in the browser, accounts and exams are not shared between devices. For a real deployment, replace the `load` and `save` helpers with API calls to a Node.js/Express and MongoDB backend, and add server-side authentication.