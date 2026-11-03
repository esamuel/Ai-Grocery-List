"""Parser tests on synthetic files that mimic the real chain formats.  Run: python3 test_parse_files.py"""
import gzip
import tempfile
from pathlib import Path

from parse_files import file_meta, iter_files, parse_prices, parse_stores

STORES_XML = """<?xml version="1.0" encoding="utf-8"?>
<Root><ChainId>7290027600007</ChainId><ChainName>שופרסל</ChainName><LastUpdateDate>2026-11-03</LastUpdateDate>
<SubChains><SubChain><SubChainId>1</SubChainId><SubChainName>שופרסל דיל</SubChainName>
<Stores>
 <Store><StoreId>001</StoreId><BikoretNo>1</BikoretNo><StoreType>1</StoreType><StoreName>דיל בן יהודה</StoreName><Address>בן יהודה 12</Address><City>תל אביב - יפו</City><ZipCode>0</ZipCode></Store>
 <Store><StoreId>002</StoreId><StoreName>דיל רמת גן</StoreName><Address>ביאליק 5</Address><City>רמת גן</City></Store>
</Stores></SubChain></SubChains></Root>"""

# Cerberus-style (Rami Levy etc.): <Branches><Branch>, windows-1255 encoded
STORES_CP1255 = """<?xml version="1.0" encoding="windows-1255"?>
<Root><ChainId>7290058140886</ChainId><ChainName>רמי לוי</ChainName>
<Branches>
 <Branch><StoreID>14</StoreID><StoreName>רמי לוי תל אביב</StoreName><Address>החשמונאים 90</Address><City>תל-אביב</City></Branch>
</Branches></Root>"""

PRICES_XML = """<?xml version="1.0" encoding="utf-8"?>
<root><ChainId>7290027600007</ChainId><SubChainId>1</SubChainId><StoreId>001</StoreId><BikoretNo>1</BikoretNo>
<Items Count="3">
 <Item><PriceUpdateDate>2026-11-03 03:12</PriceUpdateDate><ItemCode>7290000066967</ItemCode><ItemType>1</ItemType><ItemName>חלב תנובה 3% 1 ליטר</ItemName><ManufacturerName>תנובה</ManufacturerName><UnitQty>ליטר</UnitQty><Quantity>1.00</Quantity><UnitOfMeasure>ליטר</UnitOfMeasure><bIsWeighted>0</bIsWeighted><QtyInPackage>1</QtyInPackage><ItemPrice>6.60</ItemPrice><UnitOfMeasurePrice>6.60</UnitOfMeasurePrice></Item>
 <Item><ItemCode>7290004131074</ItemCode><ItemName>ביצים L 12 יח</ItemName><ItemPrice>13.90</ItemPrice><UnitOfMeasurePrice>1.16</UnitOfMeasurePrice></Item>
 <Item><ItemCode>12345</ItemCode><ItemName>קוד פנימי</ItemName><ItemPrice>1.00</ItemPrice></Item>
 <Item><ItemCode>7290000000001</ItemCode><ItemName>מחיר אפס</ItemName><ItemPrice>0</ItemPrice></Item>
</Items></root>"""

# Alternative schema some chains use: <Prices><Products><Product>
PRICES_ALT = """<?xml version="1.0" encoding="utf-8"?>
<Prices><ChainID>7290058140886</ChainID><StoreID>14</StoreID><Products>
 <Product><PriceUpdateDate>03/11/2026 04:00</PriceUpdateDate><ItemCode>7290000066967</ItemCode><ItemName>חלב 3% תנובה 1ל</ItemName><ItemPrice>5,90</ItemPrice></Product>
</Products></Prices>"""


def write(dir_: Path, name: str, text: str, encoding="utf-8", gz=False) -> Path:
    data = text.encode(encoding)
    p = dir_ / name
    p.write_bytes(gzip.compress(data) if gz else data)
    return p


def main() -> None:
    with tempfile.TemporaryDirectory() as d:
        d = Path(d)
        s1 = write(d, "Stores7290027600007-202611030300.xml", STORES_XML)
        s2 = write(d, "Stores7290058140886-202611030300.xml", STORES_CP1255, encoding="cp1255")
        p1 = write(d, "PriceFull7290027600007-001-202611030300.gz", PRICES_XML, gz=True)
        p2 = write(d, "PriceFull7290058140886-014-202611030300.xml", PRICES_ALT)
        write(d, "PromoFull7290027600007-001-202611030300.gz", "<Root/>", gz=True)

        assert file_meta(p1) == {"kind": "pricefull", "chain": "7290027600007", "store": "001", "ts": "202611030300"}
        assert [x.name for x in iter_files(d, ["pricefull"])] == [p1.name, p2.name]
        assert [x.name for x in iter_files(d, ["stores"])] == [s1.name, s2.name]

        st = parse_stores(s1)
        assert len(st) == 2 and st[0].chain_name == "שופרסל"
        assert st[0].store_id == "1" and st[0].city == "תל אביב - יפו" and st[0].subchain_name == "שופרסל דיל"
        st2 = parse_stores(s2)
        assert st2[0].chain_id == "7290058140886" and st2[0].store_id == "14" and st2[0].city == "תל-אביב", st2

        pr = parse_prices(p1)
        assert [x.barcode for x in pr] == ["7290000066967", "7290004131074"], pr   # internal code + zero price dropped
        assert pr[0].price == 6.6 and pr[0].store_id == "1" and pr[0].manufacturer == "תנובה"
        assert pr[0].updated_at == "2026-11-03T03:12:00"
        assert pr[1].unit_price == 1.16 and pr[1].updated_at is None

        pr2 = parse_prices(p2)
        assert len(pr2) == 1 and pr2[0].price == 5.9 and pr2[0].chain_id == "7290058140886" and pr2[0].store_id == "14"
        assert pr2[0].updated_at == "2026-11-03T04:00:00"
    print("parse_files: all tests passed")


if __name__ == "__main__":
    main()
