# Delete Help Request API

## Endpoint
```
DELETE /api/help/requests/:requestId
```

## Description
Delete your own help request. Only open requests can be deleted (not approved requests).

## Authentication
**Required**: Yes - Must be the request owner

## Request
```
DELETE /api/help/requests/507f1f77bcf86cd799439011
Authorization: Bearer <access_token>
```

### URL Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| requestId | string | The help request ID (24-char hex) |

## Success Response
**Status Code**: `200 OK`

```json
{
  "success": true,
  "message": "Help request deleted successfully"
}
```

## Error Responses

### Bad Request (400)
```json
{
  "success": false,
  "message": "Cannot delete approved help requests. Contact admin if needed."
}
```

### Unauthorized (401)
```json
{
  "success": false,
  "message": "Authentication required"
}
```

### Forbidden (403)
```json
{
  "success": false,
  "message": "You don't have permission to delete this request"
}
```

### Not Found (404)
```json
{
  "success": false,
  "message": "Help request not found"
}
```

## Frontend Example

```javascript
const deleteHelpRequest = async (requestId) => {
  const response = await fetch(`http://localhost:5000/api/help/requests/${requestId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  const data = await response.json();

  if (data.success) {
    console.log('Request deleted successfully');
  } else {
    console.error('Error:', data.message);
  }
};

// Usage
deleteHelpRequest('507f1f77bcf86cd799439011');
```

## Notes
- Only the request owner can delete their request
- Approved requests cannot be deleted (contact admin)
- Deletion is permanent and cannot be undone