/**
 * MongoDB seed script: all collections + upcoming events + previous (past) promotion reference data.
 * Run: node server/scripts/seedMongo.js
 * Or with mongosh: mongosh "mongodb://127.0.0.1:27017/rgm_tool_prod" --file server/scripts/seedMongo.js
 *
 * Uses fixed ObjectIds so related data can reference products. Safe to run multiple times
 * (drops collections first; remove the drop calls if you want to append only).
 */

import { MongoClient, ObjectId } from "mongodb";
import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(__dirname, "../../.env") });

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const dbName = process.env.MONGODB_DB || "rgm_tool_prod";

// Fixed IDs for products so promotions/pricing/forecasts can reference them
const PRODUCT_IDS = {
  productA: new ObjectId("507f1f77bcf86cd799439011"),
  productB: new ObjectId("507f1f77bcf86cd799439012"),
  productC: new ObjectId("507f1f77bcf86cd799439013"),
  productD: new ObjectId("507f1f77bcf86cd799439014"),
  productE: new ObjectId("507f1f77bcf86cd799439015"),
  productF: new ObjectId("507f1f77bcf86cd799439016"),
  productG: new ObjectId("507f1f77bcf86cd799439017"),
  productH: new ObjectId("507f1f77bcf86cd799439018"),
};

const products = [
  { _id: PRODUCT_IDS.productA, name: "PepsiCo Cola 12-Pack", category: "Beverages", subcategory: "Carbonated Soft Drinks", region: "National", unit_cost: 4.5, current_price: 7.99, competitor_price: 7.5, recommended_price: 7.99, margin_pct: 43.8, price_elasticity: -1.5, channel: "Retail", status: "active", created_at: new Date() },
  { _id: PRODUCT_IDS.productB, name: "PepsiCo Sparkling Water 8-Pack", category: "Beverages", subcategory: "Water", region: "National", unit_cost: 2.2, current_price: 4.49, competitor_price: 4.29, recommended_price: 4.49, margin_pct: 51.0, price_elasticity: -1.5, channel: "Retail", status: "active", created_at: new Date() },
  { _id: PRODUCT_IDS.productC, name: "Quaker Oats Family Pack", category: "Breakfast", subcategory: "Oats and Cereal", region: "National", unit_cost: 12.0, current_price: 24.99, competitor_price: 23.99, recommended_price: 24.99, margin_pct: 51.9, price_elasticity: -1.5, channel: "Retail", status: "active", created_at: new Date() },
  { _id: PRODUCT_IDS.productD, name: "Lays Classic Potato Chips 220g", category: "Snacks", subcategory: "Salty Snacks", region: "National", unit_cost: 1.8, current_price: 3.99, competitor_price: 3.79, recommended_price: 3.99, margin_pct: 54.9, price_elasticity: -1.4, channel: "Retail", status: "active", created_at: new Date() },
  { _id: PRODUCT_IDS.productE, name: "Gatorade Sports Drink 8-Pack", category: "Beverages", subcategory: "Sports Hydration", region: "National", unit_cost: 3.0, current_price: 6.99, competitor_price: 6.49, recommended_price: 6.99, margin_pct: 57.1, price_elasticity: -1.6, channel: "Retail", status: "active", created_at: new Date() },
  { _id: PRODUCT_IDS.productF, name: "PepsiCo Fountain Cola Syrup 5-Gallon", category: "Foodservice", subcategory: "Beverage Concentrates", region: "National", unit_cost: 2.5, current_price: 5.49, competitor_price: 5.29, recommended_price: 5.49, margin_pct: 54.5, price_elasticity: -1.3, channel: "Foodservice", status: "active", created_at: new Date() },
  { _id: PRODUCT_IDS.productG, name: "PepsiCo Fountain Lemon Lime Syrup 5-Gallon", category: "Foodservice", subcategory: "Beverage Concentrates", region: "National", unit_cost: 8.0, current_price: 16.99, competitor_price: 15.99, recommended_price: 16.99, margin_pct: 52.9, price_elasticity: -1.5, channel: "Foodservice", status: "active", created_at: new Date() },
  { _id: PRODUCT_IDS.productH, name: "Quaker Granola Bars 24ct", category: "Snacks", subcategory: "Nutrition Bars", region: "National", unit_cost: 3.2, current_price: 6.49, competitor_price: 6.99, recommended_price: 6.49, margin_pct: 50.7, price_elasticity: -1.4, channel: "Retail", status: "active", created_at: new Date() },
];

const productById = new Map(products.map((p) => [String(p._id), p]));
const round2 = (value) => Number(Number(value || 0).toFixed(2));

const pricing_records = [
  { product_id: PRODUCT_IDS.productA, price: 7.49, competitor_price: 7.5, price_index: 99, revenue: 12400, units_sold: 1650, margin_pct: 42, effective_date: "2025-01-15", region: "National", created_at: new Date() },
  { product_id: PRODUCT_IDS.productA, price: 7.99, competitor_price: 7.5, price_index: 106, revenue: 13200, units_sold: 1650, margin_pct: 43.8, effective_date: "2025-02-01", region: "National", created_at: new Date() },
  { product_id: PRODUCT_IDS.productA, price: 7.99, competitor_price: 7.6, price_index: 105, revenue: 13800, units_sold: 1730, margin_pct: 43.8, effective_date: "2025-03-01", region: "National", created_at: new Date() },
  { product_id: PRODUCT_IDS.productB, price: 4.29, competitor_price: 4.29, price_index: 100, revenue: 8580, units_sold: 2000, margin_pct: 48.9, effective_date: "2025-01-10", region: "National", created_at: new Date() },
  { product_id: PRODUCT_IDS.productB, price: 4.49, competitor_price: 4.29, price_index: 105, revenue: 8980, units_sold: 2000, margin_pct: 51, effective_date: "2025-02-01", region: "National", created_at: new Date() },
  { product_id: PRODUCT_IDS.productB, price: 4.49, competitor_price: 4.39, price_index: 102, revenue: 9420, units_sold: 2100, margin_pct: 51, effective_date: "2025-03-01", region: "National", created_at: new Date() },
  { product_id: PRODUCT_IDS.productC, price: 24.99, competitor_price: 23.99, price_index: 104, revenue: 24990, units_sold: 1000, margin_pct: 51.9, effective_date: "2025-01-20", region: "National", created_at: new Date() },
  { product_id: PRODUCT_IDS.productC, price: 24.99, competitor_price: 24.49, price_index: 102, revenue: 26200, units_sold: 1050, margin_pct: 51.9, effective_date: "2025-02-15", region: "National", created_at: new Date() },
  { product_id: PRODUCT_IDS.productD, price: 3.79, competitor_price: 3.79, price_index: 100, revenue: 7580, units_sold: 2000, margin_pct: 52.5, effective_date: "2025-01-01", region: "National", created_at: new Date() },
  { product_id: PRODUCT_IDS.productD, price: 3.99, competitor_price: 3.79, price_index: 105, revenue: 7980, units_sold: 2000, margin_pct: 54.9, effective_date: "2025-02-01", region: "National", created_at: new Date() },
  { product_id: PRODUCT_IDS.productE, price: 6.79, competitor_price: 6.49, price_index: 105, revenue: 13580, units_sold: 2000, margin_pct: 55.8, effective_date: "2025-01-01", region: "National", created_at: new Date() },
  { product_id: PRODUCT_IDS.productE, price: 6.99, competitor_price: 6.49, price_index: 108, revenue: 13980, units_sold: 2000, margin_pct: 57.1, effective_date: "2025-02-01", region: "National", created_at: new Date() },
  { product_id: PRODUCT_IDS.productF, price: 5.29, competitor_price: 5.29, price_index: 100, revenue: 10580, units_sold: 2000, margin_pct: 52.7, effective_date: "2025-01-01", region: "National", created_at: new Date() },
  { product_id: PRODUCT_IDS.productF, price: 5.49, competitor_price: 5.29, price_index: 104, revenue: 10980, units_sold: 2000, margin_pct: 54.5, effective_date: "2025-02-01", region: "National", created_at: new Date() },
  { product_id: PRODUCT_IDS.productG, price: 16.49, competitor_price: 15.99, price_index: 103, revenue: 32980, units_sold: 2000, margin_pct: 51.5, effective_date: "2025-01-01", region: "National", created_at: new Date() },
  { product_id: PRODUCT_IDS.productG, price: 16.99, competitor_price: 15.99, price_index: 106, revenue: 33980, units_sold: 2000, margin_pct: 52.9, effective_date: "2025-02-01", region: "National", created_at: new Date() },
  { product_id: PRODUCT_IDS.productH, price: 6.29, competitor_price: 6.99, price_index: 90, revenue: 12580, units_sold: 2000, margin_pct: 49.0, effective_date: "2025-01-01", region: "National", created_at: new Date() },
  { product_id: PRODUCT_IDS.productH, price: 6.49, competitor_price: 6.99, price_index: 93, revenue: 12980, units_sold: 2000, margin_pct: 50.7, effective_date: "2025-02-01", region: "National", created_at: new Date() },
];

// Past promotions (previous reference data) – some with event_name for upcoming matching
const promotions = [
  {
    product_id: PRODUCT_IDS.productA,
    name: "Diwali 2025",
    event_name: "Diwali",
    discount_pct: 20,
    duration_days: 7,
    channel: "Retail",
    start_date: "2025-10-20",
    end_date: "2025-10-27",
    revenue_lift_pct: 18,
    roi: 2.1,
    cannibalization_pct: 5,
    status: "completed",
    created_at: new Date(),
  },
  {
    product_id: PRODUCT_IDS.productB,
    name: "Diwali 2025 Sparkling Water",
    event_name: "Diwali",
    discount_pct: 15,
    duration_days: 7,
    channel: "Retail",
    start_date: "2025-10-20",
    end_date: "2025-10-27",
    revenue_lift_pct: 12,
    roi: 1.8,
    cannibalization_pct: 3,
    status: "completed",
    created_at: new Date(),
  },
  {
    product_id: PRODUCT_IDS.productC,
    name: "Eid 2025 Quaker Oats Pack",
    event_name: "Eid",
    discount_pct: 25,
    duration_days: 10,
    channel: "Retail",
    start_date: "2025-03-25",
    end_date: "2025-04-04",
    revenue_lift_pct: 22,
    roi: 2.4,
    cannibalization_pct: 6,
    status: "completed",
    created_at: new Date(),
  },
  {
    product_id: PRODUCT_IDS.productA,
    name: "Black Friday 2025",
    event_name: "Black Friday",
    discount_pct: 30,
    duration_days: 3,
    channel: "E-commerce",
    start_date: "2025-11-28",
    end_date: "2025-11-30",
    revenue_lift_pct: 35,
    roi: 2.8,
    cannibalization_pct: 8,
    status: "completed",
    created_at: new Date(),
  },
  {
    product_id: PRODUCT_IDS.productB,
    name: "Summer Sale 2025",
    discount_pct: 10,
    duration_days: 14,
    channel: "Retail",
    start_date: "2025-06-01",
    end_date: "2025-06-14",
    revenue_lift_pct: 8,
    roi: 1.2,
    cannibalization_pct: 2,
    status: "completed",
    created_at: new Date(),
  },
  {
    product_id: PRODUCT_IDS.productD,
    name: "Diwali 2025 Chips Offer",
    event_name: "Diwali",
    discount_pct: 15,
    duration_days: 7,
    channel: "Retail",
    start_date: "2025-10-20",
    end_date: "2025-10-27",
    revenue_lift_pct: 14,
    roi: 1.9,
    cannibalization_pct: 4,
    status: "completed",
    created_at: new Date(),
  },
  {
    product_id: PRODUCT_IDS.productE,
    name: "Black Friday 2025 Sports Drink",
    event_name: "Black Friday",
    discount_pct: 25,
    duration_days: 3,
    channel: "E-commerce",
    start_date: "2025-11-28",
    end_date: "2025-11-30",
    revenue_lift_pct: 28,
    roi: 2.2,
    cannibalization_pct: 5,
    status: "completed",
    created_at: new Date(),
  },
  {
    product_id: PRODUCT_IDS.productF,
    name: "Holiday 2025 Fountain Cola Syrup",
    event_name: "Christmas",
    discount_pct: 20,
    duration_days: 10,
    channel: "Foodservice",
    start_date: "2024-12-16",
    end_date: "2024-12-25",
    revenue_lift_pct: 19,
    roi: 2.0,
    cannibalization_pct: 5,
    status: "completed",
    created_at: new Date(),
  },
  {
    product_id: PRODUCT_IDS.productG,
    name: "New Year 2025 Lemon Lime Syrup",
    event_name: "New Year",
    discount_pct: 18,
    duration_days: 5,
    channel: "Foodservice",
    start_date: "2024-12-28",
    end_date: "2025-01-01",
    revenue_lift_pct: 16,
    roi: 1.7,
    cannibalization_pct: 4,
    status: "completed",
    created_at: new Date(),
  },
  {
    product_id: PRODUCT_IDS.productH,
    name: "Back to School 2025",
    discount_pct: 12,
    duration_days: 14,
    channel: "Retail",
    start_date: "2025-08-01",
    end_date: "2025-08-14",
    revenue_lift_pct: 11,
    roi: 1.4,
    cannibalization_pct: 3,
    status: "completed",
    created_at: new Date(),
  },
  {
    product_id: PRODUCT_IDS.productC,
    name: "Christmas 2024 Quaker Oats Pack",
    event_name: "Christmas",
    discount_pct: 28,
    duration_days: 14,
    channel: "Retail",
    start_date: "2024-12-10",
    end_date: "2024-12-23",
    revenue_lift_pct: 26,
    roi: 2.5,
    cannibalization_pct: 7,
    status: "completed",
    created_at: new Date(),
  },
];

// Upcoming events (future) + previous events (past) for event_calendar
const event_calendar = [
  // —— Upcoming events (future dates) ——
  { event_name: "Diwali", event_date: "2026-11-01", event_time: "00:00", display_name: "Diwali 2026", created_at: new Date() },
  { event_name: "Eid", event_date: "2026-03-22", event_time: "00:00", display_name: "Eid 2026", created_at: new Date() },
  { event_name: "Black Friday", event_date: "2026-11-27", event_time: "00:00", display_name: "Black Friday 2026", created_at: new Date() },
  { event_name: "Christmas", event_date: "2026-12-25", event_time: "00:00", display_name: "Christmas 2026", created_at: new Date() },
  { event_name: "New Year", event_date: "2026-12-31", event_time: "23:59", display_name: "New Year 2027", created_at: new Date() },
  // —— Previous events (past dates, for reference/history) ——
  { event_name: "Diwali", event_date: "2025-10-20", event_time: "00:00", display_name: "Diwali 2025", created_at: new Date() },
  { event_name: "Eid", event_date: "2025-03-25", event_time: "00:00", display_name: "Eid 2025", created_at: new Date() },
  { event_name: "Black Friday", event_date: "2025-11-28", event_time: "00:00", display_name: "Black Friday 2025", created_at: new Date() },
];

const assortment_data = [
  { product_id: PRODUCT_IDS.productA, channel: "Retail", revenue: 45000, revenue_growth_pct: 8.5, units_sold: 5600, market_share_pct: 12, recommendation: "keep", category_mix_pct: 35, created_at: new Date() },
  { product_id: PRODUCT_IDS.productA, channel: "E-commerce", revenue: 22000, revenue_growth_pct: 15, units_sold: 2800, market_share_pct: 8, recommendation: "add", category_mix_pct: 25, created_at: new Date() },
  { product_id: PRODUCT_IDS.productB, channel: "Retail", revenue: 32000, revenue_growth_pct: 5.2, units_sold: 7100, market_share_pct: 18, recommendation: "keep", category_mix_pct: 40, created_at: new Date() },
  { product_id: PRODUCT_IDS.productC, channel: "Retail", revenue: 18000, revenue_growth_pct: 22, units_sold: 720, market_share_pct: 6, recommendation: "keep", category_mix_pct: 15, created_at: new Date() },
  { product_id: PRODUCT_IDS.productD, channel: "Retail", revenue: 28000, revenue_growth_pct: 11, units_sold: 7000, market_share_pct: 14, recommendation: "keep", category_mix_pct: 22, created_at: new Date() },
  { product_id: PRODUCT_IDS.productD, channel: "E-commerce", revenue: 12000, revenue_growth_pct: 18, units_sold: 3000, market_share_pct: 6, recommendation: "add", category_mix_pct: 12, created_at: new Date() },
  { product_id: PRODUCT_IDS.productE, channel: "Retail", revenue: 38000, revenue_growth_pct: 9, units_sold: 5500, market_share_pct: 16, recommendation: "keep", category_mix_pct: 28, created_at: new Date() },
  { product_id: PRODUCT_IDS.productF, channel: "Foodservice", revenue: 32000, revenue_growth_pct: 6.5, units_sold: 5800, market_share_pct: 15, recommendation: "keep", category_mix_pct: 30, created_at: new Date() },
  { product_id: PRODUCT_IDS.productG, channel: "Foodservice", revenue: 65000, revenue_growth_pct: 7, units_sold: 3800, market_share_pct: 10, recommendation: "keep", category_mix_pct: 20, created_at: new Date() },
  { product_id: PRODUCT_IDS.productG, channel: "E-commerce", revenue: 34000, revenue_growth_pct: 12, units_sold: 2000, market_share_pct: 5, recommendation: "add", category_mix_pct: 14, created_at: new Date() },
  { product_id: PRODUCT_IDS.productH, channel: "Retail", revenue: 26000, revenue_growth_pct: 10, units_sold: 4000, market_share_pct: 11, recommendation: "keep", category_mix_pct: 18, created_at: new Date() },
];

const demand_forecasts = [
  { product_id: PRODUCT_IDS.productA, forecast_date: "2025-01-01", actual_demand: 1500, predicted_demand: 1480, is_forecast: false, seasonality_index: 1.0, trend_component: 1480, created_at: new Date() },
  { product_id: PRODUCT_IDS.productA, forecast_date: "2025-02-01", actual_demand: 1620, predicted_demand: 1550, is_forecast: false, seasonality_index: 1.05, trend_component: 1550, created_at: new Date() },
  { product_id: PRODUCT_IDS.productA, forecast_date: "2025-03-01", actual_demand: null, predicted_demand: 1650, is_forecast: true, seasonality_index: 1.02, trend_component: 1650, created_at: new Date() },
  { product_id: PRODUCT_IDS.productB, forecast_date: "2025-01-01", actual_demand: 1900, predicted_demand: 1880, is_forecast: false, seasonality_index: 1.0, trend_component: 1880, created_at: new Date() },
  { product_id: PRODUCT_IDS.productB, forecast_date: "2025-02-01", actual_demand: 2050, predicted_demand: 1980, is_forecast: false, seasonality_index: 1.05, trend_component: 1980, created_at: new Date() },
  { product_id: PRODUCT_IDS.productC, forecast_date: "2025-01-01", actual_demand: 800, predicted_demand: 780, is_forecast: false, seasonality_index: 1.0, trend_component: 780, created_at: new Date() },
  { product_id: PRODUCT_IDS.productC, forecast_date: "2025-02-01", actual_demand: 860, predicted_demand: 830, is_forecast: false, seasonality_index: 1.04, trend_component: 830, created_at: new Date() },
  { product_id: PRODUCT_IDS.productD, forecast_date: "2025-01-01", actual_demand: 1950, predicted_demand: 1920, is_forecast: false, seasonality_index: 1.0, trend_component: 1920, created_at: new Date() },
  { product_id: PRODUCT_IDS.productD, forecast_date: "2025-02-01", actual_demand: 2100, predicted_demand: 2050, is_forecast: false, seasonality_index: 1.05, trend_component: 2050, created_at: new Date() },
  { product_id: PRODUCT_IDS.productD, forecast_date: "2025-03-01", actual_demand: null, predicted_demand: 2180, is_forecast: true, seasonality_index: 1.02, trend_component: 2180, created_at: new Date() },
  { product_id: PRODUCT_IDS.productE, forecast_date: "2025-01-01", actual_demand: 1980, predicted_demand: 1950, is_forecast: false, seasonality_index: 1.0, trend_component: 1950, created_at: new Date() },
  { product_id: PRODUCT_IDS.productE, forecast_date: "2025-02-01", actual_demand: 2050, predicted_demand: 2020, is_forecast: false, seasonality_index: 1.03, trend_component: 2020, created_at: new Date() },
  { product_id: PRODUCT_IDS.productF, forecast_date: "2025-01-01", actual_demand: 1980, predicted_demand: 1960, is_forecast: false, seasonality_index: 1.0, trend_component: 1960, created_at: new Date() },
  { product_id: PRODUCT_IDS.productF, forecast_date: "2025-02-01", actual_demand: 2020, predicted_demand: 2000, is_forecast: false, seasonality_index: 1.02, trend_component: 2000, created_at: new Date() },
  { product_id: PRODUCT_IDS.productG, forecast_date: "2025-01-01", actual_demand: 1980, predicted_demand: 1950, is_forecast: false, seasonality_index: 1.0, trend_component: 1950, created_at: new Date() },
  { product_id: PRODUCT_IDS.productG, forecast_date: "2025-02-01", actual_demand: 2010, predicted_demand: 1990, is_forecast: false, seasonality_index: 1.02, trend_component: 1990, created_at: new Date() },
  { product_id: PRODUCT_IDS.productH, forecast_date: "2025-01-01", actual_demand: 1990, predicted_demand: 1970, is_forecast: false, seasonality_index: 1.0, trend_component: 1970, created_at: new Date() },
  { product_id: PRODUCT_IDS.productH, forecast_date: "2025-02-01", actual_demand: 2040, predicted_demand: 2010, is_forecast: false, seasonality_index: 1.02, trend_component: 2010, created_at: new Date() },
  { product_id: PRODUCT_IDS.productH, forecast_date: "2025-03-01", actual_demand: null, predicted_demand: 2080, is_forecast: true, seasonality_index: 1.03, trend_component: 2080, created_at: new Date() },
];

const pricing_records_enriched = pricing_records.map((record, index) => {
  const product = productById.get(String(record.product_id)) || {};
  const price = Number(record.price || 0);
  const units = Number(record.units_sold || 0);
  const revenue = Number(record.revenue || price * units);
  const unitCost = Number(product.unit_cost || 0);
  const costOfGoodsSold = round2(record.cost_of_goods_sold ?? unitCost * units);
  const promoSpend = round2(record.promo_spend ?? revenue * (0.012 + (index % 3) * 0.003));
  const logisticsCost = round2(record.logistics_cost ?? revenue * (0.010 + (index % 2) * 0.002));
  const returnsLoss = round2(record.returns_loss ?? revenue * (0.003 + (index % 3) * 0.0008));
  const shrinkageLoss = round2(record.shrinkage_loss ?? revenue * (0.004 + (index % 4) * 0.001));
  const baseLossAmount = round2(record.loss_amount ?? returnsLoss + shrinkageLoss);
  const grossProfit = round2(record.gross_profit ?? (revenue - costOfGoodsSold));
  const netProfitRaw = round2(record.net_profit ?? (grossProfit - promoSpend - logisticsCost - baseLossAmount));
  const realizedLoss = round2(baseLossAmount + (netProfitRaw < 0 ? Math.abs(netProfitRaw) : 0));
  const netProfit = round2(Math.max(0, netProfitRaw));
  const profitAmount = round2(Math.max(0, netProfitRaw));

  return {
    ...record,
    revenue,
    cost_of_goods_sold: costOfGoodsSold,
    promo_spend: promoSpend,
    logistics_cost: logisticsCost,
    returns_loss: returnsLoss,
    shrinkage_loss: shrinkageLoss,
    loss_amount: realizedLoss,
    gross_profit: grossProfit,
    net_profit: netProfit,
    profit_amount: profitAmount,
  };
});

const promotions_enriched = promotions.map((promo, index) => {
  const product = productById.get(String(promo.product_id)) || {};
  const baseUnits = 800 + (index * 40);
  const baseRevenue = round2((Number(product.current_price || 12) * baseUnits));
  const liftPct = Number(promo.revenue_lift_pct || 0);
  const discountPct = Number(promo.discount_pct || 0);
  const cannibalizationPct = Number(promo.cannibalization_pct || 0);
  const incrementalRevenue = round2(promo.incremental_revenue ?? (baseRevenue * (liftPct / 100)));
  const promoSpend = round2(promo.promo_spend ?? (baseRevenue * (discountPct / 100) * 0.52));
  const cannibalizationLossAmount = round2(
    promo.cannibalization_loss_amount ?? (incrementalRevenue * (cannibalizationPct / 100) * 0.45),
  );
  const incrementalProfitRaw = round2(
    promo.incremental_profit ?? (incrementalRevenue - promoSpend - cannibalizationLossAmount),
  );
  const incrementalLoss = round2(
    promo.incremental_loss
      ?? promo.loss_amount
      ?? (cannibalizationLossAmount + (incrementalProfitRaw < 0 ? Math.abs(incrementalProfitRaw) : 0)),
  );
  const incrementalProfit = round2(Math.max(0, incrementalProfitRaw));
  const roi = promo.roi != null
    ? Number(promo.roi)
    : round2(promoSpend > 0 ? incrementalProfitRaw / promoSpend : 0);

  return {
    ...promo,
    base_revenue: baseRevenue,
    promo_spend: promoSpend,
    incremental_revenue: incrementalRevenue,
    incremental_profit: incrementalProfit,
    incremental_loss: incrementalLoss,
    cannibalization_loss_amount: cannibalizationLossAmount,
    net_profit: incrementalProfit,
    loss_amount: incrementalLoss,
    roi,
  };
});

const assortment_data_enriched = assortment_data.map((item, index) => {
  const product = productById.get(String(item.product_id)) || {};
  const revenue = Number(item.revenue || 0);
  const units = Number(item.units_sold || 0);
  const unitCost = Number(product.unit_cost || 0);
  const costOfGoodsSold = round2(item.cost_of_goods_sold ?? (unitCost * units));
  const grossProfit = round2(item.gross_profit ?? (revenue - costOfGoodsSold));
  const channelCostRate = item.channel === "E-commerce" ? 0.085 : item.channel === "Foodservice" ? 0.070 : 0.055;
  const channelCost = round2(item.channel_cost ?? (revenue * channelCostRate));
  const growthPct = Number(item.revenue_growth_pct || 0);
  const operationalLossRate = growthPct < 0 ? 0.045 : (0.018 + (index % 3) * 0.003);
  const baseLoss = round2(item.loss_amount ?? item.operational_loss ?? (revenue * operationalLossRate));
  const netProfitRaw = round2(item.net_profit ?? (grossProfit - channelCost - baseLoss));
  const realizedLoss = round2(baseLoss + (netProfitRaw < 0 ? Math.abs(netProfitRaw) : 0));
  const netProfit = round2(Math.max(0, netProfitRaw));
  const profitMarginPct = revenue > 0 ? round2((netProfit / revenue) * 100) : 0;

  return {
    ...item,
    cost_of_goods_sold: costOfGoodsSold,
    channel_cost: channelCost,
    gross_profit: grossProfit,
    net_profit: netProfit,
    loss_amount: realizedLoss,
    profit_amount: round2(Math.max(0, netProfitRaw)),
    profit_margin_pct: profitMarginPct,
  };
});

const demand_forecasts_enriched = demand_forecasts.map((row, index) => {
  const product = productById.get(String(row.product_id)) || {};
  const price = Number(product.current_price || 0);
  const unitCost = Number(product.unit_cost || 0);
  const demandValue = Number(row.actual_demand ?? row.predicted_demand ?? 0);
  const estimatedRevenue = round2(demandValue * price);
  const grossProfit = round2(demandValue * Math.max(0, (price - unitCost)));
  const lossRate = row.is_forecast ? (0.020 + (index % 2) * 0.003) : (0.014 + (index % 3) * 0.002);
  const baseLoss = round2(estimatedRevenue * lossRate);
  const netProfitRaw = round2(grossProfit - baseLoss);
  const realizedLoss = round2(baseLoss + (netProfitRaw < 0 ? Math.abs(netProfitRaw) : 0));
  const netProfit = round2(Math.max(0, netProfitRaw));
  const predictedDemand = Number(row.predicted_demand ?? demandValue);
  const predictedRevenue = round2(predictedDemand * price);
  const predictedGrossProfit = round2(predictedDemand * Math.max(0, (price - unitCost)));
  const predictedLoss = round2(predictedRevenue * lossRate);
  const predictedProfit = round2(Math.max(0, predictedGrossProfit - predictedLoss));

  return {
    ...row,
    actual_revenue: row.is_forecast ? null : estimatedRevenue,
    predicted_revenue: predictedRevenue,
    actual_profit: row.is_forecast ? null : netProfit,
    predicted_profit: row.is_forecast ? netProfit : predictedProfit,
    actual_loss: row.is_forecast ? null : realizedLoss,
    predicted_loss: row.is_forecast ? realizedLoss : predictedLoss,
    loss_amount: realizedLoss,
  };
});

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);

    // Optional: clear existing data (remove these 6 lines to append instead of replace)
    await db.collection("products").deleteMany({});
    await db.collection("pricing_records").deleteMany({});
    await db.collection("promotions").deleteMany({});
    await db.collection("event_calendar").deleteMany({});
    await db.collection("assortment_data").deleteMany({});
    await db.collection("demand_forecasts").deleteMany({});

    await db.collection("products").insertMany(products);
    await db.collection("pricing_records").insertMany(pricing_records_enriched);
    await db.collection("promotions").insertMany(promotions_enriched);
    await db.collection("event_calendar").insertMany(event_calendar);
    await db.collection("assortment_data").insertMany(assortment_data_enriched);
    await db.collection("demand_forecasts").insertMany(demand_forecasts_enriched);

    console.log("Seed completed:");
    console.log("  products:", products.length);
    console.log("  pricing_records (with profit/loss fields):", pricing_records_enriched.length);
    console.log("  promotions (with profit/loss fields):", promotions_enriched.length);
    console.log("  event_calendar (upcoming + previous):", event_calendar.length);
    console.log("  assortment_data (with profit/loss fields):", assortment_data_enriched.length);
    console.log("  demand_forecasts (with profit/loss fields):", demand_forecasts_enriched.length);
  } finally {
    await client.close();
  }
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
