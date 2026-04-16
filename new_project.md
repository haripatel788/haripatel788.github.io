# Weekly Call Reminder Bot

## Overview
The **Weekly Call Reminder Bot** is a fully automated, serverless scheduling and notification system designed to manage recurring weekly meetings. It eliminates the manual overhead of assigning meeting roles by utilizing a custom fairness algorithm that tracks participation history, respects user availability (e.g., vacation statuses), and automatically delivers tagged reminders to a Telegram group chat.

## System Architecture
This project operates on a serverless architecture, leveraging **GitHub Actions** for scheduling and execution, **Google Sheets API** for state management and database hosting, and the **Telegram API** for frontend delivery.

### Tech Stack
* **Language:** Python 3.10
* **CI/CD & Compute:** GitHub Actions
* **Database / State Management:** Google Sheets (via `gspread` and `google-oauth2`)
* **Notifications:** Telegram Bot API (`requests`)

---

## Core Features & Logic

### 1. Smart Role Assignment Algorithm
At the heart of the bot is a dynamic assignment algorithm that ensures fair distribution of meeting roles (Shlok & Jaynaad, Prasang, and Ending Shlok). 
* **State Fetching:** The bot connects to a Google Sheet named "Weekly Call Tracker" and pulls data from three distinct worksheets: the Main Logs, the Frequency Tracker, and the Roster.
* **Availability Filtering:** It parses the Roster to build a pool of eligible participants, explicitly filtering out individuals marked with a "vacation" status.
* **Cooldown Mechanism:** The algorithm checks the previous week's logs and removes last week's participants from the current eligible pool to prevent back-to-back assignments.
* **Fairness Sorting:** The remaining available names are sorted based on their historical participation frequency. The bot selects the three individuals with the lowest total participation and randomizes their specific role assignments to ensure variety.

### 2. Automated State Management (Google Sheets)
Instead of relying on local JSON files (like the legacy `history.json` implementation), the bot natively uses Google Sheets as a database to ensure persistence across ephemeral GitHub Actions runners.
* **Logging:** It appends a new row to the main log sheet containing the generated date, the selected participants, the pool size, and the cooldown list.
* **Frequency Rebuilding:** It recalculates the total participation for every member and overwrites the "Frequency Tracker" sheet, sorting the members from highest to lowest participation for easy auditing.

### 3. Serverless Scheduling via GitHub Actions
The bot is executed via a GitHub Actions workflow (`schedule.yml`) triggering on specific cron schedules.
* **Traffic Jam Avoidance:** The cron jobs are purposefully shifted off the standard hour/half-hour marks (e.g., `28 1 * * 2` for 1:28 UTC) to avoid execution delays caused by heavy GitHub Actions traffic.
* **Multi-Stage Reminders:** The schedule is configured to run at three distinct times:
  * Monday 9:28 PM EDT (Initial heads-up)
  * Tuesday 8:27 PM EDT (1-hour warning)
  * Tuesday 9:13 PM EDT (15-minute final warning)

### 4. Context-Aware Telegram Notifications
When the bot successfully determines the roster, it constructs a rich text message for Telegram.
* **Dynamic Time Phrasing:** The `get_time_phrase()` function checks the current execution day and hour using `ZoneInfo("America/New_York")` and adjusts the message header accordingly (e.g., "Tomorrow @ 9:30 PM EST" vs. "Tonight @ 9:30 PM EST (Starts in 15 mins!)").
* **User Tagging:** It maps standard roster names to Telegram usernames (e.g., `@haripatel788`) so that assigned users receive push notifications directly alerting them to their roles. Static roles (Sabha Overview and Announcements) are permanently assigned and tagged to Haribhai.

---

## Security & Environment Configuration

The bot strictly separates configuration from code. All sensitive keys are injected securely into the GitHub Actions runner via GitHub Secrets:
* `BOT_TOKEN`: The Telegram Bot API token.
* `CHAT_ID`: The specific Telegram chat destination.
* `THREAD_ID`: Used to route the message to a specific topic within a Telegram supergroup.
* `GCP_CREDENTIALS`: A JSON string of the Google Cloud Service Account credentials required to authenticate with the Google Sheets API.

## Future Improvements
* Migrate the static Microsoft Teams link within the `bot.py` message payload to an environment variable for easier updates.
* Add error handling/alerts for Google Sheets API rate limits or downtime.