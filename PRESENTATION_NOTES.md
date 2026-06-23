# GoldenHour — Demo Day Playbook

Everything needed to convert the work you've already done into marks. Read the
**Reliability Drill** last-minute; rehearse the **Script** and **Judge Q&A**.

Rubric this maps to: Innovation 25 · Technical 25 · Problem-Solving 20 · UX 15 · Scalability/Impact 15.

---

## 1. The 90-second script (3 acts)

Open cold — no slides first. Show the product, then explain.

**Act 1 — the hook (15s).** "Every year people die in the *golden hour* after
trauma not because care doesn't exist, but because the right hospital isn't
found fast enough and replacement blood isn't arranged in time. GoldenHour does
both from a single GPS tap."

**Act 2 — the live demo (45s).**
1. Open the patient screen. Pick an emergency type + blood group, tap trigger.
2. Hospital cards stream in, ranked, with ETA + department match. *"This isn't
   seeded — it just pulled real hospitals around us from OpenStreetMap and
   Google Places live."*
3. Point at the donor bar: *"In parallel it matched compatible, off-cooldown
   blood donors nearby and alerted them — and notice the message tells them to
   go to the **licensed blood bank**, not the ER. That's the difference between a
   demo and something a hospital could actually run."*
4. (If a second device is handy) tap a hospital's confirm link → the card flips
   to **confirmed** live. *"First hospital to accept wins; the others are told
   it's already routed — we never show a false bed."*

**Act 3 — the close (30s).** "Two life-critical actions — routing and blood —
run concurrently inside one request, it works in any Indian city, and it
degrades gracefully to SMS for feature phones. Built on a stack that swaps from
demo to production with environment variables, no code changes."

---

## 2. The "any city" wow moment

If a judge is from outside Jaipur, **ask for their city** and trigger an
emergency there live. The hospital fetch is real (OSM + Google Places), so it
works anywhere. This single move scores Innovation + Technical + Scalability at
once because it proves the data isn't faked. (This is exactly the Bilaspur path
we hardened.)

---

## 3. Judge Q&A — the likely probes

**"Is the hospital data real or seeded?"**
> Real. Live Overpass/OpenStreetMap plus Google Places Nearby Search around the
> patient's coordinates. Jaipur is pre-seeded only so the very first tap is
> instant; everywhere else is fetched on demand and cached per region.

**"Does this actually scale?"**
> The data layer is an interface with two implementations behind one factory.
> Demo runs an in-memory store; flip three env vars and it's Supabase on
> PostgreSQL + PostGIS — donor radius queries become real `ST_DWithin` geo
> lookups, and hospital confirmations stream to the patient over Supabase
> Realtime instead of polling. The API code doesn't change. ETAs and external
> fetches run concurrently, so latency stays flat as candidates grow.

**"What happens if no hospital responds?"**
> After a timeout the status flags an `unconfirmed_fallback` and the UI surfaces
> one-tap call links to the nearest hospitals. We never display a confirmed bed
> that isn't real — a false "bed available" is worse than none.

**"How do you alert donors — isn't blood needed instantly?"**
> That's the key insight. You can't transfuse a walk-in donor into an active
> trauma — it's not screened. So this is *replacement* donation: donors restock
> the blood bank's licensed supply that the patient's surgery draws down. The
> alert says so explicitly, which is why a real blood bank could adopt it.

**"What about rare blood groups?"**
> ABO/Rh compatibility is computed per request; Rh-negative requests are flagged
> as rare and the UI warns supply may be limited while still broadcasting.

**"Security / abuse?"**
> Confirmation and donor-response links are 128-bit URL-safe tokens, single-use.
> Public write endpoints are rate-limited per client. No PII beyond a phone
> number, and keys never ship to the client.

**"Why not just Google Maps for everything?"**
> Cost and coverage. OSM is free and dense for Indian government hospitals
> (PHC/CHC/District); Google Places fills gaps where it's licensed. We race
> mirrors concurrently so one slow endpoint can't stall an emergency.

---

## 4. The scalability answer (memorize this one)

> "Today's demo runs stateless and in-memory so it works with zero setup. The
> production path is already built: `SupabaseStore` implements the exact same
> method surface against PostGIS. Geo queries, realtime confirmation push, and
> persistence are a configuration switch, not a rewrite. External calls — hospital
> fetch and ETAs — already run concurrently, so a busier city doesn't mean a
> slower response."

This is the line that turns your weakest rubric row (Scalability) into a strength.

---

## 5. Pre-demo reliability drill (run 10 min before)

The backend is on Render free tier. The only thing that can throw away earned
marks is a cold start or a mid-demo restart showing "Failed to fetch."

- [ ] **10 min before:** open the API `/health` in a browser — confirm `200` and
      `"status":"ok"`. This wakes it if it slept.
- [ ] **Trigger one warmup emergency** in your demo city so OSM/Places is cached
      and the first *real* tap in front of judges is instant.
- [ ] Confirm UptimeRobot shows the monitor **green** (the HEAD fix is deployed,
      so it should be).
- [ ] **Open a second browser tab** already on the results screen of a
      successful trigger — your parachute if the live one stalls.
- [ ] Phone on the same network as the laptop? Test the confirm-link flip once.
- [ ] Know where the **MOCK toggle** is (see §6) — it's your failsafe.

---

## 6. Two frontend notes (your teammate's call — don't let me edit it)

**Risk — the visible `MOCK / REAL API` toggle.** `PatientResultsView.tsx` shows
a `MOCK: ON / REAL API` button (and a `TIMEOUT` button) in the header. If a judge
sees a "MOCK" switch on screen, it can read as "the whole thing is faked" and
quietly cost you Innovation/Technical credibility. Recommend hiding both toggles
behind a dev-only flag (e.g. only render when a `?dev` query param is present)
for the judged build. Default is already `REAL API`, which is correct.

**Asset — that same MOCK mode is your parachute.** If the live API dies
mid-demo, flipping MOCK ON gives a fully scripted, deterministic run (hospitals
confirm at 4s, donors respond, timeout-fallback demoable). Keep it reachable,
just not advertised. Best of both: hide the button, keep a known keyboard/URL way
to enable it.

---

## 7. What's deliberately NOT built (say this proactively)

Judges respect scope discipline. "We deliberately scoped out: real SMS gateway
billing/DLT, hospital staff auth, and ambulance dispatch — those are integration
work, not the hard problem. The hard problem was ranking + concurrent donor
matching that works in any city, and that's what's real here."
