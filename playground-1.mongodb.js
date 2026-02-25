// Use your app database
use("rgm_tool_prod");

// =============================
// 1) ADD NEW PRODUCTS
// =============================

const { insertedIds: productIds } = db.products.insertMany([
  {
    name: "Sparkling Water 500ml",
    category: "Beverages",
    current_price: 1.29,
    recommended_price: 1.39,
    competitor_price: 1.49,
    margin_pct: 30.5,
    price_elasticity: -1.30,
  },
  {
    name: "Energy Drink 250ml",
    category: "Beverages",
    current_price: 2.19,
    recommended_price: 2.29,
    competitor_price: 2.49,
    margin_pct: 38.0,
    price_elasticity: -1.70,
  },
  {
    name: "Family Cookies 300g",
    category: "Snacks",
    current_price: 2.99,
    recommended_price: 3.09,
    competitor_price: 3.29,
    margin_pct: 33.2,
    price_elasticity: -1.45,
  },
]);

const sparklingId = productIds["0"];
const energyId    = productIds["1"];
const cookiesId   = productIds["2"];

// =============================
// 2) PRICING RECORDS
//    (Pricing page charts/tables)
// =============================

db.pricing_records.insertMany([
  // Sparkling Water
  {
    product_id: sparklingId,
    effective_date: "2024-04-01",
    price: 1.29,
    revenue: 90000,
    price_index: 1.00,
    region: "National",
    margin_pct: 29.0,
    units_sold: 70000,
    competitor_price: 1.39,
  },
  {
    product_id: sparklingId,
    effective_date: "2024-05-01",
    price: 1.39,
    revenue: 95000,
    price_index: 1.03,
    region: "National",
    margin_pct: 30.5,
    units_sold: 72000,
    competitor_price: 1.49,
  },

  // Energy Drink
  {
    product_id: energyId,
    effective_date: "2024-04-01",
    price: 2.19,
    revenue: 120000,
    price_index: 0.97,
    region: "National",
    margin_pct: 36.0,
    units_sold: 55000,
    competitor_price: 2.39,
  },
  {
    product_id: energyId,
    effective_date: "2024-05-01",
    price: 2.29,
    revenue: 130000,
    price_index: 1.02,
    region: "National",
    margin_pct: 38.5,
    units_sold: 58000,
    competitor_price: 2.49,
  },

  // Family Cookies
  {
    product_id: cookiesId,
    effective_date: "2024-04-01",
    price: 2.99,
    revenue: 110000,
    price_index: 1.01,
    region: "National",
    margin_pct: 32.0,
    units_sold: 45000,
    competitor_price: 3.19,
  },
]);

// =============================
// 3) PROMOTIONS
//    (Promotions page cards & charts)
// =============================

db.promotions.insertMany([
  {
    name: "Spring Bubbles 10% Off",
    product_id: sparklingId,
    channel: "Retail",
    start_date: "2024-04-10",
    end_date: "2024-04-24",
    discount_pct: 10,
    revenue_lift_pct: 11.5,
    roi: 2.8,
    cannibalization_pct: 4.0,
    duration_days: 14,
    status: "completed",
  },
  {
    name: "Energy Launch 15% Off",
    product_id: energyId,
    channel: "Retail",
    start_date: "2024-05-01",
    end_date: "2024-05-14",
    discount_pct: 15,
    revenue_lift_pct: 18.0,
    roi: 3.5,
    cannibalization_pct: 6.0,
    duration_days: 14,
    status: "completed",
  },
  {
    name: "Cookie Weekend Bundle",
    product_id: cookiesId,
    channel: "E-commerce",
    start_date: "2024-06-07",
    end_date: "2024-06-09",
    discount_pct: 12,
    revenue_lift_pct: 9.3,
    roi: 2.1,
    cannibalization_pct: 3.0,
    duration_days: 3,
    status: "planned",
  },
]);

// =============================
// 4) DEMAND FORECASTS
//    (Forecasting page charts)
// =============================

db.demand_forecasts.insertMany([
  // Historical for Sparkling Water (is_forecast: false)
  {
    product_id: sparklingId,
    forecast_date: "2024-01-01",
    actual_demand: 60000,
    predicted_demand: 59000,
    is_forecast: false,
    seasonality_index: 0.95,
    trend_component: 58000,
  },
  {
    product_id: sparklingId,
    forecast_date: "2024-02-01",
    actual_demand: 65000,
    predicted_demand: 64000,
    is_forecast: false,
    seasonality_index: 0.98,
    trend_component: 60000,
  },
  {
    product_id: sparklingId,
    forecast_date: "2024-03-01",
    actual_demand: 70000,
    predicted_demand: 69000,
    is_forecast: false,
    seasonality_index: 1.02,
    trend_component: 62000,
  },

  // Future forecasts for Sparkling Water (is_forecast: true)
  {
    product_id: sparklingId,
    forecast_date: "2024-04-01",
    actual_demand: null,
    predicted_demand: 72000,
    is_forecast: true,
    seasonality_index: 1.04,
    trend_component: 64000,
  },
  {
    product_id: sparklingId,
    forecast_date: "2024-05-01",
    actual_demand: null,
    predicted_demand: 75000,
    is_forecast: true,
    seasonality_index: 1.05,
    trend_component: 66000,
  },

  // Historical for Energy Drink
  {
    product_id: energyId,
    forecast_date: "2024-01-01",
    actual_demand: 40000,
    predicted_demand: 39500,
    is_forecast: false,
    seasonality_index: 0.93,
    trend_component: 39000,
  },
  {
    product_id: energyId,
    forecast_date: "2024-02-01",
    actual_demand: 43000,
    predicted_demand: 42500,
    is_forecast: false,
    seasonality_index: 0.96,
    trend_component: 40500,
  },
]);

// =============================
// 5) ASSORTMENT DATA
//    (Assortment page table & charts)
// =============================

db.assortment_data.insertMany([
  {
    product_id: sparklingId,
    channel: "Retail",
    revenue: 250000,
    revenue_growth_pct: 9.8,
    market_share_pct: 7.5,
    category_mix_pct: 14.0,
    units_sold: 180000,
    recommendation: "keep",
  },
  {
    product_id: energyId,
    channel: "Retail",
    revenue: 310000,
    revenue_growth_pct: 12.3,
    market_share_pct: 6.8,
    category_mix_pct: 16.0,
    units_sold: 190000,
    recommendation: "add",
  },
  {
    product_id: cookiesId,
    channel: "E-commerce",
    revenue: 180000,
    revenue_growth_pct: 4.5,
    market_share_pct: 3.2,
    category_mix_pct: 10.0,
    units_sold: 90000,
    recommendation: "review",
  },
]);

"Done inserting extra RGM sample data.";