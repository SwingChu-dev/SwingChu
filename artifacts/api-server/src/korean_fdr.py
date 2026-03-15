#!/usr/bin/env python3
"""
FinanceDataReader wrapper for Korean stocks (KOSPI/KOSDAQ).
Called as subprocess by the Node.js API server.

Commands:
  history      <ticker> <days>
  quote        <ticker>
  multi_quote  <ticker1,ticker2,...>
"""
import sys
import json
import warnings
warnings.filterwarnings("ignore")

import FinanceDataReader as fdr
from datetime import datetime, timedelta


def _to_int(v):
    try:
        return int(v)
    except Exception:
        return 0


def _to_float(v):
    try:
        f = float(v)
        return 0.0 if (f != f) else f  # NaN check
    except Exception:
        return 0.0


def get_history(ticker: str, days: int = 365) -> list:
    end = datetime.now()
    # extra buffer so we always get enough trading days
    start = end - timedelta(days=days + 60)
    try:
        df = fdr.DataReader(ticker, start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d"))
        if df is None or df.empty:
            return []
        rows = []
        for date, row in df.iterrows():
            close = _to_int(row.get("Close", 0))
            if close <= 0:
                continue
            rows.append({
                "date":   date.strftime("%Y-%m-%d"),
                "open":   _to_int(row.get("Open",   close)),
                "high":   _to_int(row.get("High",   close)),
                "low":    _to_int(row.get("Low",    close)),
                "close":  close,
                "volume": _to_int(row.get("Volume", 0)),
                "change": _to_float(row.get("Change", 0.0)),
            })
        # return most recent <days> trading rows
        return rows[-days:]
    except Exception as e:
        return {"error": str(e)}


def get_quote(ticker: str) -> dict:
    end = datetime.now()
    start_short = end - timedelta(days=20)
    start_1y    = end - timedelta(days=395)
    try:
        df_short = fdr.DataReader(ticker, start_short.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d"))
        if df_short is None or df_short.empty:
            return {"error": "no recent data"}

        df_1y = fdr.DataReader(ticker, start_1y.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d"))

        latest = df_short.iloc[-1]
        prev   = df_short.iloc[-2] if len(df_short) >= 2 else latest

        close      = _to_int(latest.get("Close", 0))
        prev_close = _to_int(prev.get("Close", close))
        change_pct = _to_float(latest.get("Change", 0.0)) * 100  # FDR Change is fraction
        change_amt = close - prev_close

        if df_1y is not None and not df_1y.empty:
            high52w = _to_int(df_1y["High"].max())
            low52w  = _to_int(df_1y["Low"].min())
        else:
            high52w = _to_int(latest.get("High", close))
            low52w  = _to_int(latest.get("Low",  close))

        return {
            "close":      close,
            "open":       _to_int(latest.get("Open",   close)),
            "high":       _to_int(latest.get("High",   close)),
            "low":        _to_int(latest.get("Low",    close)),
            "volume":     _to_int(latest.get("Volume", 0)),
            "changePercent": round(change_pct, 4),
            "change":     change_amt,
            "prevClose":  prev_close,
            "high52w":    high52w,
            "low52w":     low52w,
            "date":       df_short.index[-1].strftime("%Y-%m-%d"),
        }
    except Exception as e:
        return {"error": str(e)}


def get_multi_quote(tickers: list) -> dict:
    from concurrent.futures import ThreadPoolExecutor, as_completed
    clean = [t.strip() for t in tickers if t.strip()]
    results = {}
    # 최대 10개 스레드 병렬 조회
    with ThreadPoolExecutor(max_workers=min(len(clean), 10)) as ex:
        futures = {ex.submit(get_quote, t): t for t in clean}
        for fut in as_completed(futures):
            t = futures[fut]
            try:
                results[t] = fut.result()
            except Exception as e:
                results[t] = {"error": str(e)}
    return results


if __name__ == "__main__":
    cmd    = sys.argv[1] if len(sys.argv) > 1 else "history"
    arg2   = sys.argv[2] if len(sys.argv) > 2 else ""

    if cmd == "history":
        days   = int(sys.argv[3]) if len(sys.argv) > 3 else 365
        result = get_history(arg2, days)
    elif cmd == "quote":
        result = get_quote(arg2)
    elif cmd == "multi_quote":
        tickers = [t for t in arg2.split(",") if t.strip()]
        result = get_multi_quote(tickers)
    else:
        result = {"error": f"unknown command: {cmd}"}

    print(json.dumps(result, ensure_ascii=False, default=str))
