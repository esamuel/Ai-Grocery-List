# Price collector (שקיפות מחירים)

Pulls the supermarket chains' official price files (published under Israel's Price Transparency
regulations), keeps only the branches in the cities you configure, and loads them into the app's
Supabase project. The app's **השוואת מחירים בסופרים** page reads from those tables.

Must run from **inside Israel** — several chain portals block foreign IPs. Your Mac is fine.

## One-time setup

```bash
cd collector
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # then fill in SUPABASE_SERVICE_ROLE_KEY (Supabase → Settings → API)
```

Apply the schema once: Supabase → SQL editor → paste `supabase/migrations/20261103_market_prices.sql` → Run.

## Run

```bash
python3 collect.py --dry-run     # first time: downloads, parses, prints what it found, uploads nothing
python3 collect.py               # the real thing (~5–15 min, depends on how many chains)
```

Options: `--no-download` reprocesses files already in `dumps/`; `--keep-dumps` keeps the raw files.

## Daily schedule (Mac)

Edit the two `CHANGE_ME` paths in `com.aigrocerylists.collector.plist`, then:

```bash
cp com.aigrocerylists.collector.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.aigrocerylists.collector.plist
tail -f /tmp/aigrocerylists-collector.log
```

The Mac has to be awake at 06:30 (System Settings → Battery → schedule wake, or just run it by hand).

## Sizing

Each store carries ~5–15k products. Ten Tel-Aviv-area cities across all chains is roughly
300–500 stores → 3–6M price rows → ~500 MB–1 GB in Postgres. **Start with fewer cities / chains**
(`CITIES`, `CHAINS` in `.env`) if the project is on the free Supabase tier (500 MB), then grow.

## Files

| file | what |
|---|---|
| `collect.py` | pipeline: download → parse → filter by city → upsert |
| `parse_files.py` | tolerant parsers for `Stores*` and `PriceFull*` XML (gz/zip/xml, any encoding) |
| `test_parse_files.py` | parser tests on sample files (`python3 -m pytest` or `python3 test_parse_files.py`) |
| `.env.example` | config template |
| `com.aigrocerylists.collector.plist` | launchd schedule for macOS |

## Tables (prefix `mp_`)

`mp_chains` → `mp_stores` (city) → `mp_prices` (barcode, price) ← `mp_products` (barcode, name).
RPCs used by the app: `mp_cities()`, `mp_search_products(q, city)`, `mp_compare_basket(city, items)`.
