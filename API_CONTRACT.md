GoldenHour — API Contract (SHARED)

This is the single most important document for the team. Both the backend (You) and the frontend (Teammate) build against these exact shapes. Agree on this Day 1. Do not change it without telling the other person immediately.

## Ground rules

- All requests and responses are **JSON**.
- Base URL in development: `http://localhost:8000`
- Base URL in production: (filled in after deployment)
- The frontend **never** talks to the database directly. It only ever calls these endpoints.
- Blood groups are always strings: `"O+"`, `"O-"`, `"A+"`, `"A-"`, `"B+"`, `"B-"`, `"AB+"`, `"AB-"`.
- `status` for a hospital is always one of: `"pending"`, `"confirmed"`, `"declined"`.
- Coordinates: `lat` and `lng` are decimal numbers (e.g. `26.9124`, `75.7873` for Jaipur). `lat` must be −90..90 and `lng` −180..180 — out-of-range coordinates (e.g. a failed browser geolocation) are rejected with **422**.

## Endpoint 1 — Trigger an emergency
`POST /emergency`

**Frontend sends:**
```json
{
  "lat": 26.9124,
  "lng": 75.7873,
  "emergency_type": "trauma",
  "blood_group": "O+"
}
```
`emergency_type` is one of: `"trauma"`, `"cardiac"`, `"obstetric"`, `"general"`.

**Backend returns:**
```json
{
  "request_id": "abc123",
  "hospitals": [
    {
      "hospital_id": "h1",
      "name": "SMS Hospital",
      "eta_minutes": 6,
      "department_match": true,
      "distance_km": 2.3,
      "status": "pending",
      "phone": "+91xxxxxxxxxx"
    }
  ],
  "donors_alerted": 5,
  "rare_group": false
}
```
- `hospitals` is an array, already sorted best-first by the backend.
- `donors_alerted` is just a count (integer) for the UI to display.
- `rare_group` (boolean) is `true` when the needed group is Rh-negative (scarce
  supply); the UI can warn that compatible donors may be few. Safe to ignore.

## Endpoint 2 — Poll / subscribe to emergency status
`GET /emergency/{request_id}/status`

**Backend returns:**
```json
{
  "request_id": "abc123",
  "hospitals": [
    { "hospital_id": "h1", "name": "SMS Hospital", "eta_minutes": 6, "status": "confirmed" },
    { "hospital_id": "h2", "name": "Fortis Jaipur", "eta_minutes": 9, "status": "pending" }
  ],
  "donors_alerted": 5,
  "donors_responded": 2,
  "unconfirmed_fallback": false
}
```
- `unconfirmed_fallback` (boolean) becomes `true` once ~3 minutes pass with no
  hospital confirmed. Cue for the UI to surface the nearest hospitals with a
  1-tap call button (the phones from the `POST /emergency` response). Safe to ignore.

## Endpoint 3a — Hospital confirmation page details
`GET /confirm/{token}`

Hit when the hospital contact **opens** their link, so the page can show the real
emergency details (instead of placeholders).

**Backend returns:**
```json
{
  "hospital_name": "SMS Hospital",
  "emergency_type": "trauma",
  "blood_group": "O+",
  "eta_minutes": 6,
  "already_confirmed": false,
  "responded": false,
  "accepted": false
}
```
- `already_confirmed` is `true` if another hospital already took this patient.
- `responded` is `true` if this hospital has already replied; `accepted` is its choice.
- Unknown token → **404**.

## Endpoint 3 — Hospital taps Accept / Decline
`POST /confirm/{token}`

This is hit by the hospital confirmation page when the contact taps a button.

**Frontend sends:**
```json
{ "accepted": true }
```
`true` = Accept Patient, `false` = Not Available.

**Backend returns:**
```json
{ "ok": true, "hospital_name": "SMS Hospital", "already_confirmed": false }
```
`already_confirmed` is true if another hospital already took this patient.

## Endpoint 4 — Register a donor
`POST /donor/register`

**Frontend sends:**
```json
{
  "name": "Asha Verma",
  "phone": "+91xxxxxxxxxx",
  "blood_group": "B+",
  "lat": 26.9200,
  "lng": 75.8000,
  "last_donated": "2025-01-15",
  "sex": "female"
}
```
`last_donated` is a date string "YYYY-MM-DD", or null if never donated.
`sex` is **optional** — `"male"` or `"female"`. It only sets the donation
cooldown (120 days for women, 90 otherwise). Omit it and the backend defaults to
90 days; existing forms need no change.

**Backend returns:**
```json
{ "ok": true, "donor_id": "d42" }
```

## Endpoint 5 — Feature-phone SMS parse (stretch / demo)
`POST /sms/inbound`

**Sends:**
```json
{ "from": "+91xxxxxxxxxx", "body": "BLOOD O+ Malviya Nagar Jaipur" }
```

**Returns:**
```json
{ "reply": "Nearest hospitals: 1) SMS Hospital 2) Fortis 3) Manipal. Donors alerted." }
```
