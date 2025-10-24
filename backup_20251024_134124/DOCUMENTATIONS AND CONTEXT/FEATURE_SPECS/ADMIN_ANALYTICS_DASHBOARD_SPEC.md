# 📊 Advanced Admin Analytics Dashboard - Implementation Specification

**Feature**: Comprehensive Admin Dashboard & Analytics  
**Priority**: 🟢 HIGH (Operations Critical)  
**Estimated Effort**: 2 weeks  
**Version**: 1.0

---

## 🎯 Overview

### Problem Statement
Current admin portal is basic. Admins need:
- Real-time system health monitoring
- User behavior analytics
- Content quality metrics
- Business intelligence insights
- Automated moderation tools

### Solution
**Comprehensive Analytics Platform** with:
1. **Real-time Dashboard**: Live metrics, KPIs
2. **User Analytics**: Retention, engagement, cohorts
3. **Content Health**: Data quality monitoring
4. **Revenue Tracking**: Donations, API usage
5. **Automated Alerts**: Anomaly detection

### Success Metrics
- ✅ Reduce manual moderation time by 60%
- ✅ Identify issues within 5 minutes
- ✅ Data-driven decision making
- ✅ < 2 second dashboard load time

---

## 🗄️ Database Schema

### 1. `analytics_events` - Event Tracking

```sql
CREATE TABLE analytics_events (
  id BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,  -- page_view, feature_used, error, etc.
  event_category VARCHAR(50),
  event_action VARCHAR(100),
  event_label VARCHAR(200),
  
  -- User context
  user_session_id VARCHAR(255),
  user_agent VARCHAR(50),
  device_type VARCHAR(20),
  
  -- Location context
  user_lat DECIMAL(10,8),
  user_lng DECIMAL(11,8),
  city VARCHAR(100),
  region VARCHAR(100),
  
  -- Event data (JSON)
  event_data JSONB,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  date DATE GENERATED ALWAYS AS (created_at::date) STORED,
  hour INTEGER GENERATED ALWAYS AS (EXTRACT(HOUR FROM created_at)::integer) STORED
);

CREATE INDEX idx_events_type ON analytics_events(event_type);
CREATE INDEX idx_events_date ON analytics_events(date);
CREATE INDEX idx_events_session ON analytics_events(user_session_id);
CREATE INDEX idx_events_created ON analytics_events(created_at);
```

### 2. `daily_metrics` - Pre-aggregated Metrics

```sql
CREATE TABLE daily_metrics (
  id SERIAL PRIMARY KEY,
  metric_date DATE NOT NULL,
  
  -- User metrics
  daily_active_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  returning_users INTEGER DEFAULT 0,
  avg_session_duration_seconds INTEGER DEFAULT 0,
  
  -- Content metrics
  stations_added INTEGER DEFAULT 0,
  stations_updated INTEGER DEFAULT 0,
  price_reports_submitted INTEGER DEFAULT 0,
  price_reports_verified INTEGER DEFAULT 0,
  
  -- Feature usage
  routes_calculated INTEGER DEFAULT 0,
  trips_recorded INTEGER DEFAULT 0,
  navigations_started INTEGER DEFAULT 0,
  
  -- Revenue metrics
  donations_count INTEGER DEFAULT 0,
  donations_amount DECIMAL(10,2) DEFAULT 0,
  
  -- Quality metrics
  avg_price_accuracy DECIMAL(5,2),
  data_completeness_score DECIMAL(5,2),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(metric_date)
);

CREATE INDEX idx_daily_metrics_date ON daily_metrics(metric_date DESC);
```

### 3. `admin_alerts` - System Alerts

```sql
CREATE TABLE admin_alerts (
  id SERIAL PRIMARY KEY,
  alert_type VARCHAR(50) NOT NULL,  -- error, warning, info, critical
  severity VARCHAR(20) NOT NULL,  -- low, medium, high, critical
  
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  
  -- Context
  related_entity VARCHAR(50),  -- station, user, price_report, etc.
  related_id INTEGER,
  
  -- Status
  status VARCHAR(20) DEFAULT 'new',  -- new, acknowledged, resolved, dismissed
  acknowledged_by VARCHAR(255),
  acknowledged_at TIMESTAMP,
  resolved_at TIMESTAMP,
  
  -- Metadata
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admin_alerts_status ON admin_alerts(status);
CREATE INDEX idx_admin_alerts_created ON admin_alerts(created_at DESC);
CREATE INDEX idx_admin_alerts_severity ON admin_alerts(severity);
```

### 4. `content_quality_scores` - Data Health Tracking

```sql
CREATE TABLE content_quality_scores (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,  -- station, poi
  entity_id INTEGER NOT NULL,
  
  -- Quality dimensions
  completeness_score INTEGER DEFAULT 0,  -- 0-100
  freshness_score INTEGER DEFAULT 0,     -- 0-100
  accuracy_score INTEGER DEFAULT 0,      -- 0-100
  engagement_score INTEGER DEFAULT 0,    -- 0-100
  overall_score INTEGER DEFAULT 0,       -- 0-100
  
  -- Issues
  missing_fields TEXT[],
  outdated_fields TEXT[],
  low_engagement_reason TEXT,
  
  last_calculated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(entity_type, entity_id)
);

CREATE INDEX idx_quality_entity ON content_quality_scores(entity_type, entity_id);
CREATE INDEX idx_quality_overall ON content_quality_scores(overall_score);
```

---

## 🔌 API Endpoints

### 1. Dashboard Overview (Protected)

**GET** `/api/admin/dashboard/overview`  
**Headers**: `x-api-key: ADMIN_KEY`

**Response**:
```json
{
  "success": true,
  "realtime": {
    "activeUsers": 42,
    "activeTrips": 5,
    "pendingPriceReports": 12,
    "systemHealth": "healthy",
    "uptimePercentage": 99.8
  },
  "today": {
    "users": 187,
    "newUsers": 12,
    "routes": 234,
    "trips": 89,
    "priceReports": 45,
    "donations": {
      "count": 3,
      "amount": 150.00
    }
  },
  "trends": {
    "usersVsYesterday": "+8.2%",
    "routesVsYesterday": "+12.5%",
    "avgSessionDuration": 423  // seconds
  },
  "alerts": {
    "critical": 0,
    "warnings": 2,
    "info": 5
  }
}
```

---

### 2. User Analytics (Protected)

**GET** `/api/admin/analytics/users`  
**Query**: `?startDate=2025-10-01&endDate=2025-10-18&groupBy=day`

**Response**:
```json
{
  "success": true,
  "summary": {
    "totalUsers": 1523,
    "newUsers": 234,
    "returningUsers": 1289,
    "avgSessionDuration": 389,
    "bounceRate": 23.5,
    "retentionRate": {
      "day1": 45.2,
      "day7": 28.6,
      "day30": 15.3
    }
  },
  "timeSeries": [
    {
      "date": "2025-10-01",
      "activeUsers": 145,
      "newUsers": 23,
      "sessions": 342,
      "avgDuration": 405
    }
  ],
  "cohorts": [
    {
      "cohortDate": "2025-09-01",
      "size": 120,
      "retention": {
        "week1": 67,
        "week2": 45,
        "week4": 28
      }
    }
  ],
  "topFeatures": [
    {"feature": "route-navigation", "users": 1234, "percentage": 81},
    {"feature": "trip-recording", "users": 678, "percentage": 44}
  ]
}
```

---

### 3. Content Health Report (Protected)

**GET** `/api/admin/analytics/content-health`

**Response**:
```json
{
  "success": true,
  "stations": {
    "total": 48,
    "withImages": 42,
    "withFreshPrices": 35,
    "needsUpdate": [
      {
        "id": 15,
        "name": "Petron Roxas",
        "issues": ["price_outdated", "missing_operating_hours"],
        "lastUpdated": "2025-09-20",
        "qualityScore": 65
      }
    ],
    "avgQualityScore": 78.5
  },
  "pois": {
    "total": 23,
    "withImages": 18,
    "avgQualityScore": 72.3
  },
  "priceReports": {
    "pendingVerification": 12,
    "verifiedToday": 34,
    "avgVerificationTime": 4.2,  // hours
    "accuracyRate": 87.3
  },
  "recommendations": [
    "Update prices for 13 stations (>7 days old)",
    "Add images to 6 stations",
    "Verify 12 pending price reports"
  ]
}
```

---

### 4. Revenue Analytics (Protected)

**GET** `/api/admin/analytics/revenue`  
**Query**: `?startDate=2025-10-01&endDate=2025-10-18`

**Response**:
```json
{
  "success": true,
  "donations": {
    "totalAmount": 2340.00,
    "totalCount": 45,
    "avgDonation": 52.00,
    "topDonors": [
      {"sessionId": "session_abc...", "amount": 200, "count": 4}
    ],
    "conversionRate": 3.2,  // % of users who donated
    "trend": "+15.3%"
  },
  "apiUsage": {
    "totalCalls": 145230,
    "uniqueKeys": 5,
    "topEndpoints": [
      {"/api/stations/nearby": 45230},
      {"/api/route": 23450}
    ]
  },
  "projections": {
    "monthlyRevenue": 4500.00,
    "annualRevenue": 54000.00
  }
}
```

---

### 5. System Health (Protected)

**GET** `/api/admin/system/health`

**Response**:
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2025-10-18T14:35:22Z",
  "components": {
    "database": {
      "status": "healthy",
      "responseTime": 12,  // ms
      "connections": 15,
      "maxConnections": 100
    },
    "osrm": {
      "status": "healthy",
      "responseTime": 45,
      "requestsPerMinute": 23
    },
    "supabaseStorage": {
      "status": "healthy",
      "usedSpace": 234.5,  // MB
      "totalSpace": 5000
    },
    "cache": {
      "status": "healthy",
      "hitRate": 78.5,
      "size": 1523
    }
  },
  "performance": {
    "avgResponseTime": 187,  // ms
    "p95ResponseTime": 423,
    "errorRate": 0.3,  // %
    "requestsPerMinute": 45
  },
  "resources": {
    "cpuUsage": 34.5,  // %
    "memoryUsage": 1234,  // MB
    "diskUsage": 45.2  // %
  }
}
```

---

### 6. Generate System Alert (Protected)

**POST** `/api/admin/alerts`

**Request Body**:
```json
{
  "alertType": "price_report_spike",
  "severity": "warning",
  "title": "Unusual Price Report Activity",
  "message": "15 price reports from same IP in 10 minutes",
  "relatedEntity": "price_report",
  "relatedId": 234,
  "metadata": {
    "ip": "192.168.1.1",
    "count": 15,
    "timeWindow": "10 minutes"
  }
}
```

---

### 7. Moderation Queue (Protected)

**GET** `/api/admin/moderation/queue`  
**Query**: `?type=price_reports&status=pending&limit=50`

**Response**:
```json
{
  "success": true,
  "queue": [
    {
      "id": 234,
      "type": "price_report",
      "stationId": 15,
      "stationName": "Petron Roxas",
      "reporter": {
        "sessionId": "session_abc...",
        "ip": "192.168.1.1",
        "reputation": 87
      },
      "data": {
        "fuelType": "Gasoline",
        "price": 52.50,
        "notes": "Confirmed at pump 2"
      },
      "flags": {
        "isOutlier": false,
        "isFrequentReporter": true,
        "ipSuspicious": false
      },
      "submittedAt": "2025-10-18T14:30:00Z",
      "waitTime": "5 minutes"
    }
  ],
  "stats": {
    "pending": 12,
    "avgWaitTime": "2.3 hours",
    "verifiedToday": 34
  }
}
```

---

### 8. Bulk Moderation Actions (Protected)

**POST** `/api/admin/moderation/bulk-action`

**Request Body**:
```json
{
  "action": "verify",  // verify, reject, flag
  "itemIds": [234, 235, 236],
  "itemType": "price_report",
  "verifiedBy": "admin_user",
  "reason": "Batch verification - trusted reporters"
}
```

---

## 💻 Frontend Components

### Dashboard Overview Component

```typescript
// frontend/src/components/AdminDashboard.tsx
const AdminDashboard = () => {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 30000);  // Refresh every 30s
    return () => clearInterval(interval);
  }, []);
  
  const loadDashboard = async () => {
    const response = await fetch('/api/admin/dashboard/overview', {
      headers: { 'x-api-key': getAdminApiKey() }
    });
    const data = await response.json();
    setOverview(data);
    setLoading(false);
  };
  
  if (loading) return <LoadingSpinner />;
  
  return (
    <div className="admin-dashboard">
      {/* KPI Cards */}
      <div className="kpi-grid">
        <KPICard
          title="Active Users"
          value={overview.realtime.activeUsers}
          trend={overview.trends.usersVsYesterday}
          icon="👥"
        />
        <KPICard
          title="Routes Today"
          value={overview.today.routes}
          trend={overview.trends.routesVsYesterday}
          icon="🗺️"
        />
        <KPICard
          title="Pending Reports"
          value={overview.realtime.pendingPriceReports}
          urgency={overview.realtime.pendingPriceReports > 10 ? 'high' : 'normal'}
          icon="📝"
        />
        <KPICard
          title="Revenue Today"
          value={`₱${overview.today.donations.amount}`}
          subtitle={`${overview.today.donations.count} donations`}
          icon="💰"
        />
      </div>
      
      {/* Alerts */}
      {overview.alerts.critical > 0 && (
        <AlertBanner severity="critical">
          {overview.alerts.critical} critical alerts require attention
        </AlertBanner>
      )}
      
      {/* Charts */}
      <div className="charts-grid">
        <UserActivityChart />
        <FeatureUsageChart />
        <RevenueChart />
      </div>
      
      {/* Quick Actions */}
      <div className="quick-actions">
        <button onClick={() => navigate('/admin/moderation')}>
          Review {overview.realtime.pendingPriceReports} Reports
        </button>
        <button onClick={() => navigate('/admin/content-health')}>
          Content Health
        </button>
        <button onClick={() => navigate('/admin/analytics')}>
          Full Analytics
        </button>
      </div>
    </div>
  );
};
```

### Moderation Queue Component

```typescript
// frontend/src/components/ModerationQueue.tsx
const ModerationQueue = () => {
  const [queue, setQueue] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  
  const bulkVerify = async () => {
    await fetch('/api/admin/moderation/bulk-action', {
      method: 'POST',
      headers: {
        'x-api-key': getAdminApiKey(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'verify',
        itemIds: selectedItems,
        itemType: 'price_report',
        verifiedBy: 'admin'
      })
    });
    
    loadQueue();
    setSelectedItems([]);
  };
  
  return (
    <div className="moderation-queue">
      <div className="queue-header">
        <h2>Price Report Moderation</h2>
        <div className="bulk-actions">
          <button 
            disabled={selectedItems.length === 0}
            onClick={bulkVerify}
          >
            ✅ Verify Selected ({selectedItems.length})
          </button>
          <button 
            disabled={selectedItems.length === 0}
            onClick={bulkReject}
          >
            ❌ Reject Selected
          </button>
        </div>
      </div>
      
      <div className="queue-stats">
        <span>📊 {queue.stats.pending} pending</span>
        <span>⏱️ Avg wait: {queue.stats.avgWaitTime}</span>
        <span>✅ {queue.stats.verifiedToday} verified today</span>
      </div>
      
      <table className="queue-table">
        <thead>
          <tr>
            <th><input type="checkbox" onChange={selectAll} /></th>
            <th>Station</th>
            <th>Reporter</th>
            <th>Price</th>
            <th>Flags</th>
            <th>Submitted</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {queue.queue.map(item => (
            <tr key={item.id} className={item.flags.isOutlier ? 'flagged' : ''}>
              <td>
                <input 
                  type="checkbox"
                  checked={selectedItems.includes(item.id)}
                  onChange={() => toggleSelect(item.id)}
                />
              </td>
              <td>{item.stationName}</td>
              <td>
                <span title={item.reporter.sessionId}>
                  Rep: {item.reporter.reputation}
                </span>
              </td>
              <td>₱{item.data.price}/L ({item.data.fuelType})</td>
              <td>
                {item.flags.isOutlier && <span className="flag">⚠️ Outlier</span>}
                {item.flags.ipSuspicious && <span className="flag">🚨 IP</span>}
              </td>
              <td>{item.waitTime}</td>
              <td>
                <button onClick={() => verifyItem(item.id)}>✅</button>
                <button onClick={() => rejectItem(item.id)}>❌</button>
                <button onClick={() => viewDetails(item)}>👁️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

---

## 🤖 Background Jobs

### 1. Daily Metrics Aggregation

```javascript
// backend/jobs/aggregateDailyMetrics.js
const cron = require('node-cron');

// Run every day at 1 AM
cron.schedule('0 1 * * *', async () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];
  
  // Aggregate user metrics
  const userMetrics = await db.query(`
    SELECT 
      COUNT(DISTINCT user_session_id) as daily_active_users,
      COUNT(DISTINCT CASE WHEN first_seen::date = $1 THEN user_session_id END) as new_users,
      AVG(EXTRACT(EPOCH FROM (last_seen - first_seen))) as avg_session_duration
    FROM analytics_events
    WHERE date = $1
  `, [dateStr]);
  
  // Aggregate content metrics
  const contentMetrics = await db.query(`
    SELECT 
      COUNT(*) FILTER (WHERE event_type = 'station_created') as stations_added,
      COUNT(*) FILTER (WHERE event_type = 'price_report_submitted') as price_reports_submitted,
      COUNT(*) FILTER (WHERE event_type = 'price_report_verified') as price_reports_verified
    FROM analytics_events
    WHERE date = $1
  `, [dateStr]);
  
  // Insert into daily_metrics
  await db.query(`
    INSERT INTO daily_metrics (
      metric_date,
      daily_active_users,
      new_users,
      avg_session_duration_seconds,
      price_reports_submitted,
      price_reports_verified
    ) VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (metric_date) DO UPDATE SET
      daily_active_users = EXCLUDED.daily_active_users,
      new_users = EXCLUDED.new_users,
      avg_session_duration_seconds = EXCLUDED.avg_session_duration_seconds,
      updated_at = NOW()
  `, [
    dateStr,
    userMetrics.rows[0].daily_active_users,
    userMetrics.rows[0].new_users,
    Math.round(userMetrics.rows[0].avg_session_duration || 0),
    contentMetrics.rows[0].price_reports_submitted,
    contentMetrics.rows[0].price_reports_verified
  ]);
  
  console.log(`✅ Daily metrics aggregated for ${dateStr}`);
});
```

### 2. Content Quality Scoring

```javascript
// backend/jobs/calculateQualityScores.js
cron.schedule('0 */6 * * *', async () => {  // Every 6 hours
  const stations = await db.query('SELECT * FROM stations');
  
  for (const station of stations.rows) {
    const score = await calculateStationQuality(station);
    
    await db.query(`
      INSERT INTO content_quality_scores (
        entity_type, entity_id, completeness_score, 
        freshness_score, overall_score, missing_fields
      ) VALUES ('station', $1, $2, $3, $4, $5)
      ON CONFLICT (entity_type, entity_id) DO UPDATE SET
        completeness_score = EXCLUDED.completeness_score,
        freshness_score = EXCLUDED.freshness_score,
        overall_score = EXCLUDED.overall_score,
        missing_fields = EXCLUDED.missing_fields,
        last_calculated = NOW()
    `, [station.id, score.completeness, score.freshness, score.overall, score.missing]);
  }
});

async function calculateStationQuality(station) {
  let completeness = 100;
  const missing = [];
  
  // Check required fields
  if (!station.images || station.images.length === 0) {
    completeness -= 20;
    missing.push('images');
  }
  if (!station.operating_hours) {
    completeness -= 15;
    missing.push('operating_hours');
  }
  if (!station.phone) {
    completeness -= 10;
    missing.push('phone');
  }
  
  // Check freshness
  const daysSinceUpdate = Math.floor((Date.now() - new Date(station.updated_at)) / (1000 * 60 * 60 * 24));
  const freshness = Math.max(0, 100 - (daysSinceUpdate * 5));
  
  const overall = Math.round((completeness + freshness) / 2);
  
  return { completeness, freshness, overall, missing };
}
```

---

## 📋 Implementation Checklist

### Phase 1: Core Infrastructure (Week 1)
- [ ] Create analytics tables
- [ ] Implement event tracking system
- [ ] Build background jobs (metrics aggregation)
- [ ] Create admin API endpoints

### Phase 2: Dashboard UI (Week 1)
- [ ] Build dashboard overview component
- [ ] Create KPI cards
- [ ] Add real-time updates
- [ ] Implement charts (Chart.js/Recharts)

### Phase 3: Analytics Features (Week 2)
- [ ] User analytics page
- [ ] Content health monitoring
- [ ] Revenue analytics
- [ ] System health dashboard

### Phase 4: Moderation Tools (Week 2)
- [ ] Build moderation queue UI
- [ ] Implement bulk actions
- [ ] Add automated flagging
- [ ] Create alert system

### Phase 5: Polish & Testing
- [ ] Performance optimization
- [ ] Mobile responsive design
- [ ] Export functionality
- [ ] Admin training documentation

**Estimated Time**: 2 weeks  
**Impact**: VERY HIGH - Critical for operations  
**Complexity**: MEDIUM - Mostly CRUD + aggregations
