# Cloud Storage Setup for Multi-Tenant Admin Platform

## Overview
The multi-tenant admin platform now uses cloud-based storage instead of a backend database. This provides better scalability and eliminates the need for backend API calls.

## Current Implementation
The platform uses a JSON file hosted on GitHub as cloud storage. You can replace this with any cloud storage service.

## Setup Options

### 1. GitHub (Current Implementation)
- Create a GitHub repository (e.g., `cbt-tenants`)
- Create a `tenants.json` file with the following structure:

```json
{
  "institutions": [
    {
      "id": "inst-1234567890",
      "name": "Example University",
      "slug": "example-university",
      "address": "123 Main St, City, State",
      "contact_phone": "+1234567890",
      "contact_email": "admin@example.edu",
      "plan": "Basic",
      "timezone": "UTC",
      "suspended": false,
      "created_at": "2024-01-01T00:00:00.000Z",
      "default_admin": {
        "id": "admin-1234567890",
        "fullName": "John Doe",
        "email": "john.doe@example.edu",
        "username": "johndoe",
        "phone": "+1234567890",
        "password": "hashed_password_here"
      }
    }
  ],
  "lastUpdated": "2024-01-01T00:00:00.000Z"
}
```

- Update the `CLOUD_STORAGE_URL` in `MultiTenantAdmin.js` and `App.js` to point to your raw GitHub file:
  ```javascript
  const CLOUD_STORAGE_URL = 'https://raw.githubusercontent.com/your-username/cbt-tenants/main/tenants.json';
  ```

### 2. Firebase Firestore (Recommended for Production)
- Set up a Firebase project
- Create a Firestore database
- Update the code to use Firebase SDK

### 3. AWS S3
- Create an S3 bucket
- Upload a JSON file with tenant data
- Configure CORS for web access
- Update the code to use AWS SDK

### 4. Google Cloud Storage
- Create a GCS bucket
- Upload a JSON file with tenant data
- Make the file publicly readable
- Update the code to use Google Cloud SDK

### 5. Any Web Server
- Host a JSON file on any web server
- Ensure CORS is properly configured
- Update the `CLOUD_STORAGE_URL` to point to your server

## Implementation Notes

### Current Features
- ✅ Institution creation
- ✅ Institution listing
- ✅ Institution status toggle (suspend/activate)
- ✅ Institution deletion
- ✅ Institution-specific login pages

### Security Considerations
- The current implementation stores data in a public JSON file
- For production use, implement proper authentication and authorization
- Consider using a proper database with user authentication
- Implement data validation and sanitization

### Data Persistence
- The current implementation uses localStorage as a backup
- For production, implement proper cloud storage with real-time updates
- Consider implementing data synchronization between multiple instances

## Next Steps
1. Choose your preferred cloud storage solution
2. Update the `CLOUD_STORAGE_URL` in the code
3. Implement proper authentication if needed
4. Test the multi-tenant functionality
5. Deploy to production

## Troubleshooting
- If you get CORS errors, ensure your cloud storage allows cross-origin requests
- If data doesn't update, check if your cloud storage supports real-time updates
- For GitHub, you may need to implement a webhook to trigger updates 