-- MedMesh demand forecast at national scale, in BigQuery ML.
--
-- The prototype forecasts in-process because 1,350 facility-medicine pairs fit
-- comfortably in memory, and because a district office being able to run this
-- on a laptop with no cloud bill is a deployability argument, not a compromise.
--
-- A national rollout is a different shape: roughly 30,000 primary facilities in
-- India alone, times a few hundred medicines, is millions of series. At that
-- size the forecast belongs next to the data. This is that version, and it is
-- deliberately one statement rather than a pipeline.
--
-- ARIMA_PLUS handles the thing that matters here for free: it decomposes
-- seasonality per series. Season-blindness is the failure MedMesh exists to
-- correct, so a model that flattens the year would reproduce the very mistake.

-- ---------------------------------------------------------------------------
-- 1. Train one seasonal model per facility-medicine series.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE MODEL `medmesh.demand_forecast`
OPTIONS (
  MODEL_TYPE = 'ARIMA_PLUS',
  TIME_SERIES_TIMESTAMP_COL = 'date',
  TIME_SERIES_DATA_COL = 'units_dispensed',

  -- One model per facility-medicine pair, fitted in a single statement.
  TIME_SERIES_ID_COL = ['facility_id', 'drug_id'],

  -- Clinic days are lumpy and registers have gaps. Without this, a missing
  -- Sunday reads as zero demand rather than a closed dispensary.
  DATA_FREQUENCY = 'DAILY',
  HOLIDAY_REGION = 'IN',

  -- Malaria, respiratory and diarrhoeal demand all move on an annual cycle.
  -- Weekly seasonality is real too: Monday queues are not Thursday queues.
  AUTO_ARIMA = TRUE,
  DECOMPOSE_TIME_SERIES = TRUE,

  -- Stock-outs make demand look like zero when it was merely unmet. Left in,
  -- they teach the model that a facility which ran dry does not need the drug,
  -- which is precisely backwards and would starve it again next season.
  CLEAN_SPIKES_AND_DIPS = TRUE
) AS
SELECT
  facility_id,
  drug_id,
  date,
  units_dispensed
FROM `medmesh.consumption`
WHERE date BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 18 MONTH) AND CURRENT_DATE();

-- ---------------------------------------------------------------------------
-- 2. Forecast forward, and join to what is physically on the shelf.
-- ---------------------------------------------------------------------------
-- The output is the same shape the TypeScript engine produces, so the matcher
-- in src/lib/match.ts consumes either source unchanged.
WITH forecast AS (
  SELECT
    facility_id,
    drug_id,
    forecast_timestamp AS date,
    GREATEST(0, forecast_value) AS expected_units,
    GREATEST(0, prediction_interval_lower_bound) AS lower_bound,
    prediction_interval_upper_bound AS upper_bound
  FROM ML.FORECAST(
    MODEL `medmesh.demand_forecast`,
    STRUCT(180 AS horizon, 0.8 AS confidence_level)
  )
),

daily_demand AS (
  SELECT
    facility_id,
    drug_id,
    AVG(expected_units) AS mean_daily_demand,
    -- The upper bound is what a safety stock should be sized against. Planning
    -- to the mean leaves half of all seasons short by construction.
    AVG(upper_bound) AS planning_daily_demand
  FROM forecast
  GROUP BY facility_id, drug_id
),

on_hand AS (
  SELECT
    facility_id,
    drug_id,
    SUM(quantity) AS units_on_hand,
    MIN(expiry_date) AS earliest_expiry
  FROM `medmesh.stock_batches`
  WHERE expiry_date > CURRENT_DATE()
  GROUP BY facility_id, drug_id
)

SELECT
  o.facility_id,
  o.drug_id,
  o.units_on_hand,
  ROUND(d.mean_daily_demand, 2) AS daily_demand,

  -- Clock one: the day the shelf empties.
  SAFE_DIVIDE(o.units_on_hand, d.mean_daily_demand) AS days_to_stockout,

  -- Clock two: the day the stock stops being medicine.
  DATE_DIFF(o.earliest_expiry, CURRENT_DATE(), DAY) AS days_to_expiry,

  -- The collision. Units that cannot be consumed before they expire are the
  -- surplus worth moving, and this single expression is the whole thesis:
  -- a facility can be days from empty and still holding stock it will waste.
  GREATEST(
    0,
    o.units_on_hand
      - d.mean_daily_demand * DATE_DIFF(o.earliest_expiry, CURRENT_DATE(), DAY)
  ) AS units_at_risk_of_expiry

FROM on_hand AS o
JOIN daily_demand AS d
  USING (facility_id, drug_id)
ORDER BY days_to_stockout ASC NULLS LAST;
