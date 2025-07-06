# Dashboard Endpoints Documentation

## Overview
Three new dashboard endpoints have been added to provide analytics and statistics for the Owambe backend.

## Base URL
All endpoints are prefixed with: `/api/v1/dashboard`

## Authentication
All endpoints require authentication via the `authenticate` middleware.

## Endpoints

### 1. Dashboard Statistics
**GET** `/api/v1/dashboard/stats`

Returns comprehensive dashboard statistics including:
- Total number of events (current month vs previous month)
- Percentage increase in total events
- Active events (events happening today or in the future)
- Percentage increase in active events
- Total attendees (guests with claimedInvite: true)
- Percentage increase in total attendees

**Response:**
```json
{
  "success": true,
  "data": {
    "totalEvents": {
      "current": 15,
      "previous": 12,
      "percentageIncrease": 25.0
    },
    "activeEvents": {
      "current": 8,
      "previous": 6,
      "percentageIncrease": 33.33
    },
    "totalAttendees": {
      "current": 150,
      "previous": 120,
      "percentageIncrease": 25.0
    }
  }
}
```

### 2. Recent Events
**GET** `/api/v1/dashboard/recent-events`

Returns the last 5 events created by the user with optional filtering.

**Query Parameters:**
- `date` (optional): Filter events by specific date (YYYY-MM-DD format)
- `status` (optional): Filter events by status (pending, ongoing, completed)
- `limit` (optional): Number of events to return (default: 5)

**Example:**
```
GET /api/v1/dashboard/recent-events?date=2024-01-15&status=pending&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "event_id",
      "title": "Wedding Ceremony",
      "venue": "Grand Hotel",
      "startDateTime": "2024-02-15T10:00:00.000Z",
      "endDateTime": "2024-02-15T18:00:00.000Z",
      "status": "pending",
      "organizerId": {
        "_id": "user_id",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "createdAt": "2024-01-10T08:00:00.000Z"
    }
  ]
}
```

### 3. Analytics Data
**GET** `/api/v1/dashboard/analytics`

Returns data for a bar chart showing events by month for the current year and previous year.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "month": "Jan",
      "currentMonth": 5,
      "previousMonth": 3
    },
    {
      "month": "Feb",
      "currentMonth": 8,
      "previousMonth": 6
    },
    {
      "month": "Mar",
      "currentMonth": 12,
      "previousMonth": 10
    },
    {
      "month": "Apr",
      "currentMonth": 7,
      "previousMonth": 9
    },
    {
      "month": "May",
      "currentMonth": 15,
      "previousMonth": 12
    },
    {
      "month": "Jun",
      "currentMonth": 10,
      "previousMonth": 8
    },
    {
      "month": "Jul",
      "currentMonth": 6,
      "previousMonth": 5
    },
    {
      "month": "Aug",
      "currentMonth": 9,
      "previousMonth": 7
    },
    {
      "month": "Sep",
      "currentMonth": 11,
      "previousMonth": 9
    },
    {
      "month": "Oct",
      "currentMonth": 13,
      "previousMonth": 11
    },
    {
      "month": "Nov",
      "currentMonth": 8,
      "previousMonth": 6
    },
    {
      "month": "Dec",
      "currentMonth": 14,
      "previousMonth": 10
    }
  ]
}
```

## Usage Examples

### Frontend Integration

**Dashboard Stats:**
```javascript
const response = await fetch('/api/v1/dashboard/stats', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const stats = await response.json();
```

**Recent Events with Filtering:**
```javascript
const response = await fetch('/api/v1/dashboard/recent-events?status=pending&limit=10', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const events = await response.json();
```

**Analytics for Chart:**
```javascript
const response = await fetch('/api/v1/dashboard/analytics', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const analytics = await response.json();

// Use with chart library (e.g., Chart.js)
const chartData = {
  labels: analytics.data.map(item => item.month),
  datasets: [
    {
      label: 'Current Month',
      data: analytics.data.map(item => item.currentMonth),
      backgroundColor: 'rgba(54, 162, 235, 0.5)'
    },
    {
      label: 'Previous Month',
      data: analytics.data.map(item => item.previousMonth),
      backgroundColor: 'rgba(255, 99, 132, 0.5)'
    }
  ]
};
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description"
}
```

Common HTTP status codes:
- `200`: Success
- `401`: Unauthorized (missing or invalid token)
- `500`: Internal server error 