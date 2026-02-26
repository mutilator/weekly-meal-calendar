/*
 * weekly-meal-calendar-card.js
 *
 * Lovelace custom card showing seven days of events from a calendar entity.
 * Clicking the Add button uses calendar.create_event to add new all-day events.
 * Clicking the Edit button uses clockwork.update_event to modify existing events.
 *
 * Configuration example (YAML or UI):
 *
 *   type: 'custom:weekly-meal-calendar-card'
 *   calendar: calendar.family_meals
 *
 */

// version 0.1.8
class WeeklyMealCalendarCard extends HTMLElement {
  constructor() {
    super();
    this._hass = null;
    this._config = null;
    this._events = {};
    this._fetching = false;
    this._lastFetchKey = null;
    this._lastFetchTime = 0;
    this.attachShadow({ mode: 'open' });
  }

  setConfig(config) {
    if (!config || !config.calendar) {
      throw new Error('You must define a calendar entity');
    }
    this._config = config;
    // Default to 7 days if not specified
    this._days = config.days || 7;
    // Force a re-fetch when config changes
    this._lastFetchKey = null;
  }

  static getStubConfig() {
    return {
      calendar: '',
      days: 7,
    };
  }

  static getConfigForm() {
    return {
      schema: [
        {
          name: 'calendar',
          required: true,
          selector: {
            entity: {
              domain: 'calendar',
              multiple: false
            }
          }
        },
        {
          name: 'days',
          selector: {
            number: {
              min: 1,
              max: 365,
              step: 1,
              unit_of_measurement: 'days'
            }
          }
        }
      ],
      computeLabel: (schema) => {
        if (schema.name === 'calendar') return 'Calendar Entity';
        if (schema.name === 'days') return 'Number of Days';
        return undefined;
      }
    };
  }

  set hass(hass) {
    this._hass = hass;
    // Only fetch if configuration has changed or enough time has passed
    const fetchKey = `${this._config?.calendar}:${this._days}`;
    const now = Date.now();
    const timeSinceLastFetch = now - this._lastFetchTime;
    
    // Fetch if this is a new config, or if at least 30 seconds have passed since last fetch
    if (fetchKey !== this._lastFetchKey || timeSinceLastFetch > 30000) {
      this._lastFetchKey = fetchKey;
      this._lastFetchTime = now;
      this._fetchEvents();
    }
  }

  async _fetchEvents() {
    if (!this._hass || !this._config || this._fetching) {
      return;
    }
    this._fetching = true;
    const entity = this._config.calendar;
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + (this._days - 1));

    const params = new URLSearchParams({
      start: start.toISOString(),
      end: end.toISOString(),
    });

    try {
      const events = await this._hass.callApi(
        'GET',
        `calendars/${entity}?${params.toString()}`
      );
      this._events = {};
      for (const ev of events) {
        let dayStr;
        if (typeof ev.start === 'string') {
          // ISO string format: "2026-02-26" or "2026-02-26T10:00:00"
          dayStr = ev.start.split('T')[0];
        } else if (ev.start instanceof Date) {
          // Date object - convert to YYYY-MM-DD
          dayStr = ev.start.toISOString().split('T')[0];
        } else if (typeof ev.start === 'object' && ev.start.dateTime) {
          // Possible format: { dateTime: "2026-02-26T10:00:00", ... }
          dayStr = ev.start.dateTime.split('T')[0];
        } else if (typeof ev.start === 'object' && ev.start.date) {
          // Possible format: { date: "2026-02-26", ... }
          dayStr = ev.start.date;
        } else {
          console.warn('Unknown start format:', ev.start);
          continue;
        }
        this._events[dayStr] = ev;
      }
      this._render();
    } catch (err) {
      console.error('Error fetching calendar events', err);
    } finally {
      this._fetching = false;
    }
  }

  _dayName(offset) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toLocaleDateString(this._hass.language, { weekday: 'long' });
  }

  _render() {
    if (!this._config) {
      return;
    }

    const root = this.shadowRoot;
    root.innerHTML = '';

    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: block;
      }
      .row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        border-bottom: 1px solid var(--divider-color);
      }
      .row:last-child {
        border-bottom: none;
      }
      .row:nth-child(odd) {
        background: var(--secondary-background-color);
      }
      .day-name {
        font-weight: 500;
        min-width: 100px;
      }
      .meal {
        flex: 1;
        margin: 0 12px;
      }
      button {
        padding: 6px 12px;
        border: none;
        border-radius: 4px;
        background: var(--primary-color);
        color: var(--primary-text-color);
        cursor: pointer;
        font-size: 0.875rem;
      }
      button:hover {
        opacity: 0.9;
      }
    `;
    root.appendChild(style);

    for (let i = 0; i < this._days; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dayStr = d.toISOString().split('T')[0];
      const ev = this._events[dayStr];

      const row = document.createElement('div');
      row.className = 'row';

      const dayName = document.createElement('div');
      dayName.className = 'day-name';
      dayName.textContent = this._dayName(i);
      row.appendChild(dayName);

      const meal = document.createElement('div');
      meal.className = 'meal';
      meal.textContent = ev ? ev.summary || '' : '';
      row.appendChild(meal);

      const btn = document.createElement('button');
      btn.textContent = ev ? 'Edit' : 'Add';
      btn.addEventListener('click', () => this._editDay(dayStr, ev));
      row.appendChild(btn);

      root.appendChild(row);
    }
  }

  async _editDay(dayStr, existingEvent) {
    const desc = existingEvent ? existingEvent.summary : '';
    const newSummary = window.prompt(`Meal for ${dayStr}`, desc);
    if (newSummary === null) {
      return;
    }

    const entity = this._config.calendar;
    if (existingEvent) {
      const eventId = existingEvent.uid || existingEvent.eid || existingEvent.id;
      try {
        // Use clockwork.update_event service
        await this._hass.callService('clockwork', 'update_event', {
          calendar_id: entity,
          event_id: eventId,
          event: {
            summary: newSummary,
          },
        });
      } catch (err) {
        console.error('Error updating event:', err);
        throw err;
      }
    } else {
      const nextDay = new Date(dayStr);
      nextDay.setDate(nextDay.getDate() + 1);
      const endDateStr = nextDay.toISOString().split('T')[0];
      
      await this._hass.callService('calendar', 'create_event', {
        entity_id: entity,
        summary: newSummary,
        start_date: dayStr,
        end_date: endDateStr,
      });
    }
    this._fetchEvents();
  }
}

customElements.define('weekly-meal-calendar-card', WeeklyMealCalendarCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'weekly-meal-calendar-card',
  name: 'Weekly Meal Calendar',
  preview: false,
  description: 'A calendar card showing events for the next N days with add/edit buttons'
});
