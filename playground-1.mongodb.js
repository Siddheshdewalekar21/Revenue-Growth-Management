// Use the same DB name your backend uses
use('rgm_tool_prod')

// CAREFUL: clears old data in this DB so we start clean
db.dropDatabase();
use('rgm_tool_prod')

// --- 1) Users (for future auth/backend) ---

db.users.insertOne({
  email: "test@gamil.com",
  // DEMO ONLY – real apps must hash passwords
  password: "test123",
  role: "admin",
  createdAt: new Date()
});

// --- 2) Products (master data used across dashboards) ---

const { insertedIds } = db.products.insertMany([
  {
    name: "Sparkle Cola 330ml",
    category: "Beverages",
    current_price: 1.49,
    recommended_price: 1.59,
    competitor_price: 1.69,
    margin_pct: 32.5,
    price_elasticity: -1.8
  },
  {
    name: "Sparkle Cola Zero 330ml",
    category: "Beverages",
    current_price: 1.59,
    recommended_price: 1.69,
    competitor_price: 1.79,
    margin_pct: 34.1,
    price_elasticity: -1.5
  },
  {
    name: "Citrus Splash 1L",
    category: "Beverages",
    current_price: 2.99,
    recommended_price: 3.09,
    competitor_price: 3.19,
    margin_pct: 28.7,
    price_elasticity: -2.2
  },
  {
    name: "Energy Max 500ml",
    category: "Energy Drinks",
    current_price: 2.49,
    recommended_price: 2.59,
    competitor_price: 2.79,
    margin_pct: 36.2,
    price_elasticity: -1.9
  },
  {
    name: "Pure Spring Water 1.5L",
    category: "Water",
    current_price: 0.99,
    recommended_price: 1.05,
    competitor_price: 1.09,
    margin_pct: 22.4,
    price_elasticity: -0.8
  }
]);

const [p1, p2, p3, p4, p5] = Object.values(insertedIds);

// --- 3) Pricing records (for Pricing page KPIs/charts) ---

db.pricing_records.insertMany([
  // Sparkle Cola 330ml
  {
    product_id: p1,
    effective_date: ISODate("2025-01-01T00:00:00Z"),
    revenue: 125000,
    price_index: 98.5
  },
  {
    product_id: p1,
    effective_date: ISODate("2025-02-01T00:00:00Z"),
    revenue: 132500,
    price_index: 99.2
  },
  {
    product_id: p1,
    effective_date: ISODate("2025-03-01T00:00:00Z"),
    revenue: 141000,
    price_index: 100.1
  },

  // Sparkle Cola Zero 330ml
  {
    product_id: p2,
    effective_date: ISODate("2025-01-01T00:00:00Z"),
    revenue: 98000,
    price_index: 101.3
  },
  {
    product_id: p2,
    effective_date: ISODate("2025-02-01T00:00:00Z"),
    revenue: 104500,
    price_index: 100.7
  },
  {
    product_id: p2,
    effective_date: ISODate("2025-03-01T00:00:00Z"),
    revenue: 112000,
    price_index: 99.9
  },

  // Citrus Splash 1L
  {
    product_id: p3,
    effective_date: ISODate("2025-01-01T00:00:00Z"),
    revenue: 210000,
    price_index: 97.4
  },
  {
    product_id: p3,
    effective_date: ISODate("2025-02-01T00:00:00Z"),
    revenue: 224000,
    price_index: 98.1
  },

  // Energy Max 500ml
  {
    product_id: p4,
    effective_date: ISODate("2025-01-01T00:00:00Z"),
    revenue: 158000,
    price_index: 102.2
  },
  {
    product_id: p4,
    effective_date: ISODate("2025-02-01T00:00:00Z"),
    revenue: 169500,
    price_index: 101.6
  },

  // Pure Spring Water 1.5L
  {
    product_id: p5,
    effective_date: ISODate("2025-01-01T00:00:00Z"),
    revenue: 90000,
    price_index: 95.7
  },
  {
    product_id: p5,
    effective_date: ISODate("2025-02-01T00:00:00Z"),
    revenue: 95000,
    price_index: 96.2
  }
]);

// --- 4) Promotions (for Promotions page KPIs/charts) ---

db.promotions.insertMany([
  {
    product_id: p1,
    name: "New Year Cola Burst",
    status: "active",
    roi: 3.2,
    revenue_lift_pct: 14.5,
    start_date: ISODate("2025-01-05T00:00:00Z"),
    end_date: ISODate("2025-01-18T00:00:00Z"),
    discount_pct: 20,
    channel: "Retail"
  },
  {
    product_id: p2,
    name: "Zero Sugar Campaign",
    status: "completed",
    roi: 2.6,
    revenue_lift_pct: 11.3,
    start_date: ISODate("2024-11-10T00:00:00Z"),
    end_date: ISODate("2024-11-24T00:00:00Z"),
    discount_pct: 15,
    channel: "E-commerce"
  },
  {
    product_id: p3,
    name: "Family Pack Week",
    status: "planned",
    roi: 3.9,
    revenue_lift_pct: 18.7,
    start_date: ISODate("2025-03-01T00:00:00Z"),
    end_date: ISODate("2025-03-10T00:00:00Z"),
    discount_pct: 10,
    channel: "Foodservice"
  },
  {
    product_id: p4,
    name: "Energy Max Nightlife",
    status: "completed",
    roi: 4.1,
    revenue_lift_pct: 21.4,
    start_date: ISODate("2024-09-01T00:00:00Z"),
    end_date: ISODate("2024-09-14T00:00:00Z"),
    discount_pct: 18,
    channel: "Retail"
  }
]);

// --- 5) Demand forecasts (for Forecasting page) ---

db.demand_forecasts.insertMany([
  // Historical for p1 (Sparkle Cola)
  {
    product_id: p1,
    forecast_date: "2024-10-01",
    actual_demand: 82000,
    predicted_demand: 80000,
    is_forecast: false,
    seasonality_index: 1.05,
    trend_component: 78000
  },
  {
    product_id: p1,
    forecast_date: "2024-11-01",
    actual_demand: 91000,
    predicted_demand: 89000,
    is_forecast: false,
    seasonality_index: 1.12,
    trend_component: 84000
  },
  {
    product_id: p1,
    forecast_date: "2024-12-01",
    actual_demand: 104000,
    predicted_demand: 101000,
    is_forecast: false,
    seasonality_index: 1.25,
    trend_component: 88000
  },
  // Future forecast for p1
  {
    product_id: p1,
    forecast_date: "2025-01-01",
    actual_demand: null,
    predicted_demand: 97000,
    is_forecast: true,
    seasonality_index: 1.10,
    trend_component: 88000
  },
  {
    product_id: p1,
    forecast_date: "2025-02-01",
    actual_demand: null,
    predicted_demand: 93000,
    is_forecast: true,
    seasonality_index: 1.03,
    trend_component: 90000
  },

  // Historical for p2 (Zero)
  {
    product_id: p2,
    forecast_date: "2024-10-01",
    actual_demand: 60000,
    predicted_demand: 59000,
    is_forecast: false,
    seasonality_index: 0.98,
    trend_component: 58000
  },
  {
    product_id: p2,
    forecast_date: "2024-11-01",
    actual_demand: 64000,
    predicted_demand: 63000,
    is_forecast: false,
    seasonality_index: 1.02,
    trend_component: 61000
  },
  {
    product_id: p2,
    forecast_date: "2024-12-01",
    actual_demand: 70000,
    predicted_demand: 69000,
    is_forecast: false,
    seasonality_index: 1.10,
    trend_component: 65000
  },
  // Future forecast for p2
  {
    product_id: p2,
    forecast_date: "2025-01-01",
    actual_demand: null,
    predicted_demand: 68000,
    is_forecast: true,
    seasonality_index: 1.05,
    trend_component: 66000
  }
]);

// --- 6) Assortment data (for Assortment page) ---

db.assortment_data.insertMany([
  {
    product_id: p1,
    channel: "Retail",
    revenue: 350000,
    revenue_growth_pct: 12.4,
    market_share_pct: 18.2,
    category_mix_pct: 32.5,
    recommendation: "keep"
  },
  {
    product_id: p1,
    channel: "E-commerce",
    revenue: 120000,
    revenue_growth_pct: 9.8,
    market_share_pct: 6.3,
    category_mix_pct: 10.5,
    recommendation: "add"
  },
  {
    product_id: p2,
    channel: "Retail",
    revenue: 180000,
    revenue_growth_pct: 21.1,
    market_share_pct: 9.6,
    category_mix_pct: 18.0,
    recommendation: "add"
  },
  {
    product_id: p3,
    channel: "Foodservice",
    revenue: 420000,
    revenue_growth_pct: -3.2,
    market_share_pct: 14.3,
    category_mix_pct: 24.0,
    recommendation: "review"
  },
  {
    product_id: p4,
    channel: "Retail",
    revenue: 260000,
    revenue_growth_pct: 15.7,
    market_share_pct: 11.4,
    category_mix_pct: 9.5,
    recommendation: "keep"
  },
  {
    product_id: p5,
    channel: "Retail",
    revenue: 95000,
    revenue_growth_pct: 4.1,
    market_share_pct: 5.2,
    category_mix_pct: 5.0,
    recommendation: "delist"
  }
]);

// Quick sanity checks (you should see multiple docs in each collection)
db.users.find();
db.products.find();
db.pricing_records.find();
db.promotions.find();
db.demand_forecasts.find();
db.assortment_data.find();