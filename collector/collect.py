#!/usr/bin/env python3
"""
Price collector: downloads the chains' Price Transparency files, keeps only the stores
in the cities you care about, and upserts chains / stores / products / prices into Supabase.

Run from a machine in Israel (some chain portals block foreign IPs):
    python3 collect.py                 # download + upload
    python3 collect.py --no-download   # re-process whatever is already in the dump folder
    python3 collect.py --dry-run       # parse only, print counts, upload nothing

Config: collector/.env  (see .env.example)
"""
from __future__ import annotations

import argparse
import logging
import os
import shutil
import sys
import time
from pathlib import Path

import requests
from dotenv import load_dotenv

from parse_files import PriceLine, Store, file_meta, iter_files, parse_prices, parse_stores

HERE = Path(__file__).resolve().parent
load_dotenv(HERE / ".env")

log = logging.getLogger("collector")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
DUMP_DIR = Path(os.environ.get("DUMP_DIR", HERE / "dumps"))
CITIES = [c.strip() for c in os.environ.get("CITIES", "תל אביב").split(",") if c.strip()]
CHAINS = [c.strip() for c in os.environ.get("CHAINS", "").split(",") if c.strip()]  # scraper names; empty = all
BATCH = 1000


def norm_city(c: str | None) -> str:
    """Mirror of SQL mp_norm_city(): lower, collapse separators, fold Tel Aviv / Jerusalem variants."""
    import re
    x = re.sub(r"[\s\-–_/,.()\"']+", " ", (c or "").lower()).strip()
    if re.fullmatch(r"תל אביב יפו( .*)?|ת א|תא", x):
        return "תל אביב"
    if x.startswith("ירושלים "):
        return "ירושלים"
    return x


def city_match(stored: str, q: str) -> bool:
    """Mirror of SQL mp_city_match(): equal, or one is a word-prefix of the other."""
    return bool(stored and q) and (stored == q or stored.startswith(q + " ") or q.startswith(stored + " "))


# ----------------------------------------------------------------- download

def download(dump: Path) -> None:
    """Fetch Stores + PriceFull files for all (or the configured) chains via il-supermarket-scraper."""
    try:
        from il_supermarket_scarper import FileTypesFilters, ScarpingTask, ScraperFactory
    except ImportError:
        log.error("il-supermarket-scraper not installed: pip3 install il-supermarket-scraper")
        sys.exit(1)

    enabled = [getattr(ScraperFactory, n).name for n in CHAINS] if CHAINS else None
    files = [FileTypesFilters.STORE_FILE.name, FileTypesFilters.PRICE_FULL_FILE.name]
    log.info("downloading %s for %s -> %s", files, enabled or "ALL chains", dump)
    ScarpingTask(
        enabled_scrapers=enabled,
        files_types=files,
        dump_folder_name=str(dump),
        multiprocessing=4,
        suppress_exception=True,   # one broken chain must not kill the run
    ).start()


# ----------------------------------------------------------------- supabase

class Supa:
    def __init__(self, url: str, key: str):
        if not url or not key:
            raise SystemExit("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in collector/.env")
        self.base = f"{url}/rest/v1"
        self.s = requests.Session()
        self.s.headers.update({
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal",
        })

    def upsert(self, table: str, rows: list[dict]) -> None:
        for i in range(0, len(rows), BATCH):
            chunk = rows[i:i + BATCH]
            for attempt in range(3):
                r = self.s.post(f"{self.base}/{table}", json=chunk, timeout=120)
                if r.ok:
                    break
                log.warning("%s upsert failed (%s): %s", table, r.status_code, r.text[:300])
                time.sleep(2 * (attempt + 1))
            else:
                raise RuntimeError(f"giving up on {table}")

    def delete_stale_prices(self, chain_id: str, store_id: str, keep_barcodes: set[str]) -> None:
        """Products that vanished from a store's full price list are removed (best-effort)."""
        r = self.s.get(f"{self.base}/mp_prices", params={"chain_id": f"eq.{chain_id}", "store_id": f"eq.{store_id}", "select": "barcode"}, timeout=60)
        if not r.ok:
            return
        stale = [row["barcode"] for row in r.json() if row["barcode"] not in keep_barcodes]
        for i in range(0, len(stale), 200):
            codes = ",".join(f'"{b}"' for b in stale[i:i + 200])
            self.s.delete(f"{self.base}/mp_prices", params={"chain_id": f"eq.{chain_id}", "store_id": f"eq.{store_id}", "barcode": f"in.({codes})"}, timeout=60)


# ----------------------------------------------------------------- pipeline

def load_stores(dump: Path) -> list[Store]:
    stores: dict[tuple[str, str], Store] = {}
    for p in iter_files(dump, ["stores", "storesfull"]):
        try:
            for s in parse_stores(p):
                stores[(s.chain_id, s.store_id)] = s
        except Exception as e:  # noqa: BLE001
            log.warning("stores file %s: %s", p.name, e)
    return list(stores.values())


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-download", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--keep-dumps", action="store_true", help="don't delete downloaded files afterwards")
    args = ap.parse_args()

    DUMP_DIR.mkdir(parents=True, exist_ok=True)
    if not args.no_download:
        download(DUMP_DIR)

    # 1. stores
    stores = load_stores(DUMP_DIR)
    wanted_cities = {norm_city(c) for c in CITIES}
    target = {(s.chain_id, s.store_id): s for s in stores
              if any(city_match(norm_city(s.city), w) for w in wanted_cities)}
    log.info("stores: %d total, %d in %s", len(stores), len(target), CITIES)
    if not target:
        log.error("no stores matched your CITIES — check spelling against the Stores files (run with --dry-run and look at dumps/)")

    # 2. prices for target stores only
    products: dict[str, dict] = {}
    prices: list[dict] = []
    per_store: dict[tuple[str, str], set[str]] = {}
    seen_files = 0
    for p in iter_files(DUMP_DIR, ["pricefull"]):
        meta = file_meta(p)
        sid = (meta["store"] or "").lstrip("0") or None
        if sid and (meta["chain"], sid) not in target:
            continue  # cheap skip by file name
        try:
            lines = parse_prices(p)
        except Exception as e:  # noqa: BLE001
            log.warning("price file %s: %s", p.name, e)
            continue
        if not lines or (lines[0].chain_id, lines[0].store_id) not in target:
            continue
        seen_files += 1
        for ln in lines:
            products.setdefault(ln.barcode, {
                "barcode": ln.barcode, "name": ln.name, "manufacturer": ln.manufacturer,
                "quantity": ln.quantity, "unit": ln.unit,
            })
            prices.append({
                "chain_id": ln.chain_id, "store_id": ln.store_id, "barcode": ln.barcode,
                "price": ln.price, "unit_price": ln.unit_price,
                **({"updated_at": ln.updated_at} if ln.updated_at else {}),
            })
            per_store.setdefault((ln.chain_id, ln.store_id), set()).add(ln.barcode)

    log.info("price files: %d, products: %d, price rows: %d", seen_files, len(products), len(prices))
    if args.dry_run:
        for (cid, sid), codes in list(per_store.items())[:10]:
            st = target[(cid, sid)]
            log.info("  %s / %s (%s): %d items", st.chain_name, st.name, st.city, len(codes))
        return

    # 3. upload
    db = Supa(SUPABASE_URL, SERVICE_KEY)
    chains = {s.chain_id: {"chain_id": s.chain_id, "name": s.chain_name} for s in stores}
    db.upsert("mp_chains", list(chains.values()))
    db.upsert("mp_stores", [{
        "chain_id": s.chain_id, "store_id": s.store_id, "name": s.name, "city": s.city, "address": s.address,
        "subchain_id": s.subchain_id, "subchain_name": s.subchain_name,
    } for s in stores])
    db.upsert("mp_products", list(products.values()))
    # prices: dedupe on PK (a store can appear in two files; keep the last)
    uniq = {(r["chain_id"], r["store_id"], r["barcode"]): r for r in prices}
    db.upsert("mp_prices", list(uniq.values()))
    for (cid, sid), codes in per_store.items():
        db.delete_stale_prices(cid, sid, codes)
    log.info("uploaded: %d chains, %d stores, %d products, %d prices", len(chains), len(stores), len(products), len(uniq))

    if not args.keep_dumps:
        shutil.rmtree(DUMP_DIR, ignore_errors=True)


if __name__ == "__main__":
    main()
