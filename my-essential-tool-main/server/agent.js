import OpenAI from "openai";
import { ObjectId } from "mongodb";
import { getDb } from "./mongoClient.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

function ensureApiKey() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set in environment variables");
  }
}

export async function runPromotionAgent({ productId, question }) {
  ensureApiKey();

  const db = getDb();
  const productObjectId = productId ? new ObjectId(String(productId)) : null;

  const product = productObjectId
    ? await db.collection("products").findOne({ _id: productObjectId })
    : null;

  const promotions = await db
    .collection("promotions")
    .find(productObjectId ? { product_id: productObjectId } : {})
    .sort({ start_date: 1 })
    .toArray();

  const payload = {
    product: product || null,
    promotions,
  };

  const completion = await openai.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are a senior Revenue Growth Management (RGM) analyst. " +
          "You get JSON data about historical promotions and product performance, " +
          "and you must explain promotion performance, risks, and recommend next best promotions in clear business language.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              question ||
              "Analyze the promotion performance and recommend the next best promotion setup for this product.",
          },
          {
            type: "text",
            text: `Here is the JSON data:\n${JSON.stringify(payload, null, 2)}`,
          },
        ],
      },
    ],
  });

  return completion.choices[0]?.message?.content ?? "";
}

export async function runForecastingAgent({ productId, question }) {
  ensureApiKey();

  const db = getDb();
  const productObjectId = productId ? new ObjectId(String(productId)) : null;

  if (!productObjectId) {
    throw new Error("productId is required for forecasting agent");
  }

  const product = await db.collection("products").findOne({ _id: productObjectId });

  const forecasts = await db
    .collection("demand_forecasts")
    .find({ product_id: productObjectId })
    .sort({ forecast_date: 1 })
    .toArray();

  const payload = {
    product,
    forecasts,
  };

  const completion = await openai.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are an expert demand forecasting and supply planning analyst. " +
          "You receive JSON with historical and forecasted demand, including accuracy metrics fields. " +
          "Explain patterns, risks (e.g., stockouts, overstock), and provide clear recommendations.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              question ||
              "Review the demand history and forecasts and describe key trends, risks, and recommendations.",
          },
          {
            type: "text",
            text: `Here is the JSON data:\n${JSON.stringify(payload, null, 2)}`,
          },
        ],
      },
    ],
  });

  return completion.choices[0]?.message?.content ?? "";
}

