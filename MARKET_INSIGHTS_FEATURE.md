# Owner Market Insights Feature

## Overview

This document describes the **Owner Market Insights** backend feature that powers the `📈 Market Insights` tab for station owners. It provides municipality-level comparisons of fuel prices and ratings between an owners stations and nearby competitor stations.

Scope:
- **Backend only** (new endpoint + controller logic + routing)
- Fully owner-safe: no exposure of other owners private data or API keys

---

## Backend Changes

### Files Modified

- **`backend/controllers/ownerController.js`**
  - Added helper: `inferMunicipalityFromAddress(address: string | null): string | null`
  - Added controller: `getMarketInsights(req, res)`
  - Exported `getMarketInsights` from `module.exports`

- **`backend/routes/ownerRoutes.js`**
  - Registered new route:
    - `GET /api/owner/market-insights`  `ownerController.getMarketInsights`

No database schema changes were required; the feature reuses existing tables:

- `stations`
- `fuel_prices`
- `fuel_price_reports`
- `reviews`

---

## Endpoint: GET /api/owner/market-insights

### URL

```text
GET /api/owner/market-insights
```

### Auth & Headers

Same as other owner routes:

- `x-api-key: <owner_api_key>`
- `x-owner-domain: <owner_subdomain>`

Owner context (`req.ownerData`) is resolved via existing `detectOwner`, `requireOwner`, `verifyOwnerApiKey`, and `enforceOwnerStationAccess` middleware.

### Query Parameters

- `days` (optional)
  - Allowed values: `7`, `15`, `30`
  - Any other value or missing  defaults to **7**

- `municipality` (optional)
  - String used as a case-insensitive filter on `stations.address`:
    - `WHERE s.address ILIKE '%' || municipality || '%'`
  - If omitted, backend tries to infer a municipality from the owners stations (see below).

### Municipality Inference Logic

If `municipality` is **not** provided:

1. Find first station owned by the current owner with a non-null `address`:
   - `SELECT address FROM stations WHERE owner_id = $1 AND address IS NOT NULL ORDER BY id LIMIT 1`
2. Pass this address to `inferMunicipalityFromAddress(address)`:
   - Splits on `,`
   - Trims pieces
   - Uses:
     - `parts[0]` if there are 1 or 2 segments
     - `parts[1]` if there are 3+ segments
3. The inferred value is used as the `municipality` filter.

If no address is available for any owned station, `municipality` remains `null` and the queries effectively consider **all stations** (edge-case fallback).

---

## Data Returned

The endpoint returns:

```jsonc
{
  "municipality": "Calapan City",       // inferred or from query, or null
  "days": 7,                             // 7, 15 or 30
  "fuelTypes": ["Diesel", "Premium"],  // fuel types that have price reports
  "priceInsights": [
    {
      "fuel_type": "Diesel",
      "owner_avg_price": "xx.xx",      // null if owner has no stations in this fuel type
      "market_avg_price": "yy.yy",     // average over all stations in municipality
      "owner_rank_by_price": 2,         // best rank (1-based) among owner stations, or null
      "total_stations": 10,
      "cheapest_station": {
        "id": 12,
        "name": "Shell Calapan",
        "brand": "Shell",
        "price": "zz.zz"
      },
      "most_expensive_station": {
        "id": 23,
        "name": "Petron XYZ",
        "brand": "Petron",
        "price": "aa.aa"
      }
    }
  ],
  "stations": [
    {
      "id": 1,
      "name": "IFuel Dangay",
      "brand": "IFuel",
      "is_owner_station": true,
      "municipality": "Calapan City",  // same as top-level municipality (or null)
      "fuel_prices": [
        { "fuel_type": "Diesel", "price": "xx.xx" },
        { "fuel_type": "Premium", "price": "..." }
      ],
      "avg_rating": 4.5,
      "reviews_count": 23
    }
  ]
}
```

### Stations Array

The `stations` array is built from `stations` + `fuel_prices` + `reviews`:

- Base station fields:
  - `id`, `name`, `brand`, `address`, `owner_id`
- **Fuel prices** (from `fuel_prices`):

  ```sql
  JSON_AGG(
    JSONB_BUILD_OBJECT(
      'fuel_type', fp.fuel_type,
      'price', fp.price
    )
  ) FILTER (WHERE fp.id IS NOT NULL) AS fuel_prices
  ```

- **Ratings and review counts** (from `reviews`):
  - Only `target_type = 'station'`
  - Only `status = 'published'`
  - Only reviews within the chosen time window:

  ```sql
  AND rv.created_at >= NOW() - INTERVAL '<days> days'
  ```

Mapped shape per station:

```js
{
  id: row.id,
  name: row.name,
  brand: row.brand,
  is_owner_station: row.owner_id === ownerId,
  municipality: municipality || null,
  fuel_prices: row.fuel_prices || [],
  avg_rating: row.avg_rating !== null ? Number(row.avg_rating) : 0,
  reviews_count: Number(row.reviews_count || 0),
}
```

### Price Insights Array

Price insights are calculated from `fuel_price_reports` joined with `stations`:

- Filters:
  - Only **verified** reports: `pr.is_verified = TRUE`
  - Only within selected window: `pr.created_at >= NOW() - INTERVAL '<days> days'`
  - Only stations matching municipality filter.
- Grouped by station + fuel type and averaged:

  ```sql
  AVG(pr.price) AS avg_price
  ```

For each `fuel_type`:

1. Build a list of `{ station_id, name, brand, isOwner, avg_price }`.
2. Sort by `avg_price` ascending.
3. Compute:
   - `total_stations`
   - `cheapest_station` (first in sorted list)
   - `most_expensive_station` (last in sorted list)
   - `owner_avg_price`
     - Average of `avg_price` across owner-owned stations for that fuel type
   - `owner_rank_by_price`
     - Best (lowest) 1-based index of any owner station in the sorted list
   - `market_avg_price`
     - Average of `avg_price` across **all** stations for that fuel type

All prices in the JSON are formatted as fixed decimals (`"xx.xx"`).

---

## Logging & Audit

The endpoint logs access via existing owner activity logging:

```js
await logOwnerActivity(
  ownerId,
  "view_market_insights",
  null,
  req.ip,
  req.get("user-agent"),
  { municipality: municipality || null, days }
);
```

This records:
- Owner ID
- Action type: `view_market_insights`
- IP + User-Agent
- Context (municipality + days)

---

## Security & Privacy

- Uses existing owner auth and rate limiting pipeline.
- Only **public** station fields are returned:
  - `id`, `name`, `brand`, `address`-derived municipality, fuel prices, ratings, review counts
- Does **not** expose:
  - Other owners `owner_id` or API keys
  - Owner activity logs of other owners
  - Any internal configuration or theme settings

The only use of `owner_id` for other stations is **internal** to determine:
- Which stations belong to the current owner (`is_owner_station`)
- Owners rank by price among all stations.

---

## Frontend Integration Notes

Planned usage in `OwnerDashboard.tsx`:

- Add new tab key: `'insights'` (📈 Market Insights)
- New state:

  ```ts
  type TimeRange = 7 | 15 | 30;

  const [activeTab, setActiveTab] = useState<
    'overview' | 'stations' | 'reports' | 'reviews' | 'insights'
  >('overview');

  const [timeRange, setTimeRange] = useState<TimeRange>(7);
  const [marketInsights, setMarketInsights] = useState<MarketInsights | null>(null);
  ```

- Fetch logic (conceptual):

  ```ts
  async function fetchMarketInsights(days: TimeRange, municipality?: string) {
    const apiKey = localStorage.getItem('owner_api_key');
    const subdomain = localStorage.getItem('owner_subdomain');
    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

    const params = new URLSearchParams();
    params.set('days', days.toString());
    if (municipality) params.set('municipality', municipality);

    const res = await fetch(`${apiUrl}/api/owner/market-insights?${params}`, {
      headers: {
        'x-api-key': apiKey || '',
        'x-owner-domain': subdomain || ''
      }
    });

    const data = await res.json();
    setMarketInsights(data);
  }
  ```

- Trigger when:
  - `activeTab === 'insights'` or
  - `timeRange` changes (7 / 15 / 30 days)

### UI Building Blocks (from response)

- **Top cards** (per municipality + days):
  - Cheapest Diesel rank:
    - Uses `priceInsights` for `fuel_type = 'Diesel'`
    - `owner_rank_by_price` and `total_stations`
  - Owner vs market price:
    - `owner_avg_price` vs `market_avg_price`
  - Rating vs municipal average:
    - From `stations` array:
      - Owners average rating: average over `stations.filter(is_owner_station)`
      - Municipal average: average over all `stations`

- **Station comparison table**:
  - One table per municipality (for now, API uses single municipality string)
  - Columns:
    - Station (name + brand), badge if `is_owner_station`
    - Columns per fuel type (`Regular`, `Premium`, `Diesel`, etc.) from `fuel_prices`
    - `avg_rating`
    - `reviews_count`

---

## Deployment Notes

- **No database migrations** required for this feature.
- Backend changes only:
  - `ownerController.js`
  - `ownerRoutes.js`
- To deploy:
  - Rebuild/restart the backend service as done for previous owner features.

Once the frontend tab is implemented, owners will be able to view:
- Their price rank vs competitors per fuel type
- Their average prices vs municipal averages
- Their ratings vs municipal averages
- A table of named competitor stations with prices and ratings.
