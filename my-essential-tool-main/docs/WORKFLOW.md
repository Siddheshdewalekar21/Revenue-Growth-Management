# RGM Tool – Complete Workflow

This document describes the end-to-end workflow and how data flows through the system.

---

## 1. High-level flow

```
User → Login (Supabase Auth) → Protected App → [Overview | Pricing | Promotions | Assortment | Forecasting]
         ↓                              ↓
    Session / JWT              Frontend (React + Vite)
                                        ↓
                    ┌───────────────────┴───────────────────┐
                    ↓                                       ↓
              Node API (port 4000)                    Supabase
                    ↓                                       ↓
              MongoDB (6 collections)              Auth + (Overview data)
```

---

## 2. User journey

| Step | Action | What happens |
|------|--------|----------------|
| 1 | User opens app | Router shows `/auth` (login) or redirects to login if not authenticated. |
| 2 | User logs in | Email/password sent to **Supabase Auth**. On success, session is stored; user is redirected to `/` (Overview). |
| 3 | User browses | **ProtectedLayout** wraps `/`, `/pricing`, `/promotions`, `/assortment`, `/forecasting`. Sidebar and top bar are shown. |
| 4 | Overview (`/`) | Fetches **products** and **assortment_data** from **Supabase**. Shows KPIs (avg price, margin, revenue, growth) and revenue-by-category chart. |
| 5 | Pricing (`/pricing`) | Fetches **products** and **pricing_records** from **Node API** (MongoDB). Shows price table, elasticity, competitor comparison. |
| 6 | Promotions (`/promotions`) | Fetches **promotions** and **promotions/upcoming** from **Node API**. Shows KPIs, scenario builder, scenario comparison table, **Upcoming promotions** (date/time + reference from past), and historical performance chart. |
| 7 | Assortment (`/assortment`) | Fetches **assortment** (with product names) from **Node API** (MongoDB). Shows SKU matrix, recommendations, category mix. |
| 8 | Forecasting (`/forecasting`) | Fetches **products** and **forecasts** from **Node API**. Can **POST /api/forecasts/generate** to create new forecasts. Shows demand time-series and seasonality. |

---

## 3. Data flow (backend)

| Source | Used by | Purpose |
|--------|---------|---------|
| **MongoDB: products** | `/api/products` | Master product list for Pricing, Assortment, Forecasting. |
| **MongoDB: pricing_records** | `/api/pricing-records` | Historical pricing and performance for Pricing dashboard. |
| **MongoDB: promotions** | `/api/promotions`, `/api/promotions/upcoming` | All promotions for simulator + past promos matched by `event_name` for upcoming. |
| **MongoDB: event_calendar** | `/api/promotions/upcoming` | Future (and past) events with date/time; combined with promotions to build “Upcoming promotions” list. |
| **MongoDB: assortment_data** | `/api/assortment` | Channel/SKU performance and recommendations for Assortment page. |
| **MongoDB: demand_forecasts** | `/api/forecasts`, `/api/forecasts/generate` | Historical and generated demand forecasts for Forecasting page. |
| **Supabase Auth** | Login, ProtectedLayout | User identity and session. |
| **Supabase: products, assortment_data** | Overview (Index) | Optional source for Overview KPIs (can be switched to Node API). |

---

## 4. Upcoming promotions workflow

```
event_calendar (event_date ≥ today)  →  for each event:
         +                                    ↓
promotions (event_name match, end_date < today)  →  pick latest past promo as “reference”
         ↓
API returns: event_date, event_time, display_name + reference_roi, reference_revenue_lift_pct, reference_name, etc.
         ↓
Promotions page “Upcoming promotions” table
```

---

## 5. Diagram (Mermaid – export to PNG)

You can copy the block below into [Mermaid Live Editor](https://mermaid.live) or any Markdown viewer that supports Mermaid to view or export as PNG.

```mermaid
flowchart TB
    subgraph User["👤 User"]
        A[Login Email/Password]
    end

    subgraph Auth["Supabase Auth"]
        B[Validate → Session]
    end

    subgraph Frontend["Frontend (React + Vite)"]
        C[Overview]
        D[Pricing]
        E[Promotions]
        F[Assortment]
        G[Demand Forecasting]
    end

    subgraph NodeAPI["Node API (Express :4000)"]
        H["/api/products"]
        I["/api/pricing-records"]
        J["/api/promotions"]
        K["/api/promotions/upcoming"]
        L["/api/assortment"]
        M["/api/forecasts"]
    end

    subgraph MongoDB[(MongoDB)]
        N[products]
        O[pricing_records]
        P[promotions]
        Q[event_calendar]
        R[assortment_data]
        S[demand_forecasts]
    end

    A --> B
    B --> Frontend
    C --> NodeAPI
    D --> NodeAPI
    E --> NodeAPI
    F --> NodeAPI
    G --> NodeAPI
    NodeAPI --> MongoDB
    E -.->|event_calendar + promotions by event_name| K
```

---

## 6. Run order (for local dev)

1. Start **MongoDB** (local or cloud).
2. Start **Node API**: `npm run server` (from `my-essential-tool-main`).
3. Start **Frontend**: `npm run dev` (from `my-essential-tool-main`).
4. (Optional) Seed data: `npm run seed:mongo` from project root or from `my-essential-tool-main`.

Supabase is used for auth (and optionally Overview); no separate “start” step for Supabase if using hosted project.

---

## 7. Workflow diagram PNG

A digital workflow diagram has been generated and is shown above in this chat. You can:

- **Save it** from the chat attachment to your project (e.g. `my-essential-tool-main/docs/rgm-workflow-diagram.png`).
- **Regenerate a PNG** using the Mermaid diagram in Section 5 at [mermaid.live](https://mermaid.live) (export as PNG/SVG).

This document and the diagram together describe the **complete workflow** of the RGM tool.
