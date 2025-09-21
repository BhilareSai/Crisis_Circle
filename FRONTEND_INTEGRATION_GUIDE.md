# Community Help Frontend Integration Guide

## Overview

This documentation provides a comprehensive guide for frontend developers to integrate with the Community Help Backend API. The system is designed to connect people who need help with local donors through a location-based matching system.

## Architecture Overview

The backend is built with:
- **Framework**: Node.js + Express
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT tokens (access + refresh)
- **Location Services**: Geospatial queries
- **Email Services**: Nodemailer

## Core Models

### User Model
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  phone: String,
  zipCode: String,
  address: String,
  coordinates: {
    latitude: Number,
    longitude: Number
  },
  role: "user" | "admin",
  status: "pending" | "approved" | "rejected",
  isEmailVerified: Boolean,
  profilePicture: String,
  createdAt: Date,
  updatedAt: Date
}
```

### HelpRequest Model
```javascript
{
  _id: ObjectId,
  recipientId: ObjectId, // User who needs help
  donorId: ObjectId,     // User who approved to help
  title: String,
  description: String,
  items: [{
    itemId: ObjectId,    // Reference to HelpItem
    quantity: Number,
    unit: String,
    description: String,
    urgency: "low" | "medium" | "high" | "critical"
  }],
  status: "open" | "approved" | "completed",
  priority: "low" | "medium" | "high" | "critical",
  category: String,
  preferredContactMethod: "phone" | "email" | "both",
  pickupLocation: {
    address: String,
    coordinates: { latitude: Number, longitude: Number },
    zipCode: String
  },
  availabilityWindow: {
    startDate: Date,
    endDate: Date,
    timeSlots: [{ day: String, startTime: String, endTime: String }]
  },
  images: [{ url: String, caption: String, uploadedAt: Date }],
  notes: [{ author: ObjectId, content: String, createdAt: Date }],
  rating: {
    recipientRating: { stars: Number, comment: String, createdAt: Date },
    donorRating: { stars: Number, comment: String, createdAt: Date }
  },
  metadata: {
    views: Number,
    interested: [{ userId: ObjectId, interestedAt: Date }],
    flagged: { isFlagged: Boolean, reason: String, flaggedBy: ObjectId, flaggedAt: Date }
  },
  createdAt: Date,
  updatedAt: Date
}
```

### HelpItem Model
```javascript
{
  _id: ObjectId,
  name: String,
  category: "food" | "clothing" | "medical" | "education" | "household" | "transportation" | "other",
  defaultQuantityUnit: "pieces" | "kg" | "liters" | "packets" | "boxes" | "bottles" | "sets",
  description: String,
  isActive: Boolean,
  icon: String,
  tags: [String],
  priority: Number,
  createdBy: ObjectId,
  lastModifiedBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

## API Base URL
```
http://localhost:3000/api
```

## Authentication

The API uses JWT tokens with access and refresh token strategy:
- **Access Token**: Short-lived (15 minutes), included in `Authorization: Bearer <token>`
- **Refresh Token**: Long-lived (7 days), used to get new access tokens

### Authentication Headers
```javascript
{
  "Authorization": "Bearer YOUR_ACCESS_TOKEN",
  "Content-Type": "application/json"
}
```

## Core API Endpoints

### 1. Authentication Flow

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "phone": "+1234567890",
  "zipCode": "12345",
  "address": "123 Main St, City, State",
  "coordinates": {
    "latitude": 40.7128,
    "longitude": -74.0060
  }
}
```

#### Verify Email with OTP
```http
POST /api/auth/verify-otp
Content-Type: application/json

{
  "email": "john@example.com",
  "otp": "123456"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePassword123"
}

Response:
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

#### Refresh Token
```http
POST /api/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "eyJ..."
}
```

### 2. Help Items (Offer Help Flow)

#### Get All Help Items
```http
GET /api/help/items?category=food&search=rice&page=1&limit=50
```

#### Get Categories
```http
GET /api/help/categories

Response:
{
  "success": true,
  "message": "Categories retrieved successfully",
  "data": {
    "categories": ["food", "clothing", "medical", "education", "household", "transportation", "other"]
  }
}
```

### 3. Help Requests (Request Help Flow)

#### Get Nearby Help Requests
```http
GET /api/help/requests?latitude=40.7128&longitude=-74.0060&radius=10&status=open&page=1&limit=20
Authorization: Bearer YOUR_ACCESS_TOKEN

Response:
{
  "success": true,
  "message": "Help requests retrieved successfully",
  "data": {
    "requests": [
      {
        "_id": "...",
        "title": "Need food supplies for family",
        "description": "...",
        "category": "food",
        "priority": "high",
        "status": "open",
        "recipientId": { "name": "Jane Doe", "zipCode": "12345" },
        "items": [...],
        "pickupLocation": {...},
        "distance": 2.5,
        "distanceFormatted": "2.5 km",
        "daysRemaining": 25,
        "totalItems": 10,
        "createdAt": "2024-01-15T10:00:00.000Z"
      }
    ]
  },
  "meta": {
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 100,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

#### Get Help Request Details
```http
GET /api/help/requests/:requestId
Authorization: Bearer YOUR_ACCESS_TOKEN

Response:
{
  "success": true,
  "message": "Help request retrieved successfully",
  "data": {
    "helpRequest": {
      "_id": "...",
      "title": "Need food supplies for family",
      "description": "...",
      "items": [
        {
          "itemId": {
            "_id": "...",
            "name": "Rice",
            "category": "food",
            "defaultQuantityUnit": "kg"
          },
          "quantity": 5,
          "unit": "kg",
          "urgency": "high"
        }
      ],
      "recipientId": {
        "name": "Jane Doe",
        "email": "jane@example.com",
        "phone": "+1234567890"
      },
      "pickupLocation": {
        "address": "456 Help St, City, State",
        "coordinates": { "latitude": 40.7589, "longitude": -73.9851 },
        "zipCode": "12346"
      },
      "availabilityWindow": {
        "startDate": "2024-01-15T00:00:00.000Z",
        "endDate": "2024-02-15T23:59:59.000Z",
        "timeSlots": [
          { "day": "monday", "startTime": "09:00", "endTime": "17:00" },
          { "day": "wednesday", "startTime": "10:00", "endTime": "16:00" }
        ]
      },
      "distance": 2.5,
      "distanceFormatted": "2.5 km",
      "canApprove": true,
      "canEdit": false,
      "metadata": {
        "views": 15,
        "interested": []
      }
    }
  }
}
```

#### Create Help Request
```http
POST /api/help/requests
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "title": "Need food supplies for family of 4",
  "description": "We are going through a difficult time and need help with basic food supplies for our family.",
  "items": [
    {
      "itemId": "HELP_ITEM_ID_1",
      "quantity": 5,
      "unit": "kg",
      "description": "White rice preferred",
      "urgency": "high"
    },
    {
      "itemId": "HELP_ITEM_ID_2",
      "quantity": 2,
      "unit": "liters",
      "urgency": "medium"
    }
  ],
  "priority": "high",
  "preferredContactMethod": "both",
  "availabilityWindow": {
    "startDate": "2024-01-15T00:00:00.000Z",
    "endDate": "2024-02-15T23:59:59.000Z",
    "timeSlots": [
      {
        "day": "monday",
        "startTime": "09:00",
        "endTime": "17:00"
      },
      {
        "day": "wednesday",
        "startTime": "10:00",
        "endTime": "16:00"
      }
    ]
  }
}

Note: The pickupLocation is automatically set from the user's registered address and coordinates, so it doesn't need to be included in the request body.
```

#### Approve Help Request (Offer Help)
```http
POST /api/help/requests/:requestId/approve
Authorization: Bearer YOUR_ACCESS_TOKEN
```

#### Complete Help Request
```http
POST /api/help/requests/:requestId/complete
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### 4. User Dashboard & Management

#### Get User Dashboard
```http
GET /api/user/dashboard
Authorization: Bearer YOUR_ACCESS_TOKEN

Response:
{
  "success": true,
  "message": "Dashboard data retrieved successfully",
  "data": {
    "user": { ... },
    "stats": {
      "totalRequests": 5,
      "completedRequests": 3,
      "totalDonations": 8,
      "completedDonations": 6
    },
    "recentRequests": [...],
    "recentDonations": [...],
    "nearbyRequests": [...],
    "notifications": [...]
  }
}
```

#### Get My Help Requests
```http
GET /api/user/requests?status=open&page=1&limit=10
Authorization: Bearer YOUR_ACCESS_TOKEN
```

#### Get My Donations (Approved Requests)
```http
GET /api/user/donations?page=1&limit=10
Authorization: Bearer YOUR_ACCESS_TOKEN
```

#### Get Nearby Requests
```http
GET /api/user/nearby-requests?radius=10&category=food&page=1&limit=20
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## Frontend Flow Documentation

### 1. Offer Help Flow

The "Offer Help" flow allows users to browse and help with existing requests:

#### Step 1: Browse Available Help Requests
```javascript
// Get nearby requests based on user location
const getNearbyRequests = async (userLocation, filters = {}) => {
  const params = new URLSearchParams({
    latitude: userLocation.latitude,
    longitude: userLocation.longitude,
    radius: filters.radius || 10,
    status: 'open',
    ...filters
  });

  const response = await fetch(`/api/help/requests?${params}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  return response.json();
};
```

#### Step 2: View Request Details
```javascript
// Get detailed information about a specific request
const getRequestDetails = async (requestId) => {
  const response = await fetch(`/api/help/requests/${requestId}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  return response.json();
};
```

#### Step 3: Offer Help (Approve Request)
```javascript
// Approve a help request to offer assistance
const offerHelp = async (requestId) => {
  const response = await fetch(`/api/help/requests/${requestId}/approve`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  return response.json();
};
```

#### Step 4: Communication & Completion
- Users can add notes to communicate
- Mark request as completed when help is delivered

### 2. Request Help Flow

The "Request Help" flow allows users to create new help requests:

#### Step 1: Select Help Items
```javascript
// Get available help items by category
const getHelpItems = async (category = '') => {
  const params = new URLSearchParams({ category, limit: 50 });
  const response = await fetch(`/api/help/items?${params}`);
  return response.json();
};

// Get all categories
const getCategories = async () => {
  const response = await fetch('/api/help/categories');
  return response.json();
};
```

#### Step 2: Set Quantities and Details
- User selects items and specifies quantities
- Sets urgency levels for each item
- Adds descriptions if needed

#### Step 3: Set Availability & Contact Preferences
- Define availability window (date range + time slots)
- Set preferred contact method
- Note: Pickup location is automatically set from user's registered address

#### Step 4: Create Request
```javascript
// Create a new help request
const createHelpRequest = async (requestData) => {
  const response = await fetch('/api/help/requests', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestData)
  });

  return response.json();
};
```

#### Step 5: Monitor Request Status
```javascript
// Get user's own requests
const getMyRequests = async (status = '') => {
  const params = new URLSearchParams({ status, page: 1, limit: 10 });
  const response = await fetch(`/api/user/requests?${params}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  return response.json();
};
```

### 3. Complete User Journey Examples

#### Frontend Component Structure Suggestions

```
src/
├── components/
│   ├── auth/
│   │   ├── LoginForm.jsx
│   │   ├── RegisterForm.jsx
│   │   └── OTPVerification.jsx
│   ├── help/
│   │   ├── HelpItemSelector.jsx
│   │   ├── RequestForm.jsx
│   │   ├── RequestCard.jsx
│   │   ├── RequestDetails.jsx
│   │   └── RequestFilters.jsx
│   ├── dashboard/
│   │   ├── Dashboard.jsx
│   │   ├── MyRequests.jsx
│   │   ├── MyDonations.jsx
│   │   └── Stats.jsx
│   └── common/
│       ├── LocationPicker.jsx
│       ├── ImageUpload.jsx
│       └── RatingComponent.jsx
├── pages/
│   ├── OfferHelp.jsx
│   ├── RequestHelp.jsx
│   ├── Dashboard.jsx
│   └── Profile.jsx
├── services/
│   ├── api.js
│   ├── auth.js
│   └── location.js
└── utils/
    ├── constants.js
    └── helpers.js
```

#### Sample API Service Implementation

```javascript
// services/api.js
class APIService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
    this.accessToken = localStorage.getItem('accessToken');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.accessToken && { 'Authorization': `Bearer ${this.accessToken}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }

      return data;
    } catch (error) {
      // Handle token refresh logic here
      throw error;
    }
  }

  // Help Requests
  async getNearbyRequests(location, filters = {}) {
    const params = new URLSearchParams({
      latitude: location.latitude,
      longitude: location.longitude,
      status: 'open',
      ...filters
    });
    return this.request(`/help/requests?${params}`);
  }

  async createHelpRequest(requestData) {
    return this.request('/help/requests', {
      method: 'POST',
      body: JSON.stringify(requestData)
    });
  }

  async approveHelpRequest(requestId) {
    return this.request(`/help/requests/${requestId}/approve`, {
      method: 'POST'
    });
  }

  // Help Items
  async getHelpItems(category = '') {
    return this.request(`/help/items?category=${category}&limit=50`);
  }

  async getCategories() {
    return this.request('/help/categories');
  }

  // User Management
  async getDashboard() {
    return this.request('/user/dashboard');
  }

  async getMyRequests(status = '') {
    return this.request(`/user/requests?status=${status}`);
  }

  async getMyDonations() {
    return this.request('/user/donations');
  }
}

export default new APIService();
```

## Error Handling

The API returns consistent error responses:

```javascript
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

Common HTTP status codes:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/expired token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limiting)
- `500` - Internal Server Error

## Rate Limiting

The API implements rate limiting:
- **Auth endpoints**: 5 requests per 15 minutes per IP
- **Search endpoints**: 30 requests per minute per IP
- **General endpoints**: 100 requests per 15 minutes per IP
- **Help request creation**: 5 requests per hour per user

## Location Services

The system uses geospatial queries for location-based matching:
- Coordinates should be provided as `{ latitude: Number, longitude: Number }`
- Distances are calculated using the Haversine formula
- Default search radius is 10km, maximum is 50km

## Real-time Features

Consider implementing these real-time features using WebSockets or Server-Sent Events:
- New help request notifications for nearby donors
- Request status updates (approved, completed)
- Real-time chat between recipients and donors

## Security Considerations

1. **Authentication**: Always include access tokens in protected requests
2. **Input Validation**: Validate all user inputs on the frontend before sending to API
3. **Location Privacy**: Consider allowing users to set approximate locations instead of exact coordinates
4. **Image Uploads**: Implement secure image upload and validation
5. **Rate Limiting**: Handle rate limit responses gracefully

## Testing

Test your integration with these scenarios:
1. User registration and email verification flow
2. Creating help requests with various item combinations
3. Browsing and filtering nearby requests
4. Approval and completion workflow
5. Error handling for various failure cases
6. Token refresh functionality

## Support

For backend API issues or questions, check the server logs or contact the backend development team.