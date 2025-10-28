# Reviews and Ratings System Documentation

## Overview

The Fuel Finder application includes a comprehensive reviews and ratings system that allows users to rate and review both fuel stations and points of interest (POIs). The system supports anonymous submissions with anti-spam controls, automatic publishing, and moderation capabilities for both administrators and station owners.

## Architecture

### Database Schema

**Table: `reviews`**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Unique review identifier |
| `target_type` | TEXT | CHECK IN ('station', 'poi') | Type of entity being reviewed |
| `target_id` | INTEGER | NOT NULL | ID of the station or POI |
| `rating` | SMALLINT | CHECK BETWEEN 1 AND 5 | Star rating (1-5) |
| `comment` | TEXT | <= 500 chars | Optional review comment |
| `status` | TEXT | DEFAULT 'published' | Moderation status |
| `display_name` | TEXT | NULLABLE | Optional reviewer name |
| `session_id` | TEXT | NULLABLE | Session ID for anti-spam |
| `ip` | INET | NULLABLE | IP address for tracking |
| `user_agent` | TEXT | NULLABLE | Browser/device info |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Submission timestamp |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_reviews_target` - Composite index on (target_type, target_id)
- `idx_reviews_status` - Single index on status
- `idx_reviews_created_at` - Descending index for recent reviews
- `idx_reviews_session_target` - Anti-spam index for duplicate detection

### Anti-Spam System

**Rules:**
- One review per device per target per 24 hours
- Session ID stored in localStorage
- IP address and user agent logged
- Rate limiting: 10 review submissions per minute per IP

**Implementation:**
```javascript
// Session ID generation (frontend)
const sessionId = localStorage.getItem('reviewSessionId') || 
  `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Anti-spam check (backend)
canSubmitReview(sessionId, targetType, targetId) {
  // Check if review exists from same session in last 24 hours
  return reviewCount === 0;
}
```

## API Endpoints

### Public Endpoints

#### POST /api/reviews
Create a new review.

**Headers:**
- `X-Session-Id`: Session identifier (optional but recommended)

**Request Body:**
```json
{
  "targetType": "station",
  "targetId": 123,
  "rating": 5,
  "comment": "Great station, clean and friendly staff",
  "displayName": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "review": {
    "id": 1,
    "targetType": "station",
    "targetId": 123,
    "rating": 5,
    "comment": "Great station, clean and friendly staff",
    "displayName": "John Doe",
    "status": "published",
    "createdAt": "2025-01-28T10:30:00Z"
  }
}
```

**Error Responses:**
- `400` - Validation error (invalid rating, comment too long)
- `429` - Rate limit exceeded (too many reviews or duplicate in 24h)

#### GET /api/reviews
Get reviews for a specific target.

**Query Parameters:**
- `targetType` (required): "station" or "poi"
- `targetId` (required): Station or POI ID
- `status` (optional): Filter by status (default: "published")
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Items per page (default: 20)
- `sortBy` (optional): Sort field (default: "created_at")
- `sortOrder` (optional): "ASC" or "DESC" (default: "DESC")

**Response:**
```json
{
  "success": true,
  "reviews": [
    {
      "id": 1,
      "targetType": "station",
      "targetId": 123,
      "rating": 5,
      "comment": "Great station!",
      "displayName": "John Doe",
      "status": "published",
      "createdAt": "2025-01-28T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

#### GET /api/reviews/summary
Get aggregated review statistics for a target.

**Query Parameters:**
- `targetType` (required): "station" or "poi"
- `targetId` (required): Station or POI ID

**Response:**
```json
{
  "success": true,
  "summary": {
    "avgRating": "4.35",
    "totalReviews": 45,
    "breakdown": {
      "5": 25,
      "4": 12,
      "3": 5,
      "2": 2,
      "1": 1
    }
  }
}
```

### Admin Endpoints

All admin endpoints require `x-api-key` header with valid admin API key.

#### GET /api/admin/reviews
Get all reviews with filters.

**Query Parameters:**
- `status` (optional): Filter by status
- `targetType` (optional): Filter by target type
- `searchTerm` (optional): Search in comments and display names
- `page` (optional): Page number
- `pageSize` (optional): Items per page (default: 50)

**Response:** Similar to public endpoint but includes target names and full metadata.

#### PATCH /api/admin/reviews/:id
Update review status.

**Request Body:**
```json
{
  "status": "published" | "pending" | "rejected"
}
```

#### DELETE /api/admin/reviews/:id
Permanently delete a review.

### Owner Endpoints

All owner endpoints require `x-api-key` and `x-owner-domain` headers.

#### GET /api/owner/reviews
Get reviews for owner's stations.

**Query Parameters:**
- `status` (optional): Filter by status
- `stationId` (optional): Filter by specific station
- `page` (optional): Page number
- `pageSize` (optional): Items per page (default: 50)

**Response:**
```json
{
  "success": true,
  "reviews": [
    {
      "id": 1,
      "target_type": "station",
      "target_id": 52,
      "station_name": "iFuel Dangay",
      "rating": 5,
      "comment": "Excellent service!",
      "display_name": "Jane Smith",
      "status": "published",
      "created_at": "2025-01-28T10:30:00Z"
    }
  ],
  "pagination": { ... }
}
```

#### PATCH /api/owner/reviews/:id
Update review status (publish or reject).

**Request Body:**
```json
{
  "status": "published" | "rejected"
}
```

**Note:** Owners can only moderate reviews for their own stations.

## Frontend Components

### ReviewWidget (MainApp)

Location: `frontend/src/components/ReviewWidget.tsx`

**Features:**
- Star rating display (average + count)
- Submit new review form
- View all reviews (paginated)
- Responsive design
- Real-time updates

**Usage:**
```tsx
<ReviewWidget
  targetType="station"
  targetId={123}
  targetName="Shell Station"
/>
```

**Display:**
- Shows average rating with stars and review count
- "Write a Review" button opens submission form
- "View All Reviews" button expands reviews list
- Optimistic updates after submission

### ReviewsManagement (AdminPortal)

Location: `frontend/src/components/ReviewsManagement.tsx`

**Features:**
- Table view with all reviews
- Filter by status and target type
- Search functionality
- Bulk moderation actions
- Pagination

**Actions:**
- Publish pending/rejected reviews
- Reject published reviews
- Permanently delete reviews

### Owner Reviews Tab (OwnerDashboard)

Location: `frontend/src/components/owner/OwnerDashboard.tsx`

**Features:**
- Reviews count in tab badge
- Card-based review display
- Show/hide moderation
- Station-specific filtering

**Actions:**
- Hide published reviews (set to rejected)
- Show hidden reviews (set to published)

## User Interface

### Star Rating Widget

```
★★★★★  4.5 (45 reviews)
```

**Interactive (Submission):**
- Hover effect on stars
- Click to select rating
- Visual feedback

**Display Only:**
- Filled stars for rating value
- Gray stars for remaining

### Review Submission Form

**Fields:**
- Rating (required): 1-5 stars
- Name (optional): Text input, max 50 chars
- Comment (optional): Textarea, max 500 chars

**Validation:**
- Rating must be 1-5
- Comment length enforced
- Client and server-side validation

**Feedback:**
- Success message on submission
- Error handling with user-friendly messages
- Anti-spam notification (24h limit)

## Security Considerations

### Data Privacy

**What's Stored:**
- Session ID (generated, not personally identifiable)
- IP address (for anti-spam only)
- User agent (for device tracking)
- Optional display name (user-provided)

**What's NOT Stored:**
- Email addresses
- Account information
- Location data
- Personal identifiers

**Data Exposure:**
- Public API: Only display name, rating, comment, date
- Admin/Owner: + session ID, status
- Never exposed: IP address, full user agent

### Rate Limiting

**Public Endpoints:**
- Read: 100 requests/minute
- Write: 10 requests/minute

**Protected Endpoints:**
- Admin: 100 requests/minute
- Owner: 100 requests/minute (per owner)

### Input Sanitization

- Comment text sanitized for XSS
- HTML tags stripped
- SQL injection prevented (parameterized queries)
- Rating validated as integer 1-5

## Testing Checklist

### Frontend Testing
- [ ] Submit review with all fields
- [ ] Submit review with minimal fields (rating only)
- [ ] Validation errors display correctly
- [ ] Success message appears after submission
- [ ] Reviews list refreshes after submission
- [ ] Star rating display accurate
- [ ] Mobile responsive
- [ ] Anti-spam message shows on duplicate

### Backend Testing
- [ ] Create review endpoint validation
- [ ] Get reviews pagination
- [ ] Summary calculation accuracy
- [ ] Anti-spam 24h enforcement
- [ ] Rate limiting enforcement
- [ ] Admin moderation actions
- [ ] Owner moderation restrictions
- [ ] SQL injection attempts blocked

### Integration Testing
- [ ] Submit review from MainApp
- [ ] View in Admin portal
- [ ] Moderate in Admin portal
- [ ] View in Owner dashboard
- [ ] Moderate in Owner dashboard
- [ ] Summary updates after new review
- [ ] Summary updates after status change

## Deployment Steps

1. **Apply Database Migration:**
```bash
node backend/database/apply-reviews-migration.js
```

2. **Verify Table Creation:**
```sql
SELECT * FROM reviews LIMIT 1;
```

3. **Restart Backend:**
```bash
pm2 restart fuel-finder-backend
```

4. **Build and Deploy Frontend:**
```bash
cd frontend
npm run build
# Deploy to Netlify/Vercel
```

5. **Test Endpoints:**
```bash
# Create review
curl -X POST https://api.fuelfinder.com/api/reviews \
  -H "Content-Type: application/json" \
  -H "X-Session-Id: test-session" \
  -d '{"targetType":"station","targetId":1,"rating":5}'

# Get reviews
curl "https://api.fuelfinder.com/api/reviews?targetType=station&targetId=1"

# Get summary
curl "https://api.fuelfinder.com/api/reviews/summary?targetType=station&targetId=1"
```

## Performance Considerations

### Database Optimization

**Indexes:**
- Compound index on (target_type, target_id) for lookups
- Index on status for filtering
- Index on created_at for sorting
- Compound index for anti-spam checks

**Query Optimization:**
- Use LIMIT/OFFSET for pagination
- Use COUNT(*) in separate query
- Cache summary calculations (future)

### Frontend Optimization

- Lazy load reviews list
- Paginate reviews display
- Debounce search input
- Optimistic UI updates
- Cache review summaries

## Future Enhancements

1. **Rich Reviews:**
   - Photo uploads
   - Video reviews
   - Fuel receipt verification

2. **Social Features:**
   - Helpful/not helpful votes
   - Reply to reviews
   - Follow reviewers

3. **Analytics:**
   - Review sentiment analysis
   - Trending stations
   - Review quality scores

4. **Moderation:**
   - Auto-moderation using AI
   - Profanity filter
   - Spam detection
   - Duplicate content detection

5. **Notifications:**
   - Email notifications for owners
   - Push notifications for responses
   - Review milestone alerts

## Support and Troubleshooting

### Common Issues

**Reviews not appearing:**
- Check status is "published"
- Verify targetType and targetId correct
- Check pagination parameters

**Can't submit review:**
- Check 24h limit not exceeded
- Verify rating is 1-5
- Check comment length <= 500 chars
- Verify rate limit not exceeded

**Moderation not working:**
- Verify admin/owner API key
- Check permissions (owners can only moderate own stations)
- Verify review ID exists

### Monitoring

**Metrics to Track:**
- Total reviews submitted
- Average rating per station
- Review submission rate
- Moderation queue size
- API error rates

**Alerts:**
- Spam surge detection
- Negative review alerts for owners
- Moderation queue backlog
- API error rate spikes

## Maintenance

### Regular Tasks

**Weekly:**
- Review moderation queue
- Check for spam patterns
- Monitor review quality

**Monthly:**
- Analyze review trends
- Update anti-spam rules
- Review API usage patterns

**Quarterly:**
- Database cleanup (old rejected reviews)
- Performance optimization review
- Feature enhancement planning

## Compliance

### Data Retention

- Published reviews: Indefinite
- Rejected reviews: 90 days
- Deleted reviews: Permanently removed
- IP addresses: 30 days

### User Rights

- Users can request review deletion
- Users can update display name
- Users cannot edit rating/comment after submission

## Conclusion

The reviews system provides a robust, scalable solution for user feedback on stations and POIs. With automatic publishing, intelligent anti-spam controls, and comprehensive moderation tools, it enhances user engagement while maintaining data quality and security.

For questions or support, contact the development team or refer to the main project documentation.
