
-- Helper function
CREATE OR REPLACE FUNCTION public.is_authenticated_user()
RETURNS boolean AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  region TEXT NOT NULL DEFAULT 'National',
  unit_cost NUMERIC(10,2) NOT NULL,
  current_price NUMERIC(10,2) NOT NULL,
  competitor_price NUMERIC(10,2),
  recommended_price NUMERIC(10,2),
  margin_pct NUMERIC(5,2),
  price_elasticity NUMERIC(5,3) DEFAULT -1.5,
  channel TEXT NOT NULL DEFAULT 'Retail',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pricing records (historical pricing data)
CREATE TABLE public.pricing_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  price NUMERIC(10,2) NOT NULL,
  competitor_price NUMERIC(10,2),
  price_index NUMERIC(5,2),
  revenue NUMERIC(12,2),
  units_sold INTEGER,
  margin_pct NUMERIC(5,2),
  effective_date DATE NOT NULL,
  region TEXT NOT NULL DEFAULT 'National',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Promotions table
CREATE TABLE public.promotions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  discount_pct NUMERIC(5,2) NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 7,
  channel TEXT NOT NULL DEFAULT 'Retail',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  revenue_lift_pct NUMERIC(5,2),
  roi NUMERIC(5,2),
  cannibalization_pct NUMERIC(5,2),
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Assortment data
CREATE TABLE public.assortment_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  revenue NUMERIC(12,2) NOT NULL,
  revenue_growth_pct NUMERIC(5,2),
  units_sold INTEGER,
  market_share_pct NUMERIC(5,2),
  recommendation TEXT CHECK (recommendation IN ('add', 'keep', 'delist', 'review')),
  category_mix_pct NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Demand forecasts
CREATE TABLE public.demand_forecasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  forecast_date DATE NOT NULL,
  actual_demand INTEGER,
  predicted_demand INTEGER NOT NULL,
  is_forecast BOOLEAN NOT NULL DEFAULT false,
  seasonality_index NUMERIC(5,3),
  trend_component NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assortment_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demand_forecasts ENABLE ROW LEVEL SECURITY;

-- RLS policies: authenticated users can read all data
CREATE POLICY "Authenticated users can read products" ON public.products FOR SELECT USING (public.is_authenticated_user());
CREATE POLICY "Authenticated users can read pricing_records" ON public.pricing_records FOR SELECT USING (public.is_authenticated_user());
CREATE POLICY "Authenticated users can read promotions" ON public.promotions FOR SELECT USING (public.is_authenticated_user());
CREATE POLICY "Authenticated users can read assortment_data" ON public.assortment_data FOR SELECT USING (public.is_authenticated_user());
CREATE POLICY "Authenticated users can read demand_forecasts" ON public.demand_forecasts FOR SELECT USING (public.is_authenticated_user());
