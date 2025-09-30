# Update User Location API

## Endpoint
```
PATCH /api/auth/update-location
```

## Description
Update the authenticated user's location information including coordinates, address, and zip code.

## Authentication
**Required**: Yes
Include JWT access token in Authorization header

## Request Headers
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

## Request Body
```json
{
  "latitude": 40.7128,
  "longitude": -74.0060,
  "address": "123 Main Street, New York, NY",
  "zipCode": "10001"
}
```

### Parameters
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| latitude | number | Yes | Latitude coordinate | -90 to 90 |
| longitude | number | Yes | Longitude coordinate | -180 to 180 |
| address | string | No | Full address | Max 200 characters |
| zipCode | string | No | Postal/ZIP code | 5-10 characters |

## Success Response
**Status Code**: `200 OK`

```json
{
  "success": true,
  "message": "Location updated successfully",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "coordinates": {
        "latitude": 40.7128,
        "longitude": -74.0060
      },
      "address": "123 Main Street, New York, NY",
      "zipCode": "10001"
    }
  }
}
```

## Error Responses

### Validation Error (400)
```json
{
  "success": false,
  "message": "Validation Error",
  "errors": [
    {
      "field": "latitude",
      "message": "\"latitude\" is required"
    }
  ]
}
```

### Unauthorized (401)
```json
{
  "success": false,
  "message": "Authentication required"
}
```

### User Not Found (404)
```json
{
  "success": false,
  "message": "User not found"
}
```

### Server Error (500)
```json
{
  "success": false,
  "message": "Internal server error"
}
```

## Frontend Integration Example

### JavaScript (Fetch API)
```javascript
const updateUserLocation = async (locationData) => {
  const response = await fetch('http://localhost:5000/api/auth/update-location', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      address: locationData.address,
      zipCode: locationData.zipCode
    })
  });

  const data = await response.json();

  if (data.success) {
    console.log('Location updated:', data.data.user);
    return data.data.user;
  } else {
    throw new Error(data.message);
  }
};

// Usage
updateUserLocation({
  latitude: 40.7128,
  longitude: -74.0060,
  address: "123 Main Street, New York, NY",
  zipCode: "10001"
})
.then(user => console.log('Success:', user))
.catch(error => console.error('Error:', error));
```

### Axios Example
```javascript
import axios from 'axios';

const updateUserLocation = async (locationData) => {
  try {
    const response = await axios.patch(
      'http://localhost:5000/api/auth/update-location',
      {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        address: locationData.address,
        zipCode: locationData.zipCode
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    return response.data.data.user;
  } catch (error) {
    console.error('Error updating location:', error.response?.data);
    throw error;
  }
};
```

### React Hook Example
```javascript
import { useState } from 'react';

const useUpdateLocation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateLocation = async (latitude, longitude, address, zipCode) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5000/api/auth/update-location', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ latitude, longitude, address, zipCode })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      return data.data.user;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { updateLocation, loading, error };
};

// Usage in component
const LocationUpdateForm = () => {
  const { updateLocation, loading, error } = useUpdateLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const user = await updateLocation(
        40.7128,
        -74.0060,
        "123 Main Street, New York, NY",
        "10001"
      );
      console.log('Updated user:', user);
    } catch (err) {
      console.error('Failed to update:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Your form fields */}
      <button type="submit" disabled={loading}>
        {loading ? 'Updating...' : 'Update Location'}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
};
```

## Notes
- **Coordinates are required** - Both latitude and longitude must be provided
- **Address and zipCode are optional** - Can be updated independently
- **Immediate effect** - Location update takes effect immediately for location-based filtering in help requests
- **No location fallback** - If user has no location, help requests will show all available requests without distance filtering
- **Get user's current location** - Use browser's Geolocation API to get coordinates:
  ```javascript
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      updateUserLocation({ latitude, longitude });
    },
    (error) => console.error('Error getting location:', error)
  );
  ```