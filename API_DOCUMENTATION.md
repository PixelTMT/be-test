# Excel Processing System - API Documentation

## Overview
This Node.js TypeScript application provides a comprehensive Excel file processing system with JWT authentication, background job processing, and dynamic filtering capabilities.

## Base URL
```
http://localhost:3150
```

## Authentication
All file-related endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## Authentication Endpoints

### Register User
**POST** `/auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "fullName": "John Doe"
}
```

**Response:**
```json
{
    "content": {
        "user": {
            "id": "2",
            "email": "user@example.com",
            "fullName": "John Doe",
            "role": "USER"
        },
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    },
    "message": "Registration successful",
    "errors": []
}
```

### Login
**POST** `/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
    "content": {
        "user": {
            "id": "2",
            "email": "user@example.com",
            "fullName": "John Doe",
            "role": "USER"
        },
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    },
    "message": "Login successful",
    "errors": []
}
```

### Get User Profile
**GET** `/auth/me`
**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
    "content": {
        "id": "2",
        "email": "user@example.com",
        "fullName": "John Doe",
        "role": "USER"
    },
    "message": "User profile retrieved successfully",
    "errors": []
}
```

### Verify Token
**GET** `/auth/verify`
**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
    "content": {
        "valid": true,
        "user": {
            "id": "2",
            "email": "user@example.com",
            "fullName": "John Doe",
            "role": "USER"
        }
    },
    "message": "Token is valid",
    "errors": []
}
```

---

## File Processing Endpoints

### Upload Excel File
**POST** `/files/upload`
**Headers:** 
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Request Body:** Form data with file field named `file`

**Supported File Types:** 
- `.xlsx`
- `.xls`

**Response:**
```json
{
    "content": {
        "jobId": "5",
        "fileProcessingId": "1",
        "message": "File processing started"
    },
    "message": "File uploaded successfully",
    "errors": []
}
```

### Get File Processing Status
**GET** `/files/:id/status`
**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
    "content": {
        "id": "1",
        "userId": "2",
        "filename": "1762245326150_ProductsList.xlsx",
        "originalName": "ProductsList.xlsx",
        "fileUrl": "D:\\Coding\\Web\\be-test\\uploads\\1762245326150_ProductsList.xlsx",
        "mimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "fileSize": 5220,
        "status": "COMPLETED",
        "totalRows": 10,
        "processedRows": 10,
        "createdAt": "2025-11-04T08:35:26.177Z",
        "updatedAt": "2025-11-04T08:35:26.391Z",
        "completedAt": "2025-11-04T08:35:26.389Z"
    },
    "message": "File status retrieved successfully",
    "errors": []
}
```

### Get File List (with Filtering & Pagination)
**GET** `/files`
**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `rows` (optional): Rows per page (default: 10, max: 100)
- `status` (optional): Filter by status (PENDING, IN_PROGRESS, COMPLETED, FAILED, CANCELLED)
- `search` (optional): Search in filename or original name
- `startDate` (optional): Filter files created after this date (ISO format)
- `endDate` (optional): Filter files created before this date (ISO format)

**Example:**
```
GET /files?page=1&rows=20&status=COMPLETED&search=sales&startDate=2025-11-01&endDate=2025-11-30
```

**Response:**
```json
{
    "content": {
        "files": [
            {
                "id": "10",
                "userId": "2",
                "filename": "1762246104540_SalesList.xlsx",
                "originalName": "SalesList.xlsx",
                "fileUrl": "D:\\Coding\\Web\\be-test\\uploads\\1762246104540_SalesList.xlsx",
                "mimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "fileSize": 5593,
                "status": "COMPLETED",
                "totalRows": 20,
                "processedRows": 20,
                "createdAt": "2025-11-04T08:48:24.542Z",
                "updatedAt": "2025-11-04T08:48:24.707Z",
                "completedAt": "2025-11-04T08:48:24.706Z"
            },
            {
                "id": "3",
                "userId": "2",
                "filename": "1762246066448_SalesList.xlsx",
                "originalName": "SalesList.xlsx",
                "fileUrl": "D:\\Coding\\Web\\be-test\\uploads\\1762246066448_SalesList.xlsx",
                "mimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "fileSize": 5593,
                "status": "COMPLETED",
                "totalRows": 20,
                "processedRows": 20,
                "createdAt": "2025-11-04T08:47:46.451Z",
                "updatedAt": "2025-11-04T08:47:46.623Z",
                "completedAt": "2025-11-04T08:47:46.621Z"
            },
            {
                "id": "2",
                "userId": "2",
                "filename": "1762245799650_SalesList.xlsx",
                "originalName": "SalesList.xlsx",
                "fileUrl": "D:\\Coding\\Web\\be-test\\uploads\\1762245799650_SalesList.xlsx",
                "mimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "fileSize": 5593,
                "status": "COMPLETED",
                "totalRows": 20,
                "processedRows": 20,
                "createdAt": "2025-11-04T08:43:19.652Z",
                "updatedAt": "2025-11-04T08:43:19.858Z",
                "completedAt": "2025-11-04T08:43:19.857Z"
            }
        ],
        "pagination": {
            "total": 3,
            "page": 1,
            "totalPages": 1,
            "rows": "20"
        }
    },
    "message": "File list retrieved successfully",
    "errors": []
}
```

### Get Processed Data
**GET** `/files/:id/data`
**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `rows` (optional): Rows per page (default: 50, max: 1000)

**Response:**
```json
{
    "content": {
        "data": [
            {
                "id": "863",
                "fileProcessingId": "14",
                "rowNumber": 2,
                "columnName": "Email",
                "value": "admin@test.com",
                "dataType": "string",
                "createdAt": "2025-11-04T08:57:17.964Z"
            },
            {
                "id": "862",
                "fileProcessingId": "14",
                "rowNumber": 2,
                "columnName": "Full Name",
                "value": "Admin",
                "dataType": "string",
                "createdAt": "2025-11-04T08:57:17.964Z"
            },
            {
                "id": "861",
                "fileProcessingId": "14",
                "rowNumber": 2,
                "columnName": "ID",
                "value": "1",
                "dataType": "number",
                "createdAt": "2025-11-04T08:57:17.964Z"
            },
            {
                "id": "864",
                "fileProcessingId": "14",
                "rowNumber": 2,
                "columnName": "Role",
                "value": "ADMIN",
                "dataType": "string",
                "createdAt": "2025-11-04T08:57:17.964Z"
            }
        ],
        "pagination": {
            "total": 4,
            "page": 1,
            "rows": 50
        }
    },
    "message": "Processed data retrieved successfully",
    "errors": []
}
```

### Retry Failed File Processing
**POST** `/files/:id/retry`
**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "File retry initiated successfully"
  },
  "message": "File retry has been queued"
}
```

### Delete File
**DELETE** `/files/:id`
**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
    "content": {
        "message": "File deleted successfully"
    },
    "message": "File and all its processed data have been deleted",
    "errors": []
}
```

---

## Status Codes

### Success Responses
- `200 OK` - Successful GET, PUT, DELETE requests
- `201 Created` - Successful POST requests (rarely used)
- `202 Accepted` - File upload in progress

### Client Error Responses
- `400 Bad Request` - Invalid request data or validation errors
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found

### Server Error Responses
- `500 Internal Server Error` - Server-side errors

---

## File Processing Workflow

1. **Upload**: User uploads Excel file via `/files/upload`
2. **Queue**: File is immediately queued for background processing
3. **Status**: User can check status via `/files/:id/status`
4. **Processing**: System reads Excel file and extracts data row by row
5. **Storage**: Processed data is stored in database with row/column mapping
6. **Completion**: Status updates to COMPLETED when finished

## Error Handling

All endpoints follow consistent error response format:
```json
{
  "success": false,
  "message": "Error description here"
}
```

## Rate Limiting
Currently no rate limiting is implemented, but should be added in production.

## Security Features
- JWT-based authentication
- File type validation (Excel files only)
- File size limits (10MB)
- User data isolation (users can only access their own files)
- Password hashing with bcrypt
- SQL injection protection via Prisma ORM

## Background Job System
For demo purposes, this implementation uses an in-memory queue. In production, consider:
- Redis + Bull Queue for persistent job processing
- Job retry mechanisms with exponential backoff
- Dead letter queues for failed jobs
- Job monitoring and alerts

## Database Schema
- **User**: User authentication and profiles
- **FileProcessing**: File upload metadata and processing status
- **ProcessedData**: Extracted cell data from Excel files with row/column mapping

## Performance Optimizations
- Database indexing on frequently queried fields
- Pagination for large result sets
- Batch database inserts for processed data
- File streaming for large Excel files
- Connection pooling via Prisma

## Development Notes
- Built with TypeScript for type safety
- Uses Prisma ORM for database operations
- Multer for file upload handling
- xlsx library for Excel file parsing
- Winston for logging
- Clean architecture with separation of concerns
