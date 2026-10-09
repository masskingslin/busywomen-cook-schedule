#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Check and update the grocery prices (priceINR in js/data.js).

  python3 tools/prices.py export    -> writes prices.csv  (open in Excel / Sheets)
  python3 tools/prices.py import    -> reads  prices.csv  and updates js/data.js

In prices.csv, fill the last column ("your_price") for the items you have
checked on Amazon. Leave it empty to keep my estimate. Only filled rows change.
Python standard library only. A backup is saved as js/data.js.bak first.
"""
import csv
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "js", "data.js")
CSV_PATH = os.path.join(ROOT, "prices.csv")

LINE_RE = re.compile(r'^(\s*)"(?P<name>[^"]+)":\s*\{(?P<body>.*)\},?\s*$')
PRICE_RE = re.compile(r"priceINR:\s*([0-9]+(?:\.[0-9]+)?)")
LABEL_RE = re.compile(r'label:\s*"([^"]*)"')
AISLE_RE = re.compile(r'aisle:\s*"([^"]*)"')


def catalog_lines(lines):
    """Yield (index, name, body) for each PACK_CATALOG entry."""
    inside = False
    for i, line in enumerate(lines):
        if line.startswith("const PACK_CATALOG"):
            inside = True
            continue
        if inside and line.startswith("};"):
            return
        if inside:
            m = LINE_RE.match(line)
            if m and "priceINR" in m.group("body"):
                yield i, m.group("name"), m.group("body")


def do_export():
    with open(DATA, encoding="utf-8") as f:
        lines = f.read().split("\n")
    rows = []
    for _, name, body in catalog_lines(lines):
        price = PRICE_RE.search(body).group(1)
        label = (LABEL_RE.search(body) or [None, "1 ready-made pack"])[1]
        aisle = (AISLE_RE.search(body) or [None, ""])[1]
        rows.append([name, aisle, label, price, ""])
    with open(CSV_PATH, "w", newline="", encoding="utf-8-sig") as f:  # utf-8-sig: Excel opens it cleanly
        w = csv.writer(f)
        w.writerow(["item", "aisle", "pack_size", "my_estimate_rupees", "your_price"])
        w.writerows(rows)
    print("Wrote %d items to %s" % (len(rows), CSV_PATH))
    print("Fill the 'your_price' column from Amazon, save, then run:  python3 tools/prices.py import")


def do_import():
    if not os.path.isfile(CSV_PATH):
        sys.exit("No prices.csv found. Run  python3 tools/prices.py export  first.")
    new_prices, bad = {}, []
    with open(CSV_PATH, newline="", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            raw = (row.get("your_price") or "").strip().replace("₹", "").replace(",", "")
            if not raw:
                continue
            try:
                value = float(raw)
                if value <= 0:
                    raise ValueError
            except ValueError:
                bad.append((row.get("item"), raw))
                continue
            new_prices[row["item"]] = int(value) if value == int(value) else round(value, 2)
    if bad:
        print("Skipped (not a positive number):", ", ".join("%s=%r" % b for b in bad))

    with open(DATA, encoding="utf-8") as f:
        lines = f.read().split("\n")
    changed = []
    for i, name, body in catalog_lines(lines):
        if name in new_prices:
            old = float(PRICE_RE.search(body).group(1))
            if old != float(new_prices[name]):
                lines[i] = PRICE_RE.sub("priceINR: %s" % new_prices[name], lines[i], count=1)
                changed.append((name, old, new_prices[name]))
    unknown = sorted(set(new_prices) - {n for _, n, _ in catalog_lines(lines)})
    if unknown:
        print("Not in the catalog (check the spelling):", ", ".join(unknown))
    if not changed:
        print("No prices changed.")
        return
    shutil.copyfile(DATA, DATA + ".bak")
    with open(DATA, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print("Updated %d prices in js/data.js (backup: js/data.js.bak):" % len(changed))
    for name, old, new in changed:
        print("  %-28s %6s -> %s" % (name, ("%g" % old), new))


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "export":
        do_export()
    elif cmd == "import":
        do_import()
    else:
        print(__doc__)
