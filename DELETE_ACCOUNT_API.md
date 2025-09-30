# Delete Account API

## Endpoint
```
DELETE /api/user/account
```

## Description
Permanently delete your account. Requires password confirmation and no active help requests.

## Authentication
**Required**: Yes

## Request
```
DELETE /api/user/account
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Request Body
```json
{
  "password": "your_password"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| password | string | Yes | Current account password for confirmation |

## Success Response
**Status Code**: `200 OK`

```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

## Error Responses

### Bad Request (400) - Missing Password
```json
{
  "success": false,
  "message": "Password is required to delete account"
}
```

### Bad Request (400) - Invalid Password
```json
{
  "success": false,
  "message": "Invalid password"
}
```

### Bad Request (400) - Active Requests
```json
{
  "success": false,
  "message": "Cannot delete account with active help requests. Please complete or cancel them first."
}
```

### Unauthorized (401)
```json
{
  "success": false,
  "message": "Authentication required"
}
```

## Frontend Example

```javascript
const deleteAccount = async (password) => {
  const response = await fetch('http://localhost:5000/api/user/account', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({ password })
  });

  const data = await response.json();

  if (data.success) {
    console.log('Account deleted successfully');
    // Clear tokens and redirect to login
    localStorage.removeItem('accessToken');
    window.location.href = '/login';
  } else {
    console.error('Error:', data.message);
  }
};

// Usage
deleteAccount('myPassword123');
```

## Notes
- Password confirmation is required for security
- Cannot delete account with active (open/approved) help requests
- Complete or cancel all active requests before deletion
- Account deletion is permanent and cannot be undone
- All user data will be removed