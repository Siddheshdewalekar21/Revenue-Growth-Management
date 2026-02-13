import express from "express";
import cors from "cors";
import { config as loadEnv } from "dotenv";
import { ObjectId } from "mongodb";
import { connectToDatabase, getDb } from "./mongoClient.js";
import { runPromotionAgent, runForecastingAgent } from "./agent.js";

loadEnv();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "rgm-backend", time: new Date().toISOString() });
});

app.get("/api/products", async (req, res) => {
  try {
    const db = getDb();
    const products = await db.collection("products").find({}).toArray();
    res.json(products);
  } catch (err) {
    console.error("Error fetching products", err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

app.get("/api/pricing-records", async (req, res) => {
  try {
    const db = getDb();
    const records = await db
      .collection("pricing_records")
      .find({})
      .sort({ effective_date: 1 })
      .toArray();
    res.json(records);
  } catch (err) {
    console.error("Error fetching pricing records", err);
    res.status(500).json({ error: "Failed to fetch pricing records" });
  }
});

app.get("/api/promotions", async (req, res) => {
  try {
    const db = getDb();
    const promos = await db.collection("promotions").find({}).toArray();
    res.json(promos);
  } catch (err) {
    console.error("Error fetching promotions", err);
    res.status(500).json({ error: "Failed to fetch promotions" });
  }
});

app.get("/api/forecasts", async (req, res) => {
  try {
    const db = getDb();
    const { productId } = req.query;
    const query = productId ? { product_id: new ObjectId(String(productId)) } : {};
    const forecasts = await db
      .collection("demand_forecasts")
      .find(query)
      .sort({ forecast_date: 1 })
      .toArray();
    res.json(forecasts);
  } catch (err) {
    console.error("Error fetching forecasts", err);
    res.status(500).json({ error: "Failed to fetch forecasts" });
  }
});

app.post("/api/forecasts/generate", async (req, res) => {
  try {
    const { productId, horizonMonths = 6 } = req.body || {};

    if (!productId) {
      return res.status(400).json({ error: "productId is required" });
    }

    const db = getDb();
    const productObjectId = new ObjectId(String(productId));
    const collection = db.collection("demand_forecasts");

    // Use historical points (is_forecast: false) as training data
    const historical = await collection
      .find({ product_id: productObjectId, is_forecast: false })
      .sort({ forecast_date: 1 })
      .toArray();

    if (!historical.length) {
      return res.status(400).json({ error: "No historical demand data for this product" });
    }

    // Simple linear regression on time index vs actual demand
    const n = historical.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    const values = historical.map((point, index) => {
      const y =
        typeof point.actual_demand === "number" && point.actual_demand > 0
          ? Number(point.actual_demand)
          : Number(point.predicted_demand || 0);
      const x = index;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
      return { x, y };
    });

    const denominator = n * sumX2 - sumX * sumX;
    const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
    const intercept = n !== 0 ? (sumY - slope * sumX) / n : 0;

    const lastHistorical = historical[historical.length - 1];
    const lastDate = new Date(lastHistorical.forecast_date);

    function addMonths(date, months) {
      const d = new Date(date.getTime());
      d.setMonth(d.getMonth() + months);
      return d;
    }

    const horizon = Number(horizonMonths) > 0 ? Number(horizonMonths) : 6;

    const newForecasts = [];
    for (let k = 1; k <= horizon; k++) {
      const t = (values.length - 1) + k;
      let predicted = slope * t + intercept;
      if (!Number.isFinite(predicted) || predicted < 0) {
        predicted = 0;
      }

      const forecastDate = addMonths(lastDate, k).toISOString().slice(0, 10);

      newForecasts.push({
        product_id: productObjectId,
        forecast_date: forecastDate,
        actual_demand: null,
        predicted_demand: Math.round(predicted),
        is_forecast: true,
        seasonality_index: 1,
        trend_component: Math.round(predicted),
      });
    }

    // Replace existing forecasts for this product
    await collection.deleteMany({ product_id: productObjectId, is_forecast: true });
    if (newForecasts.length) {
      await collection.insertMany(newForecasts);
    }

    res.json({ status: "ok", inserted: newForecasts.length });
  } catch (err) {
    console.error("Error generating forecasts", err);
    res.status(500).json({ error: "Failed to generate forecasts" });
  }
});

app.get("/api/assortment", async (req, res) => {
  try {
    const db = getDb();
    const assortment = await db.collection("assortment_data").find({}).toArray();
    const products = await db.collection("products").find({}).toArray();

    const productMap = new Map(products.map((p) => [String(p._id), p]));

    const withNames = assortment.map((a) => {
      const product = productMap.get(String(a.product_id));
      return {
        ...a,
        productName: product?.name || "Unknown",
      };
    });

    res.json(withNames);
  } catch (err) {
    console.error("Error fetching assortment data", err);
    res.status(500).json({ error: "Failed to fetch assortment data" });
  }
});

app.post("/api/agent/promotion", async (req, res) => {
  try {
    const { productId, question } = req.body || {};
    const answer = await runPromotionAgent({ productId, question });
    res.json({ answer });
  } catch (err) {
    console.error("Error in promotion agent", err);
    res.status(500).json({ error: "Failed to run promotion agent" });
  }
});

app.post("/api/agent/forecasting", async (req, res) => {
  try {
    const { productId, question } = req.body || {};
    if (!productId) {
      return res.status(400).json({ error: "productId is required" });
    }
    const answer = await runForecastingAgent({ productId, question });
    res.json({ answer });
  } catch (err) {
    console.error("Error in forecasting agent", err);
    res.status(500).json({ error: "Failed to run forecasting agent" });
  }
});

connectToDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`RGM backend listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  });

