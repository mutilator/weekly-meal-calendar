# Weekly Meal Calendar Card

A Home Assistant Lovelace card that displays one calendar event per day for the next seven days. Each day shows the weekday name and
the event summary (single event). Tapping "Add" or "Edit" will prompt for a meal name and create/update a 
full-day event on the selected calendar entity. It displays the current day and the next 7 days.

> **Note:** To edit or delete events, you must have the **[clockwork](https://github.com/mutilator/Clockwork)** 
> calendar integration installed and active. Creating new events requires only the standard 
> Home Assistant calendar integration.

## Installation

### HACS (recommended)

1. Open HACS in Home Assistant
2. Click **Frontend**
3. Click the three dots in the top right and select **Custom repositories**
4. Add the repository URL: `https://github.com/mutilator/weekly-meal-calendar`
5. Choose **Lovelace** as the category and click **Add**
6. Search for **Weekly Meal Calendar Card** and install it
7. Refresh your browser (clear the cache if necessary)

HACS will handle placing the card file in `/www/community/weekly-meal-calendar`
and adding the resource automatically.

### Manual installation

1. Download `weekly-meal-calendar-card.js` from this repository
2. Copy it to your Home Assistant `config/www/` directory
3. Add the resource in the UI via **Settings > Dashboards > Resources**
   with the URL `/local/weekly-meal-calendar-card.js`
4. Refresh your browser

## Usage

### Via UI (Recommended)

1. Open Lovelace in edit mode
2. Click "Add card"
3. Search for "Weekly Meal Calendar Card"
4. Click on it and configure via the visual editor:
   - Select your calendar entity from the dropdown
   - Set the number of days to display
5. Click "Save"

### Via YAML

```yaml
- type: custom:weekly-meal-calendar-card
  calendar: calendar.family_meals  # required
  days: 7  # optional, defaults to 7
```

### Configuration options:

- `calendar` (required): The calendar entity to display events from
- `days` (optional): Number of days to show. Defaults to 7. Set to any positive integer (e.g., 3 for 3 days, 14 for 2 weeks)

If you have more than one calendar you can specify which one in the `calendar`
option. The card will:
- Use the standard `calendar.create_event` service to add new events
- Use the **[clockwork](https://github.com/mutilator/Clockwork)** integration services 
  to update or delete existing events

> **Note:** To edit or delete events, you must have the **[clockwork](https://github.com/mutilator/Clockwork)** 
> calendar integration installed and active. Creating new events requires only the standard 
> Home Assistant calendar integration.

> **Browser Cache:** Home Assistant aggressively caches custom card files. If you see
> a syntax error or unexpected behavior after updating, clear your browser cache
> or force a refresh by appending `?v=0.1.7` to the resource URL in
> **Settings > Dashboards > Resources**.

## Features

* Seven-day view starting from today
* Weekday names localized to the user's language
* Single event per day; creating or editing invokes a JavaScript prompt
* Lightweight LitElement implementation, no extra dependencies

## Development

The only source file is `weekly-meal-calendar-card.js` at the repository root.
You can edit it directly – no build step is required. When testing locally
place it in `config/www` or use the `dev` folder in HACS.

## License

This project is licensed under the MIT License (see `LICENSE`).
