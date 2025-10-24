# Reporter Info Fix

This document outlines the changes made to address the issue of the "Reporter" field in the Admin Portal always displaying "127.0.0.1".

## 1. Problem

The "Reporter" column in the Price Reports Management tab of the Admin Portal consistently showed the IP address "127.0.0.1". This occurs because the backend server is running behind a reverse proxy (like Nginx or a load balancer) that is not configured to pass the original client's IP address. As a result, all requests appear to originate from the server itself, which has the loopback IP address "127.0.0.1".

While the backend code attempts to read the `X-Forwarded-For` header, the proxy isn't setting it, leading to the fallback IP being used.

## 2. Solution

To provide more meaningful information in the "Reporter" column without access to the proxy configuration, the following changes were implemented in the backend:

### Backend Changes

The API endpoints for retrieving price reports for the admin panel have been modified to return a more useful identifier.

-   **File Modified:** `backend/server.js`

-   **Endpoints Modified:**
    -   `GET /api/admin/price-reports/pending`
    -   `GET /api/admin/price-reports`

-   **Change Details:**
    -   The `reporter_ip` field in the JSON response has been replaced with a new field called `reporter`.
    -   This `reporter` field will now contain the `reporter_identifier` if it exists. The `reporter_identifier` is a Base64-encoded version of the user's `User-Agent` string, which provides information about the browser and operating system of the reporter.
    -   If the `reporter_identifier` is not available, it will fall back to displaying the `reporter_ip`.

### API Response Changes

The structure of the JSON response for the admin price report endpoints has been changed as follows:

**Before:**

```json
{
  "reports": [
    {
      "id": 1,
      "station_name": "iFuel Dangay",
      "fuel_type": "Diesel",
      "price": 58.00,
      "reporter_ip": "127.0.0.1",
      "created_at": "2025-10-21T06:20:01.000Z"
    }
  ]
}
```

**After:**

```json
{
  "reports": [
    {
      "id": 1,
      "station_name": "iFuel Dangay",
      "fuel_type": "Diesel",
      "price": 58.00,
      "reporter": "TW96aWxsYS81LjAgKFdpbmRvd3MgTlQgMTAuMDsgV2luNjQ7IHg2NCkgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSA...",
      "created_at": "2025-10-21T06:20:01.000Z"
    }
  ]
}
```

## 3. Frontend Action Required

The frontend application that displays the price reports in the Admin Portal needs to be updated to use the new `reporter` field instead of the old `reporter_ip` field.

-   **File to update:** The frontend component responsible for rendering the "Price Reports Management" table (likely in `frontend/src/components` or `frontend/src/views`).
-   **Change required:** Find the code that displays `report.reporter_ip` and change it to display `report.reporter`.

## 4. Long-Term Recommendation

The most robust solution is to correctly configure the reverse proxy to pass the client's real IP address. This is done by setting the `X-Forwarded-For` header on the proxy.

For example, in **Nginx**, you would add the following line to your server block configuration:

```nginx
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

Once the proxy is correctly configured, the `reporter_ip` field will contain the actual user's IP address, which is more valuable for moderation and tracking purposes. The backend is already set up to handle this header correctly.
