# API Documentation

## Overview
The Child Health Record API provides endpoints for managing child health data, authentication, and generating health booklets.

## Base URL
```
http://localhost:3001/api
```

## Authentication
Most endpoints require authentication via Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

## Endpoints

### Health Check
**GET** `/health`

Check if the API server is running.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-01-27T10:30:00.000Z"
}
```

### Child Records

#### Upload Child Record
**POST** `/child-records`

Upload a new child health record or update an existing one.

**Headers:**
- `Content-Type: application/json`
- `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "id": "child_1706349000000",
  "healthId": "CHR-1ABCD2EF-12345678",
  "childName": "John Doe",
  "facePhoto": "data:image/jpeg;base64,...",
  "age": 5,
  "childWeight": 18.5,
  "childHeight": 110,
  "parentGuardianName": "Jane Doe",
  "visibleSignsMalnutrition": "None reported",
  "recentIllnesses": "None reported",
  "parentalConsent": true,
  "location": {
    "latitude": 12.9716,
    "longitude": 77.5946
  },
  "createdAt": "2025-01-27T10:30:00.000Z",
  "updatedAt": "2025-01-27T10:30:00.000Z",
  "isUploaded": false,
  "representativeId": "rep_1706349000000",
  "language": "en"
}
```

**Response:**
```json
{
  "success": true,
  "healthId": "CHR-1ABCD2EF-12345678"
}
```

**Error Response:**
```json
{
  "error": "Missing required fields"
}
```

#### Get All Child Records
**GET** `/child-records`

Retrieve all child health records.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
[
  {
    "id": "child_1706349000000",
    "healthId": "CHR-1ABCD2EF-12345678",
    "childName": "John Doe",
    "age": 5,
    "childWeight": 18.5,
    "childHeight": 110,
    "parentGuardianName": "Jane Doe",
    "uploadedAt": "2025-01-27T10:35:00.000Z",
    ...
  }
]
```

#### Get Child Record by Health ID
**GET** `/child-records/:healthId`

Retrieve a specific child record by Health ID.

**Parameters:**
- `healthId` (string): The unique Health ID

**Response:**
```json
{
  "id": "child_1706349000000",
  "healthId": "CHR-1ABCD2EF-12345678",
  "childName": "John Doe",
  "facePhoto": "data:image/jpeg;base64,...",
  "age": 5,
  "childWeight": 18.5,
  "childHeight": 110,
  "parentGuardianName": "Jane Doe",
  "visibleSignsMalnutrition": "None reported",
  "recentIllnesses": "None reported",
  "parentalConsent": true,
  "location": {
    "latitude": 12.9716,
    "longitude": 77.5946
  },
  "createdAt": "2025-01-27T10:30:00.000Z",
  "updatedAt": "2025-01-27T10:30:00.000Z",
  "uploadedAt": "2025-01-27T10:35:00.000Z",
  "representativeId": "rep_1706349000000",
  "language": "en"
}
```

**Error Response:**
```json
{
  "error": "Record not found"
}
```

#### Delete All Records
**DELETE** `/child-records`

Delete all child records (for testing purposes).

**Response:**
```json
{
  "success": true,
  "message": "All records deleted"
}
```

### Health Booklets

#### Generate Health Booklet PDF
**GET** `/health-booklet/:healthId`

Generate and retrieve a PDF health booklet for a specific child.

**Parameters:**
- `healthId` (string): The unique Health ID

**Headers:**
- `Accept: application/pdf`

**Response:**
- Content-Type: `application/pdf`
- Binary PDF data

**Error Response:**
```json
{
  "error": "Record not found"
}
```

### Statistics

#### Get Dashboard Statistics
**GET** `/statistics`

Retrieve statistics for the admin dashboard.

**Response:**
```json
{
  "totalRecords": 150,
  "uploadedRecords": 120,
  "pendingRecords": 30,
  "malnutritionCases": 25,
  "regions": [
    {
      "name": "North",
      "count": 45
    },
    {
      "name": "South",
      "count": 38
    },
    {
      "name": "East",
      "count": 37
    },
    {
      "name": "West",
      "count": 30
    }
  ]
}
```

## Error Handling

### HTTP Status Codes
- `200` - Success
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid token)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

### Error Response Format
```json
{
  "error": "Error message description",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  }
}
```

## Rate Limiting
Currently no rate limiting is implemented. In production, consider implementing:
- Rate limiting per IP address
- Rate limiting per authenticated user
- Different limits for different endpoints

## Data Validation

### Required Fields for Child Records
- `healthId` (string): Unique identifier
- `childName` (string): Child's full name
- `age` (number): Age in years
- `childWeight` (number): Weight in kg
- `childHeight` (number): Height in cm
- `parentGuardianName` (string): Parent/guardian name
- `parentalConsent` (boolean): Must be true

### Optional Fields
- `facePhoto` (string): Base64 encoded image
- `visibleSignsMalnutrition` (string): Description
- `recentIllnesses` (string): Description
- `location` (object): GPS coordinates
- `language` (string): Preferred language code

## Security Considerations

### Authentication
- Use secure tokens (JWT recommended)
- Implement token expiration
- Validate tokens on each request

### Data Protection
- Encrypt sensitive data in transit (HTTPS)
- Validate and sanitize all inputs
- Implement proper CORS policies

### Privacy
- Ensure parental consent is recorded
- Implement data retention policies
- Provide data deletion capabilities

## Integration Examples

### JavaScript/Fetch
```javascript
// Upload a child record
const response = await fetch('/api/child-records', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(childRecord)
});

const result = await response.json();
```

### cURL
```bash
# Get all records
curl -H "Authorization: Bearer <token>" \
     http://localhost:3001/api/child-records

# Upload a record
curl -X POST \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <token>" \
     -d @child-record.json \
     http://localhost:3001/api/child-records
```

## Testing

### Health Check
```bash
curl http://localhost:3001/api/health
```

### Mock Data
The API includes mock data generation for testing purposes. In production, replace with actual database operations.

## Future Enhancements

### Planned Features
- Real-time notifications
- Bulk upload endpoints
- Advanced filtering and search
- Data export in multiple formats
- Integration with external health systems

### Database Integration
Replace in-memory storage with:
- PostgreSQL for relational data
- MongoDB for document storage
- Redis for caching and sessions