"""
RGM System - Comprehensive Data Seed Script
Populates MongoDB with rich, realistic data for all collections.
Run with: python seed_data.py
"""

from __future__ import annotations
import os
import sys
from datetime import datetime, timedelta, timezone

# Ensure UTF-8 output on Windows (needed for emoji characters like ✅)
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")
from bson import ObjectId
from dotenv import load_dotenv
from pymongo import MongoClient, UpdateOne

# Load .env from the python-backend directory
HERE = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(HERE, ".env"))
load_dotenv(os.path.join(HERE, "..", ".env"))

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017")
MONGODB_DB  = os.getenv("MONGODB_DB", "rgm_tool_prod")

client = MongoClient(MONGODB_URI)
db = client[MONGODB_DB]

print(f"[seed] Connecting to {MONGODB_DB} at {MONGODB_URI[:40]}...")

# ─── Drop existing collections so re-runs are idempotent ──────────────────────
for col in ["products", "pricing_records", "promotions", "demand_forecasts", "assortment_data"]:
    db[col].drop()
    print(f"[seed] Dropped {col}")


# ─── 1. Products ──────────────────────────────────────────────────────────────
def make_product(name, category, subcategory, region, channel,
                 current_price, recommended_price, competitor_price,
                 margin_pct, price_elasticity, unit_cost, units_sold_avg):
    return {
        "_id": ObjectId(),
        "name": name,
        "category": category,
        "subcategory": subcategory,
        "region": region,
        "channel": channel,
        "current_price": current_price,
        "recommended_price": recommended_price,
        "competitor_price": competitor_price,
        "margin_pct": margin_pct,
        "price_elasticity": price_elasticity,
        "unit_cost": unit_cost,
        "units_sold_avg": units_sold_avg,
        "created_at": datetime.now(timezone.utc),
    }

products_raw = [
    make_product("Sparkle Cola 330ml",      "Beverages", "Carbonated Drinks", "National",    "Retail",      1.49, 1.59, 1.69, 32.5, -1.80, 1.01, 85000),
    make_product("Sparkle Cola Zero 330ml", "Beverages", "Carbonated Drinks", "National",    "Retail",      1.59, 1.69, 1.79, 34.1, -1.50, 1.05, 60000),
    make_product("Citrus Splash 1L",        "Beverages", "Juice",             "South",       "Retail",      2.99, 3.09, 3.19, 28.7, -2.20, 2.13, 45000),
    make_product("Mountain Spring Water",   "Beverages", "Water",             "National",    "Retail",      0.89, 0.95, 0.99, 22.5, -2.80, 0.69, 120000),
    make_product("Energy Booster 250ml",    "Beverages", "Energy Drinks",     "North",       "Retail",      1.99, 2.09, 2.29, 38.2, -1.30, 1.23, 35000),
    make_product("Crispy Chips Original",   "Snacks",    "Chips",             "West",        "Retail",      1.29, 1.39, 1.49, 41.0, -1.60, 0.76, 70000),
    make_product("Cheesy Puffs 80g",        "Snacks",    "Puffs",             "East",        "Retail",      1.19, 1.19, 1.29, 39.5, -1.70, 0.72, 55000),
    make_product("Trail Mix Premium 200g",  "Snacks",    "Nuts & Seeds",      "North",       "Retail",      3.49, 3.79, 3.99, 35.0, -1.10, 2.27, 22000),
    make_product("Granola Bar Honey",       "Breakfast", "Bars",              "South",       "Retail",      2.19, 2.29, 2.49, 30.8, -1.40, 1.52, 48000),
    make_product("Oat Cluster Cereal 500g", "Breakfast", "Cereal",            "National",    "Retail",      4.49, 4.69, 4.99, 27.3, -1.20, 3.27, 31000),
    make_product("Protein Shake Vanilla",   "Beverages", "Sports Nutrition",  "National",    "E-commerce",  3.99, 4.19, 4.49, 42.0, -0.90, 2.31, 18000),
    make_product("Green Tea Matcha 330ml",  "Beverages", "Tea Drinks",        "East",        "E-commerce",  1.89, 1.99, 2.19, 36.5, -1.35, 1.20, 28000),
    make_product("Catering Cola 2L",        "Beverages", "Carbonated Drinks", "National",    "Foodservice", 3.29, 3.49, 3.69, 29.0, -2.30, 2.34, 15000),
    make_product("Snack Pack Variety 6x",   "Snacks",    "Multipacks",        "National",    "Foodservice", 5.99, 6.29, 6.49, 33.5, -1.00, 3.98, 12000),
    make_product("Sparkling Lemon 500ml",   "Beverages", "Sparkling Water",   "West",        "Retail",      1.29, 1.39, 1.49, 31.0, -1.90, 0.89, 52000),
]

result = db["products"].insert_many(products_raw)
print(f"[seed] Inserted {len(result.inserted_ids)} products")

product_ids = [p["_id"] for p in products_raw]


# ─── 2. Pricing Records (12 months × 15 products) ────────────────────────────
import random, math

random.seed(42)

pricing_records = []
base_date = datetime(2024, 4, 1)

for month_offset in range(12):
    record_date = base_date + timedelta(days=30 * month_offset)
    for prod in products_raw:
        cp = float(prod["current_price"])
        uc = float(prod["unit_cost"])
        # Simulate slight price fluctuations
        price = round(cp * random.uniform(0.95, 1.05), 2)
        comp_price = round(float(prod["competitor_price"]) * random.uniform(0.97, 1.03), 2)
        units = int(prod["units_sold_avg"] * random.uniform(0.8, 1.25) *
                    (1 + 0.3 * math.sin(month_offset * math.pi / 6)))  # seasonality
        revenue = round(units * price, 2)
        cogs = round(units * uc, 2)
        gross_profit = round(revenue - cogs, 2)
        promo_spend = round(revenue * random.uniform(0, 0.04), 2)
        logistics = round(revenue * 0.02, 2)
        loss = round(revenue * random.uniform(0.005, 0.02), 2)
        net_profit = round(max(0, gross_profit - promo_spend - logistics - loss), 2)
        margin_pct = round((gross_profit / revenue * 100) if revenue > 0 else 0, 2)
        price_index = round((price / comp_price * 100) if comp_price > 0 else 100, 2)
        pricing_records.append({
            "product_id": prod["_id"],
            "effective_date": record_date,
            "price": price,
            "competitor_price": comp_price,
            "units_sold": units,
            "revenue": revenue,
            "cost_of_goods_sold": cogs,
            "gross_profit": gross_profit,
            "promo_spend": promo_spend,
            "logistics_cost": logistics,
            "channel_cost": round(revenue * 0.015, 2),
            "loss_amount": loss,
            "net_profit": net_profit,
            "margin_pct": margin_pct,
            "price_index": price_index,
        })

result = db["pricing_records"].insert_many(pricing_records)
print(f"[seed] Inserted {len(result.inserted_ids)} pricing records")


# ─── 3. Promotions (historical performance) ───────────────────────────────────
channels = ["Retail", "E-commerce", "Foodservice"]
promo_types = ["percent_off", "bogo", "bundle"]
statuses = ["active", "completed", "planned"]
event_names = ["New Year", "Valentine's Day", "Summer Sale", "Diwali", "Christmas", "Holi", "Eid", "Back to School", "Black Friday", "Easter", None, None]

promotions_raw = []
start_date_base = datetime(2024, 1, 1)
for i in range(30):
    disc = random.choice([10, 15, 20, 25, 30])
    dur = random.choice([3, 5, 7, 10, 14])
    chan = random.choice(channels)
    ptype = random.choice(promo_types)
    prod = random.choice(products_raw)
    st = start_date_base + timedelta(days=i * 12 + random.randint(0, 5))
    ev_name = random.choice(event_names)
    base_rev = float(prod["units_sold_avg"]) * float(prod["current_price"]) * (dur / 30)
    lift_pct = disc * 1.3 + (5 if dur > 7 else 0) + random.uniform(-3, 5)
    cann_pct = disc * 0.35 + random.uniform(-1, 3)
    incremental_rev = base_rev * (lift_pct / 100)
    promo_spend = base_rev * (disc / 100) * 0.5
    cann_loss = incremental_rev * (cann_pct / 100) * 0.4
    inc_profit = round(incremental_rev - promo_spend - cann_loss, 2)
    inc_loss = round(max(0, cann_loss + (-inc_profit if inc_profit < 0 else 0)), 2)
    inc_profit = round(max(0, inc_profit), 2)
    roi = round((inc_profit / promo_spend) if promo_spend > 0 else 0, 2)
    promotions_raw.append({
        "product_id": prod["_id"],
        "name": f"{ev_name or prod['name'][:12]} Promo {i+1}",
        "event_name": ev_name,
        "status": statuses[i % 3],
        "roi": roi,
        "revenue_lift_pct": round(lift_pct, 1),
        "cannibalization_pct": round(cann_pct, 1),
        "incremental_profit": inc_profit,
        "incremental_loss": inc_loss,
        "net_profit": inc_profit,
        "loss_amount": inc_loss,
        "start_date": st,
        "end_date": st + timedelta(days=dur),
        "discount_pct": disc,
        "duration_days": dur,
        "channel": chan,
        "promo_type": ptype,
        "product_category": prod["category"],
        "region": prod["region"],
        "base_revenue": round(base_rev, 2),
        "incremental_revenue": round(incremental_rev, 2),
        "promo_spend": round(promo_spend, 2),
        "budget": round(promo_spend * 1.1, 2),
    })

result = db["promotions"].insert_many(promotions_raw)
print(f"[seed] Inserted {len(result.inserted_ids)} promotions")


# ─── 4. Demand Forecasts (24 months historical per product) ─────────────────
demand_forecasts = []
fc_base = datetime(2023, 1, 1)
for prod in products_raw:
    cp = float(prod["current_price"])
    uc = float(prod["unit_cost"])
    base_demand = int(prod["units_sold_avg"])

    # 24 months historical
    hist_demands = []
    for m in range(24):
        dt = fc_base + timedelta(days=30 * m)
        season = 1 + 0.35 * math.sin((m + 3) * math.pi / 6)
        trend = 1 + 0.015 * m
        noise = random.uniform(0.88, 1.12)
        actual = int(base_demand * season * trend * noise)
        pred = int(actual * random.uniform(0.93, 1.07))
        actual_rev = round(actual * cp, 2)
        actual_profit = round(max(0, actual * (cp - uc) - actual_rev * 0.02), 2)
        actual_loss = round(actual_rev * random.uniform(0.005, 0.018), 2)
        hist_demands.append(actual)
        demand_forecasts.append({
            "product_id": prod["_id"],
            "forecast_date": dt.date().isoformat(),
            "actual_demand": actual,
            "predicted_demand": pred,
            "is_forecast": False,
            "seasonality_index": round(season, 3),
            "trend_component": int(base_demand * trend),
            "actual_revenue": actual_rev,
            "predicted_revenue": round(pred * cp, 2),
            "actual_profit": actual_profit,
            "predicted_profit": round(max(0, pred * (cp - uc) - pred * cp * 0.02), 2),
            "actual_loss": actual_loss,
            "predicted_loss": round(pred * cp * 0.012, 2),
            "loss_amount": actual_loss,
        })

    # 6 months forecast (simple extrapolation for seed)
    avg_demand = int(sum(hist_demands[-6:]) / 6)
    for m in range(6):
        dt = fc_base + timedelta(days=30 * (24 + m))
        season = 1 + 0.35 * math.sin((24 + m + 3) * math.pi / 6)
        trend = 1 + 0.015 * (24 + m)
        pred = int(avg_demand * season * (1 + 0.01 * m))
        pred_rev = round(pred * cp, 2)
        pred_profit = round(max(0, pred * (cp - uc) - pred_rev * 0.02), 2)
        pred_loss = round(pred_rev * 0.012, 2)
        demand_forecasts.append({
            "product_id": prod["_id"],
            "forecast_date": dt.date().isoformat(),
            "actual_demand": None,
            "predicted_demand": pred,
            "is_forecast": True,
            "seasonality_index": round(season, 3),
            "trend_component": int(avg_demand * trend),
            "actual_revenue": None,
            "predicted_revenue": pred_rev,
            "actual_profit": None,
            "predicted_profit": pred_profit,
            "actual_loss": None,
            "predicted_loss": pred_loss,
            "loss_amount": pred_loss,
        })

result = db["demand_forecasts"].insert_many(demand_forecasts)
print(f"[seed] Inserted {len(result.inserted_ids)} demand forecast rows")


# ─── 5. Assortment Data ───────────────────────────────────────────────────────
recommendations = ["add", "keep", "delist", "review"]
assortment_rows = []
channels_assort = ["Retail", "E-commerce", "Foodservice"]

for prod in products_raw:
    for chan in random.sample(channels_assort, random.randint(1, 3)):
        base_rev = float(prod["units_sold_avg"]) * float(prod["current_price"])
        rev = round(base_rev * random.uniform(0.7, 1.4), 2)
        growth = round(random.uniform(-8, 28), 1)
        mkt_share = round(random.uniform(3, 25), 1)
        cat_mix = round(random.uniform(8, 35), 1)
        margin = float(prod["margin_pct"])
        gross = round(rev * margin / 100, 2)
        loss = round(rev * random.uniform(0.005, 0.025), 2)
        net = round(max(0, gross - loss), 2)
        units = int(prod["units_sold_avg"] * random.uniform(0.7, 1.3))
        
        # Recommendation heuristic matching what ML expects
        if growth > 15 and mkt_share > 12:
            rec = "add"
        elif growth < -3 and mkt_share < 6:
            rec = "delist"
        elif growth < 2 or net < rev * 0.05:
            rec = "review"
        else:
            rec = "keep"
        
        assortment_rows.append({
            "product_id": prod["_id"],
            "channel": chan,
            "revenue": rev,
            "revenue_growth_pct": growth,
            "units_sold": units,
            "market_share_pct": mkt_share,
            "category_mix_pct": cat_mix,
            "gross_profit": gross,
            "net_profit": net,
            "loss_amount": loss,
            "margin_pct": margin,
            "recommendation": rec,
        })

result = db["assortment_data"].insert_many(assortment_rows)
print(f"[seed] Inserted {len(result.inserted_ids)} assortment rows")


# ─── Summary ──────────────────────────────────────────────────────────────────
print()
print("=" * 55)
print("  ✅  RGM seed complete!")
print("=" * 55)
for col in ["products", "pricing_records", "promotions", "demand_forecasts", "assortment_data"]:
    count = db[col].count_documents({})
    print(f"  {col:<22} {count:>5} documents")
print("=" * 55)
print()
print("Next: start the backend with:  uvicorn main:app --port 4000 --reload")
