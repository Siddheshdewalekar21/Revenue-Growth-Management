// Select (or create) the database
use('rgm_demo')

// OPTIONAL: clean old data if you're re-running this script
db.dropDatabase();
use('rgm_demo')

// --- 1) Users (for future backend use) ---

db.users.insertOne({
  email: "test@gamil.com",
  // For demo only; in real apps store a hash, not plain text
  password: "test123",
  role: "admin",
  createdAt: new Date()
});

// --- 2) Products ---

const products = db.products.insertMany([
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
  }
]).insertedIds;

// Helper: get product IDs
const [p1, p2, p3] = Object.values(products);

// --- 3) Pricing records (historical pricing & revenue) ---

db.pricing_records.insertMany([
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
  }
]);

// --- 4) Promotions (historical promo performance) ---

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
  }
]);

// --- 5) Demand forecasts (historical + forecast) ---

db.demand_forecasts.insertMany([
  // Historical for p1
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
  }
]);

// --- 6) Assortment data (SKU performance & recommendations) ---

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
    product_id: p3,
    channel: "E-commerce",
    revenue: 150000,
    revenue_growth_pct: 8.5,
    market_share_pct: 6.1,
    category_mix_pct: 12.0,
    recommendation: "delist"
  }
]);

// Quick sanity checks
db.users.find();
db.products.find();
db.pricing_records.find();
db.promotions.find();
db.demand_forecasts.find();
db.assortment_data.find();