# Job Hunt Manager — Browser Extension

A Manifest V3 Chrome extension that autofills job application forms on Greenhouse and Lever using your Job Hunt Manager profile, and automatically marks applications as **Applied** when you submit them.

## Prerequisites

- The Job Hunt Manager backend must be running locally on port 8000 (`uv run python main.py`)
- Your profile must be filled out at `http://localhost:5173/profile`, including the autofill fields: Phone, LinkedIn URL, Website/Portfolio URL, and Work Authorization

## Installation

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `browser_extension/` directory from this project

The extension icon will appear in your toolbar. Pin it for easy access.

## Usage

### Autofilling a form

1. Navigate to a job application page on Greenhouse or Lever
2. Click the extension icon in your toolbar
3. Click **Fill Form**

The extension will populate standard fields (name, email, phone, location, LinkedIn URL, website) using your saved profile. File upload fields (resume, cover letter) are not filled — you'll handle those manually.

Review the filled fields, make any edits, then submit as normal.

### Marking an application as Applied

Applications are tracked automatically when you submit a form — the extension intercepts the submission and sends it to your backend in the background.

If automatic detection doesn't fire (some forms use non-standard submission flows), click **Mark as Applied** in the popup before or after submitting. This will create or update the job in your Matches list with `applied` status, which also syncs to the Kanban board.

## Supported platforms

| Platform | Autofill | Auto-detect submission |
|---|---|---|
| Greenhouse (`boards.greenhouse.io`) | Yes | Yes |
| Greenhouse (`job-boards.greenhouse.io`) | Yes | Yes |
| Lever (`jobs.lever.co`) | Yes | Yes |

## Field mapping

| Profile field | Greenhouse | Lever |
|---|---|---|
| First / Last name | `#first_name`, `#last_name` | `input[name="name"]` |
| Email | `#email` | `input[name="email"]` |
| Phone | `#phone` | `input[name="phone"]` |
| Location | `#job_application_location` | — |
| LinkedIn URL | label search for "linkedin" | `input[name="urls[LinkedIn]"]` |
| Website / Portfolio | label search for "website" / "portfolio" | `input[name="urls[Portfolio]"]` |
| Work Authorization | label search for "work authorization" | — |

Custom questions on Greenhouse are matched by label text, so LinkedIn and website fields will fill even if their IDs vary between companies.
