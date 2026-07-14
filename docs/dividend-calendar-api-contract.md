# Dividend Calendar API Contract

Upcoming dividend payouts for the authenticated user's holdings, with an estimated
payout per event based on the shares they hold.

> Status: implemented on branch `feature/dividend-calendar`. Display-only (no
> notifications). Data is market-wide and shared across all users via a server-side
> cache; the response is scoped to the caller's holdings.

---

## Endpoint

```
GET /api/v1/dividends/calendar
```

### Authentication

Protected route. Send a Google ID token as a bearer token (same as all other
`/api/v1` protected endpoints):

```
Authorization: Bearer <google_id_token>
```

Missing/invalid token → `401 Unauthorized`.

### Query parameters

| Param  | Type   | Required | Format       | Description |
|--------|--------|----------|--------------|-------------|
| `from` | string | no       | `YYYY-MM-DD` | Start of the window to display. |
| `to`   | string | no       | `YYYY-MM-DD` | End of the window to display. |

Window behavior:

- The server fetches and serves a **fixed forward window of roughly `today` →
  `today + 75 days`**.
- `from`/`to` **narrow** the view *within* that window. They do **not** extend it:
  values are clamped — `from` is floored at today (already-paid dividends are never
  returned), `to` is capped at the end of the fetched window.
- Omitting both returns the full default window (`today` → `~today + 75d`).
- A request for a range entirely outside the window returns an **empty list with
  `200`**, not an error.
- `from`/`to` filter on each event's **payment date** (falling back to ex-date when
  payment date is absent).

Validation errors (`400`):
- `from` or `to` not in `YYYY-MM-DD` format.
- `to` is before `from`.

---

## Response

Standard list envelope (`results` + `meta`). Each item is a dividend event for one of
the user's held symbols.

`200 OK`

```json
{
  "results": [
    {
      "symbol": "KO",
      "exDate": "2026-06-30T00:00:00Z",
      "recordDate": "2026-07-01T00:00:00Z",
      "paymentDate": "2026-07-15T00:00:00Z",
      "declarationDate": "2026-05-21T00:00:00Z",
      "dividend": 0.51,
      "adjDividend": 0.51,
      "yield": 2.9,
      "frequency": "Quarterly",
      "shares": 40,
      "estimatedAmount": 20.4
    },
    {
      "symbol": "AAPL",
      "exDate": "2026-08-10T00:00:00Z",
      "recordDate": "2026-08-11T00:00:00Z",
      "paymentDate": "2026-08-14T00:00:00Z",
      "declarationDate": "0001-01-01T00:00:00Z",
      "dividend": 0.27,
      "adjDividend": 0.27,
      "yield": 0.36,
      "frequency": "Quarterly",
      "shares": 15,
      "estimatedAmount": 4.05
    }
  ],
  "code": 200,
  "message": "Success",
  "errorMessage": null,
  "meta": {
    "total": 2,
    "page": null,
    "size": null,
    "currentPageCount": 2
  }
}
```

### Result item fields

| Field             | Type    | Description |
|-------------------|---------|-------------|
| `symbol`          | string  | Ticker symbol. |
| `exDate`          | string  | Ex-dividend date (RFC3339). Hold the stock before this date to be eligible. |
| `recordDate`      | string  | Record date (RFC3339). |
| `paymentDate`     | string  | Payment date (RFC3339) — when the cash is paid. Primary date for sorting/display. |
| `declarationDate` | string  | Declaration date (RFC3339). May be absent (see "Dates" below). |
| `dividend`        | number  | Dividend amount per share. |
| `adjDividend`     | number  | Split-adjusted dividend per share. |
| `yield`           | number  | Provider-supplied dividend yield at the event (percent, e.g. `2.9` = 2.9%). |
| `frequency`       | string  | e.g. `Quarterly`, `Semi-Annual`, `Annual`, `Irregular`. |
| `shares`          | number  | Total shares of `symbol` the user holds (summed across all their portfolios). |
| `estimatedAmount` | number  | Estimated payout for this event = `shares × dividend`. |

Ordering: ascending by `paymentDate` (then by `symbol` for ties).

### Meta fields

| Field              | Type        | Description |
|--------------------|-------------|-------------|
| `total`            | number      | Number of events returned. |
| `currentPageCount` | number      | Same as `total` (no pagination on this endpoint). |
| `page`             | null        | Not paginated. |
| `size`             | null        | Not paginated. |

---

## Dates (important for the frontend)

- All dates are serialized as **RFC3339** strings in **UTC** with a zero time
  component, e.g. `"2026-07-15T00:00:00Z"`. Treat them as **calendar dates** (ignore
  the time/zone) — take the `YYYY-MM-DD` prefix for display.
- A date the provider did not supply (commonly `declarationDate`, occasionally others)
  is serialized as the **zero value `"0001-01-01T00:00:00Z"`**. Treat any year `0001`
  date as **absent/unknown** and render accordingly (e.g. "—"), not as a real date.

---

## Empty results

A user with no holdings, or no upcoming dividends in the window, gets:

```json
{
  "results": [],
  "code": 200,
  "message": "Success",
  "errorMessage": null,
  "meta": { "total": 0, "page": null, "size": null, "currentPageCount": 0 }
}
```

---

## Errors

All errors use the standard envelope with `result: null`.

| Status | When | Example `errorMessage` |
|--------|------|------------------------|
| `400 Bad Request` | `from`/`to` malformed | `"from must be a date in YYYY-MM-DD format"` |
| `400 Bad Request` | `to` before `from`    | `"to must not be before from"` |
| `401 Unauthorized`| Missing/invalid token | (auth middleware error shape) |
| `500 Internal Server Error` | Upstream dividend data unavailable and not cached | `"failed to build dividend calendar"` |

Error body shape:

```json
{
  "result": null,
  "code": 400,
  "message": "Error",
  "errorMessage": "to must not be before from"
}
```

---

## Examples

Default window (all upcoming dividends for the user's holdings):

```
GET /api/v1/dividends/calendar
Authorization: Bearer <token>
```

Narrowed to a sub-range:

```
GET /api/v1/dividends/calendar?from=2026-07-01&to=2026-07-31
Authorization: Bearer <token>
```

---

## Notes & current limitations

- **Shared data:** dividend schedules are market-wide; the backend fetches them once
  and shares them across users. Only `shares`/`estimatedAmount` are user-specific.
- **`estimatedAmount` is an estimate:** it uses the user's *current* total shares and
  does not account for ex-date eligibility (a position opened after `exDate` would not
  actually receive that dividend) or currency differences. Display it as an estimate.
- **Freshness:** the calendar is cached server-side and refreshed about daily; values
  can lag newly announced dividends by up to ~a day.
- **No pagination:** the result set is small (one user's holdings); all events are
  returned in one response.
