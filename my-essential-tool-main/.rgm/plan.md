

# AI-Driven Revenue Growth Management (RGM) System

## Overview
A comprehensive analytics dashboard for CPG and Foodservice companies to optimize pricing, promotions, assortment, and demand forecasting — powered by a Supabase backend with authentication.

---

## 1. Authentication & Layout
- Simple email/password login page
- Protected app shell with a sidebar navigation (Pricing, Promotions, Assortment, Demand Forecasting)
- Top bar with user info and logout
- Clean, professional dark/light theme suited for enterprise analytics

## 2. Pricing Dashboard
- KPI cards: Average Price, Margin %, Revenue, Price Index vs Competitors
- Price elasticity chart showing how demand changes with price adjustments
- Product-level pricing table with current price, recommended price, and expected revenue impact
- Competitor price comparison visualization
- Filters by product category, region, and time period

## 3. Promotion Simulator
- Interactive form to configure promotion scenarios (discount %, duration, channel)
- Real-time simulation results showing projected revenue lift, ROI, and cannibalization effects
- Side-by-side comparison of multiple promo scenarios
- Historical promotion performance chart
- Summary cards for best-performing promo types

## 4. Assortment Analysis
- SKU performance matrix (revenue vs growth) as a scatter chart
- Channel-level assortment recommendations (add/keep/delist SKUs)
- Category mix visualization (treemap or pie chart)
- Filterable product table with performance metrics and AI recommendation badges

## 5. Demand Forecasting
- Time-series line chart showing historical sales and forecasted demand
- Forecast accuracy metrics (MAPE, RMSE displayed as KPIs)
- Seasonality and trend decomposition visuals
- Product/category selector to drill into specific forecasts

## 6. Supabase Backend
- **Auth**: Email/password authentication
- **Database tables**: Products, pricing records, promotions, assortment data, demand forecasts
- **Row-Level Security**: Ensure authenticated users can access data
- **Seed data**: Pre-populated sample data for all dashboards so the app is immediately useful

## 7. Home/Overview Page
- Executive summary dashboard with top-level KPIs across all modules
- Quick-access cards linking to each section
- Recent activity or alerts feed

