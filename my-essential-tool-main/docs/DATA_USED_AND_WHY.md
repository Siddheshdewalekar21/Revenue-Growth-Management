# Data Used and Why (RGM Project)

## 1. Purpose

This document explains:

1. What data your project uses.
2. Why each data set is required.
3. How each data set supports pricing, promotions, assortment, and forecasting decisions.

Your current sample portfolio is enterprise-style (PepsiCo-focused SKUs such as cola, sparkling water, chips, sports drinks, and fountain syrup packs).

## 2. Data Sources

| Source | What it stores | Why used |
|---|---|---|
| MongoDB (`rgm_tool_prod`) | Core business and ML data | Main analytics and prediction data store for all modules |
| Supabase Auth | User login/session | Access control for protected dashboards |
| Supabase tables (`products`, `assortment_data`) | Overview page data | Executive overview metrics on home page |

## 3. MongoDB Collections and Why

| Collection | Key data fields | Used by | Why this data is needed |
|---|---|---|---|
| `products` | `name`, `category`, `subcategory`, `channel`, `region`, `unit_cost`, `current_price`, `competitor_price`, `margin_pct`, `price_elasticity` | Pricing, Assortment, Forecasting | Product master context is required to price correctly, compare competitors, compute margin, and translate demand into revenue/profit |
| `pricing_records` | `price`, `units_sold`, `revenue`, `price_index`, `margin_pct`, `cost_of_goods_sold`, `promo_spend`, `logistics_cost`, `returns_loss`, `shrinkage_loss`, `loss_amount`, `gross_profit`, `net_profit` | Pricing | Historical price-performance pairs train the pricing model and quantify margin leakage/loss at each price level |
| `promotions` | `discount_pct`, `duration_days`, `channel`, `event_name`, `revenue_lift_pct`, `roi`, `cannibalization_pct`, `base_revenue`, `incremental_revenue`, `promo_spend`, `incremental_profit`, `incremental_loss` | Promotions | Needed to recommend promo design and simulate expected ROI, lift, cannibalization, and incremental P&L |
| `event_calendar` | `event_name`, `event_date`, `event_time`, `display_name` | Promotions (upcoming events) | Links future events with historical event performance to plan better promotions before launch |
| `assortment_data` | `revenue`, `revenue_growth_pct`, `units_sold`, `market_share_pct`, `category_mix_pct`, `recommendation`, `gross_profit`, `net_profit`, `loss_amount`, `profit_margin_pct` | Assortment | Supports add/keep/delist/review decisions using growth + profitability + loss signals by channel |
| `demand_forecasts` | `forecast_date`, `actual_demand`, `predicted_demand`, `is_forecast`, `seasonality_index`, `trend_component`, `actual_revenue`, `predicted_revenue`, `actual_profit`, `predicted_profit`, `actual_loss`, `predicted_loss` | Forecasting | Converts demand forecasting into financial forecasting so teams can plan revenue/profit/loss impact |

## 4. ML Features and Targets by Module

| Module | Main training features | Target learned/predicted | Why this is useful |
|---|---|---|---|
| Pricing ML (`ml_pricing.py`) | Price, competitor price, price index, margin, unit cost, category/subcategory/channel/region, loss rate, profit margin | Predicted `units_sold`, then derived revenue/profit/loss at candidate prices | Recommends price changes that maximize net profit, not just volume |
| Promotion ML (`ml_promotion.py`) | Discount, duration, channel, event name | ROI, revenue lift, cannibalization, incremental profit, incremental loss | Finds best promotion mix and quantifies upside vs risk before execution |
| Assortment ML (`ml_assortment.py`) | Revenue, growth, units, market share, category mix, gross/net profit, loss ratio, channel, product context | Class label: `add`, `keep`, `delist`, `review` | Makes SKU decisions data-driven and consistent across channels |
| Forecast ML (`ml_forecast.py`) | Historical month-indexed demand series | Future demand for selected horizon | Enables proactive inventory/commercial planning and financial projection |

## 5. Why Profit and Loss Fields Are Included Everywhere

The project intentionally enriches each domain with P&L fields so decisions are financially grounded:

1. Pricing: avoid high-revenue but low-profit prices.
2. Promotions: avoid ROI illusions caused by cannibalization and spend.
3. Assortment: avoid keeping SKUs that consume space but leak margin.
4. Forecasting: avoid demand-only planning by forecasting revenue/profit/loss together.

## 6. Data Handling Logic (Current Implementation)

| Case | Current handling |
|---|---|
| Missing financial fields | Backfilled with safe formulas (for example COGS from unit cost and units, loss from returns/shrinkage proxies) |
| Negative net profit | Converted into additional `loss_amount` and net profit floored to zero |
| Sparse ML data | API falls back to rule/data-driven logic for pricing/promotions/assortment; forecasting stays ML-only |

## 7. Business Impact of This Data Design

This data design supports your objective to help enterprises maximize revenue and reduce margin leakage because it:

1. Joins commercial actions with financial outcomes in one model.
2. Preserves module-specific detail while keeping shared product context.
3. Enables explainable recommendations using historical evidence.
4. Creates a closed loop where new outcomes become better training data.




## 8. Data Collections Required: 6 Main Collections
1. Products (Master Data)
Fields: name, category, subcategory, channel, region, unit_cost, current_price, competitor_price, margin_pct, price_elasticity
Why: Product context for pricing decisions, competitor analysis, margin computation, and demand translation to revenue/profit
2. Pricing Records (Historical Performance)
Fields: price, units_sold, revenue, price_index, margin_pct, COGS, promo_spend, logistics_cost, returns_loss, shrinkage_loss, gross_profit, net_profit
Why: Trains pricing ML model to find the best price that maximizes net profit (not just volume)
3. Promotions (Past Campaigns)
Fields: discount_pct, duration_days, channel, event_name, revenue_lift_pct, ROI, cannibalization_pct, incremental_revenue, promo_spend, incremental_profit
Why: Recommends future promotions with expected ROI before launch
4. Event Calendar (Upcoming Events)
Fields: event_name, event_date, event_time, display_name
Why: Links future events with historical performance for better promotion planning
5. Assortment Data (SKU Performance)
Fields: revenue, revenue_growth_pct, units_sold, market_share_pct, gross_profit, net_profit, loss_amount, profit_margin_pct
Why: Supports add/keep/delist/review decisions using growth, profitability, and loss signals
6. Demand Forecasts (Financial Projections)
Fields: forecast_date, actual_demand, predicted_demand, seasonality_index, trend_component, actual_revenue, predicted_revenue, actual_profit, predicted_profit, actual_loss, predicted_loss
Why: Converts demand into revenue/profit/loss forecasts for proactive planning