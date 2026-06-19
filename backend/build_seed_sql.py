"""Generate sql/seed.sql from seed_data.py.

Run from the backend/ directory:  python build_seed_sql.py

Produces an idempotent SQL seed (INSERT ... ON CONFLICT DO NOTHING) that can be
pasted into the Supabase SQL editor right after sql/schema.sql. Running it in the
SQL editor executes as the table owner, so it bypasses RLS — more reliable than
seeding over the anon key with seed_supabase.py.
"""
from __future__ import annotations

import seed_data


def _esc(text: str) -> str:
    return text.replace("'", "''")


def _array_literal(items) -> str:
    inner = ", ".join("'%s'" % _esc(i) for i in items)
    return f"ARRAY[{inner}]::text[]"


def build() -> str:
    out = [
        "-- GoldenHour seed data (AUTO-GENERATED from seed_data.py — do not edit by hand).",
        "-- Run AFTER sql/schema.sql. Idempotent: re-running is safe.",
        "",
        "-- Hospitals -----------------------------------------------------------------",
        "insert into hospitals (id, name, lat, lng, departments, beds_available, "
        "avg_response_rate, phone, contact_phone) values",
    ]
    rows = []
    for h in seed_data.hospitals():
        rows.append(
            "  ('{id}', '{name}', {lat}, {lng}, {depts}, {beds}, {rel}, '{phone}', '{contact}')".format(
                id=h["id"],
                name=_esc(h["name"]),
                lat=h["lat"],
                lng=h["lng"],
                depts=_array_literal(h["departments"]),
                beds=h["beds_available"],
                rel=h["avg_response_rate"],
                phone=h["phone"],
                contact=h["contact_phone"],
            )
        )
    out.append(",\n".join(rows))
    out.append("on conflict (id) do nothing;")
    out.append("")

    out += [
        "-- Donors --------------------------------------------------------------------",
        "insert into blood_donors (id, name, phone, blood_group, lat, lng, "
        "last_donated, sex, available) values",
    ]
    rows = []
    for d in seed_data.donors():
        last = "'%s'" % d["last_donated"] if d["last_donated"] else "null"
        sex = "'%s'" % d["sex"] if d.get("sex") else "null"
        rows.append(
            "  ('{id}', '{name}', '{phone}', '{bg}', {lat}, {lng}, {last}, {sex}, {av})".format(
                id=d["id"],
                name=_esc(d["name"]),
                phone=d["phone"],
                bg=d["blood_group"],
                lat=d["lat"],
                lng=d["lng"],
                last=last,
                sex=sex,
                av=str(d["available"]).lower(),
            )
        )
    out.append(",\n".join(rows))
    out.append("on conflict (id) do nothing;")
    out.append("")
    return "\n".join(out)


if __name__ == "__main__":
    sql = build()
    with open("sql/seed.sql", "w", encoding="utf-8", newline="\n") as f:
        f.write(sql)
    print("Wrote sql/seed.sql")
