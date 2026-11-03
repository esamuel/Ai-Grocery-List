"""
Parsers for the Israeli Price Transparency XML files (Stores*.xml, PriceFull*.xml).

The chains don't all use the same tag names or casing, so lookups are case-insensitive
and tolerant: an "item" may be <Item> or <Product>, a store <Store> or <Branch>, etc.
Files may arrive as .xml, .gz or .zip, in UTF-8, UTF-16 or windows-1255.
"""
from __future__ import annotations

import gzip
import io
import re
import zipfile
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable, Iterator, Optional
import xml.etree.ElementTree as ET

# File name pattern: PriceFull7290027600007-001-202611030300.gz  /  Stores7290027600007-202611030300.xml
FILE_RE = re.compile(r"(?P<kind>pricefull|price|promofull|promo|stores|storesfull)(?P<chain>\d{10,15})(?:-(?P<store>\d{1,5}))?(?:-(?P<ts>\d{12}))?",
                     re.IGNORECASE)


@dataclass
class Store:
    chain_id: str
    chain_name: str
    store_id: str
    name: str
    city: Optional[str]
    address: Optional[str]
    subchain_id: Optional[str] = None
    subchain_name: Optional[str] = None


@dataclass
class PriceLine:
    chain_id: str
    store_id: str
    barcode: str
    name: str
    price: float
    unit_price: Optional[float]
    manufacturer: Optional[str]
    quantity: Optional[float]
    unit: Optional[str]
    updated_at: Optional[str]  # ISO 8601


# ----------------------------------------------------------------- file access

def file_meta(path: Path) -> dict:
    """kind / chain / store / ts parsed from the file name (all may be None)."""
    m = FILE_RE.search(path.name)
    if not m:
        return {"kind": None, "chain": None, "store": None, "ts": None}
    d = m.groupdict()
    d["kind"] = d["kind"].lower()
    return d


def read_xml_bytes(path: Path) -> bytes:
    data = path.read_bytes()
    if path.suffix.lower() == ".gz" or data[:2] == b"\x1f\x8b":
        data = gzip.decompress(data)
    elif path.suffix.lower() == ".zip" or data[:2] == b"PK":
        with zipfile.ZipFile(io.BytesIO(data)) as z:
            names = [n for n in z.namelist() if n.lower().endswith(".xml")] or z.namelist()
            data = z.read(names[0])
    return data


def decode_xml(data: bytes) -> str:
    if data.startswith(b"\xff\xfe") or data.startswith(b"\xfe\xff"):
        return data.decode("utf-16")
    for enc in ("utf-8-sig", "utf-8", "cp1255", "latin-1"):
        try:
            return data.decode(enc)
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8", errors="replace")


def parse_root(path: Path) -> ET.Element:
    text = decode_xml(read_xml_bytes(path))
    # Drop the XML declaration: we already decoded to str and the declared encoding may lie.
    text = re.sub(r"^\s*<\?xml[^>]*\?>", "", text, count=1)
    return ET.fromstring(text)


# ----------------------------------------------------------------- tolerant lookups

def _lname(tag: str) -> str:
    return tag.split("}", 1)[-1].lower()


def child_text(el: ET.Element, *names: str) -> Optional[str]:
    wanted = {n.lower() for n in names}
    for c in el:
        if _lname(c.tag) in wanted:
            t = (c.text or "").strip()
            return t or None
    return None


def iter_named(root: ET.Element, *names: str) -> Iterator[ET.Element]:
    wanted = {n.lower() for n in names}
    for el in root.iter():
        if _lname(el.tag) in wanted:
            yield el


def find_text_anywhere(root: ET.Element, *names: str) -> Optional[str]:
    for el in iter_named(root, *names):
        t = (el.text or "").strip()
        if t:
            return t
    return None


def _num(s: Optional[str]) -> Optional[float]:
    if not s:
        return None
    s = s.strip()
    if "," in s and "." not in s:
        # "5,90" is a decimal comma; "1,250" is a thousands separator
        s = s.replace(",", ".") if re.fullmatch(r"\d+,\d{1,2}", s) else s.replace(",", "")
    else:
        s = s.replace(",", "")
    try:
        return float(s)
    except ValueError:
        return None


def _iso(s: Optional[str]) -> Optional[str]:
    """'2026-11-03 03:00' / '2026-11-03T03:00:00' / '202611030300' -> ISO string."""
    if not s:
        return None
    s = s.strip()
    for fmt in ("%Y-%m-%d %H:%M", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d", "%Y%m%d%H%M", "%d/%m/%Y %H:%M", "%d/%m/%Y"):
        try:
            return datetime.strptime(s, fmt).isoformat()
        except ValueError:
            continue
    return None


# ----------------------------------------------------------------- stores

def parse_stores(path: Path) -> list[Store]:
    root = parse_root(path)
    meta = file_meta(path)
    chain_id = find_text_anywhere(root, "ChainId", "ChainID") or meta["chain"] or ""
    chain_name = find_text_anywhere(root, "ChainName") or chain_id

    out: list[Store] = []
    for st in iter_named(root, "Store", "Branch"):
        store_id = child_text(st, "StoreId", "StoreID", "BranchId", "BranchID")
        if not store_id:
            continue
        # sub-chain: either a child of the store, or an ancestor <SubChain> block
        sub_id = child_text(st, "SubChainId", "SubChainID")
        sub_name = child_text(st, "SubChainName")
        out.append(Store(
            chain_id=chain_id,
            chain_name=chain_name,
            store_id=store_id.lstrip("0") or "0",
            name=child_text(st, "StoreName", "BranchName", "Name") or f"סניף {store_id}",
            city=child_text(st, "City"),
            address=child_text(st, "Address", "Adress"),
            subchain_id=sub_id,
            subchain_name=sub_name,
        ))

    # Fill sub-chain from <SubChain> wrappers when stores don't carry it
    for sc in iter_named(root, "SubChain"):
        sid = child_text(sc, "SubChainId", "SubChainID")
        sname = child_text(sc, "SubChainName")
        ids = {s.lstrip("0") or "0" for s in (child_text(st, "StoreId", "StoreID") or "" for st in iter_named(sc, "Store", "Branch")) if s}
        for s in out:
            if s.store_id in ids and not s.subchain_id:
                s.subchain_id, s.subchain_name = sid, sname
    return out


# ----------------------------------------------------------------- prices

def parse_prices(path: Path) -> list[PriceLine]:
    root = parse_root(path)
    meta = file_meta(path)
    chain_id = find_text_anywhere(root, "ChainId", "ChainID") or meta["chain"] or ""
    store_id = find_text_anywhere(root, "StoreId", "StoreID") or meta["store"] or ""
    store_id = store_id.lstrip("0") or "0"

    out: list[PriceLine] = []
    for it in iter_named(root, "Item", "Product"):
        barcode = child_text(it, "ItemCode", "ItemBarcode", "Barcode")
        name = child_text(it, "ItemName", "ItemNm", "ManufacturerItemDescription", "ProductName")
        price = _num(child_text(it, "ItemPrice", "Price"))
        if not barcode or not name or price is None or price <= 0:
            continue
        # Internal (non-GS1) codes are chain-specific; keep only real barcodes (8–14 digits)
        if not re.fullmatch(r"\d{8,14}", barcode):
            continue
        out.append(PriceLine(
            chain_id=chain_id,
            store_id=store_id,
            barcode=barcode,
            name=name,
            price=round(price, 2),
            unit_price=_num(child_text(it, "UnitOfMeasurePrice", "UnitPrice")),
            manufacturer=child_text(it, "ManufacturerName", "ManufactureName", "Manufacturer"),
            quantity=_num(child_text(it, "Quantity", "QtyInPackage")),
            unit=child_text(it, "UnitQty", "UnitOfMeasure"),
            updated_at=_iso(child_text(it, "PriceUpdateDate", "UpdateDate")),
        ))
    return out


def iter_files(folder: Path, kinds: Iterable[str]) -> Iterator[Path]:
    wanted = {k.lower() for k in kinds}
    for p in sorted(folder.rglob("*")):
        if p.is_file() and p.suffix.lower() in (".xml", ".gz", ".zip") and file_meta(p)["kind"] in wanted:
            yield p
