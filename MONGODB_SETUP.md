# MongoDB Atlas Setup for Multi-Tenant Admin Platform

## Overview
The multi-tenant admin platform now uses MongoDB Atlas for data storage, providing a robust, scalable, and secure database solution.

## Current Implementation

### Backend API Endpoints
- **Create Tenant**: `POST /api/tenants`
- **List Tenants**: `GET /api/tenants`
- **Delete Tenant**: `DELETE /api/tenants/:slug`
- **Toggle Status**: `PATCH /api/tenants/:slug/toggle-status`
- **Get Profile**: `GET /api/tenant/:slug/profile`
- **Update Profile**: `PUT /api/tenant/:slug/profile`

### Database Schema

#### Tenant Collection
```javascript
{
  name: String,           // Institution name
  slug: String,           // URL-friendly identifier
  address: String,        // Institution address
  contact_email: String,  // Contact email
  contact_phone: String,  // Contact phone
  plan: String,           // Subscription plan (Basic/Premium/Enterprise)
  timezone: String,       // Timezone
  logo_url: String,       // Institution logo URL
  suspended: Boolean,     // Account status
  default_admin: {        // Default administrator
    username: String,
    email: String,
    fullName: String,
    phone: String,
    password: String
  },
  settings: {             // Institution settings
    max_students: Number,
    max_exams: Number,
    features: [String]
  },
  deleted_at: Date,       // Soft delete timestamp
  createdAt: Date,        // Creation timestamp
  updatedAt: Date         // Last update timestamp
}
```

#### User Collection (Extended)
```javascript
{
  tenant_id: ObjectId,    // Reference to tenant
  username: String,       // Username
  email: String,          // Email
  fullName: String,       // Full name
  phone: String,          // Phone number
  password: String,       // Hashed password
  role: String,           // User role (tenant_admin, student, admin)
  is_default_admin: Boolean, // Is default admin for tenant
  is_active: Boolean,     // Account status
  createdAt: Date,        // Creation timestamp
  updatedAt: Date         // Last update timestamp
}
```

## Features

### ✅ Implemented
- **Tenant Creation**: Create new institutions with default admin
- **Tenant Listing**: View all institutions with status
- **Tenant Management**: Suspend/activate institutions
- **Tenant Deletion**: Soft delete with user cleanup
- **Profile Management**: Get and update tenant profiles
- **User Management**: Create tenant-specific admin users
- **Data Validation**: Required fields and format validation
- **Soft Deletes**: Preserve data integrity
- **Indexing**: Optimized database queries

### 🔄 Real-time Updates
- Frontend automatically refreshes data after operations
- Immediate UI updates for better user experience
- Error handling and user feedback

### 🔒 Security Features
- Password hashing for admin accounts
- Input validation and sanitization
- Soft deletes to prevent data loss
- Role-based access control

## Database Connection

The backend connects to MongoDB Atlas using the connection string in the `.env` file:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cbt_database
```

## API Response Format

### Success Response
```json
{
  "message": "Operation successful",
  "tenant": {
    "id": "tenant_id",
    "name": "Institution Name",
    "slug": "institution-name",
    "contact_email": "admin@institution.edu",
    "plan": "Basic",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### Error Response
```json
{
  "error": "Error message description"
}
```

## Usage Examples

### Create a New Institution
```javascript
const response = await fetch('https://cbt-rew7.onrender.com/api/tenants', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Example University',
    address: '123 Main St, City, State',
    contact_phone: '+1234567890',
    plan: 'Basic',
    timezone: 'UTC',
    default_admin: {
      fullName: 'John Doe',
      email: 'john.doe@example.edu',
      username: 'johndoe',
      phone: '+1234567890',
      password: 'securepassword123'
    }
  })
});
```

### Get All Institutions
```javascript
const response = await fetch('https://cbt-rew7.onrender.com/api/tenants');
const institutions = await response.json();
```

### Get Institution Profile
```javascript
const response = await fetch('https://cbt-rew7.onrender.com/api/tenant/example-university/profile');
const profile = await response.json();
```

## Monitoring and Maintenance

### Database Indexes
- `slug`: For efficient tenant lookups
- `deleted_at`: For soft delete queries
- `suspended`: For status filtering

### Backup Strategy
- MongoDB Atlas provides automatic backups
- Point-in-time recovery available
- Data retention policies configurable

### Performance Optimization
- Indexed queries for fast lookups
- Lean queries for read operations
- Efficient data structure design

## Troubleshooting

### Common Issues
1. **Connection Errors**: Check MongoDB Atlas connection string
2. **Validation Errors**: Ensure all required fields are provided
3. **Duplicate Slugs**: Institution names must be unique
4. **Permission Errors**: Check user roles and permissions

### Debug Steps
1. Check backend logs for error messages
2. Verify database connection status
3. Test API endpoints individually
4. Validate request payload format

## Next Steps
1. ✅ MongoDB Atlas integration complete
2. ✅ API endpoints implemented
3. ✅ Frontend integration complete
4. 🔄 Monitor performance and usage
5. 🔄 Add additional features as needed 