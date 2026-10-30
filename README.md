# Project Olympiad · Clinical Bridge

An interactive tele-mentoring webpage for medical students, designed to help learners connect with clinical educators, plan mentoring conversations, and reflect on their progress.

## The idea

Clinical education depends on access to experienced teachers. Distance, disrupted placements, and crisis conditions can interrupt that access. Clinical Bridge explores how a simple online workspace could help medical students and interns maintain a connection to mentoring and structured learning.

This repository contains a frontend prototype that demonstrates the proposed student experience.

## Features

- **Learning dashboard:** View planned sessions and completed learning activities.
- **Mentor discovery:** Search six fictional mentor profiles by name or specialty.
- **Specialty filtering:** Explore Internal Medicine, Surgery, Pediatrics, Emergency Medicine, Neurology, and Family Medicine.
- **Session planner:** Select a mentor, preferred date, time, and learning goal; remove plans when needed.
- **Interactive learning:** Practice the SBAR handover framework with immediate feedback.
- **Learning goals and reflection:** Save a preparation goal and a post-session reflection.
- **Progress tracking:** Track completion of three learning activities.
- **Local persistence:** Keep plans and reflections between visits in the same browser.
- **Responsive interface:** Use the workspace on desktop or mobile screens.

## Quick start

No package installation or build step is required.

### Open directly

1. Download or clone this repository.
2. Open `index.html` in a modern web browser.

### Run a local server

With Git and Python installed:

```bash
git clone https://github.com/SoniaK-Lab/Project-Olympiad.git
cd Project-Olympiad
python -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000). On systems where Python is named `python3`, use `python3 -m http.server 8000`.

Because this repository is private, cloning requires an authorized GitHub account.

## Try the experience

1. Open **Find a mentor** and search or filter by specialty.
2. Choose **Plan a conversation**.
3. Enter a preferred date, time, and learning goal, then add the session to your plan.
4. Open **My sessions** to review or remove the plan.
5. Open **Learning hub** to answer the SBAR question and save your learning goal and reflection.
6. Return to **Overview** to see your progress.

## Repository structure

```text
Project-Olympiad/
├── index.html           # Page markup, styles, and interactive JavaScript
├── README.md            # Project overview and usage
└── CLINICAL_BRIDGE.md   # Additional setup and prototype notes
```

## Technology

- HTML5
- CSS with responsive layouts
- Vanilla JavaScript
- Browser `localStorage`
- Google Fonts, with local sans-serif fallbacks

There is no application backend, database, or build tool in this version.

## Data and privacy

Session plans, learning goals, reflections, and completion status are stored in this browser's `localStorage` under the key `clinicalBridge`.

- Data is not synchronized between browsers or devices.
- Clearing site data removes saved progress.
- The application does not send saved plans or reflections to a server.
- Google Fonts may make external requests to load typography.
- Do not enter patient identifiers, confidential clinical information, or other sensitive data.

## Prototype limitations

All mentor profiles are fictional examples. Adding a session creates a personal plan only: it does not contact a mentor, confirm availability, send invitations, or reserve an appointment.

This version does not include user accounts, verified mentor onboarding, messaging, video calls, notifications, calendar integration, or shared records. The content is for educational demonstration and does not replace clinical supervision or provide patient-specific medical advice.

## Possible next steps

- Student and mentor accounts with appropriate access controls
- Verified mentor profiles and real availability
- Booking requests and confirmation workflows
- Secure messaging and video-session integration
- Shared learning plans and mentor feedback
- Accessibility improvements and multilingual support
- Low-bandwidth workflows for disrupted learning environments

These are proposed directions, not implemented features.

## Development

Edit `index.html` to change the interface or interactions, then refresh the browser. Use a local server for a consistent development origin and storage behavior.

Before submitting changes, check mentor search and filtering, session creation and removal, learning feedback, saved progress after reload, and the layout on narrow screens.
