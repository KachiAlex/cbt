# Institution-Specific URLs Implementation Guide

## Overview

The CBT system now supports **institution-specific URLs** that provide each school with their own branded, exclusive login experience. This ensures complete data isolation and gives each institution their own unique web presence.

## How It Works

### 1. Institution-Specific URLs

Each institution gets their own unique URL based on their slug:

**Format**: `https://cbt.netlify.app/institution.html?slug={institution-slug}`

**Examples**:
- `https://cbt.netlify.app/institution.html?slug=harvard-university`
- `https://cbt.netlify.app/institution.html?slug=stanford-college`
- `https://cbt.netlify.app/institution.html?slug=mit-institute`

### 2. Branded Login Pages

Each institution's login page features:
- **Institution Name**: Displayed prominently at the top
- **Institution Logo**: If uploaded by the admin
- **Custom Branding**: Institution-specific styling
- **Exclusive Access**: Only users from that institution can log in

### 3. Complete Data Isolation

- **User Authentication**: Users can only log in to their own institution
- **Data Separation**: Each institution's data is completely isolated
- **Admin Management**: Institution admins can only manage their own users and content
- **Student Access**: Students can only access exams and results from their institution

## User Experience Flow

### For Institution Admins

1. **Access**: Go to their institution-specific URL
2. **Login**: Use admin credentials (username/password)
3. **Dashboard**: Access institution-specific admin dashboard
4. **Management**: Manage exams, students, results, and institution profile

### For Students

1. **Access**: Go to their institution-specific URL
2. **Login**: Use student ID and password
3. **Dashboard**: Access student dashboard with available exams
4. **Exams**: Take exams and view results

## Implementation Details

### Backend Changes

#### 1. Institution-Specific Landing Page
```javascript
// Route: /institution/:slug
app.get('/institution/:slug', async (req, res) => {
    // Serves branded login page for each institution
});
```

#### 2. Enhanced Authentication
```javascript
// Route: /api/auth/login
app.post('/api/auth/login', async (req, res) => {
    // Handles both managed admin and institution-specific login
    // Validates tenant_slug for institution users
});
```

#### 3. Dashboard Routes
```javascript
// Admin Dashboard: /admin-dashboard
// Student Dashboard: /student-dashboard
```

### Frontend Features

#### 1. Institution Branding
- Institution name and logo displayed
- Custom styling and branding
- Institution-specific color schemes

#### 2. User Type Selection
- Separate buttons for Admin and Student login
- Different forms for each user type
- Role-based validation

#### 3. Session Management
- User data stored in localStorage
- Tenant information preserved
- Automatic logout on session expiry

## Security Features

### 1. Multi-Tenant Isolation
- Users can only access their own institution's data
- Tenant validation on all API calls
- Suspended institutions cannot authenticate

### 2. Role-Based Access
- Admin users can only access admin features
- Student users can only access student features
- Default admin has additional privileges

### 3. Data Validation
- Username uniqueness within each institution
- Password validation and security
- Input sanitization and validation

## Managed Admin Platform Updates

### 1. Institution Management
The managed admin platform now shows:
- **Login URL**: Direct link to each institution's login page
- **Institution Status**: Active, suspended, or removed
- **Admin Details**: Default admin credentials
- **Quick Access**: Click to visit institution login page

### 2. URL Generation
- URLs are automatically generated from institution names
- Slugs are URL-friendly (lowercase, hyphens, no special characters)
- Duplicate slug prevention

## Usage Examples

### Creating a New Institution

1. **Managed Admin** creates institution "Harvard University"
2. **System generates** slug: `harvard-university`
3. **Login URL created**: `https://cbt.netlify.app/institution.html?slug=harvard-university`
4. **Default admin** can access and customize the institution

### Institution Customization

1. **Default Admin** logs in via institution URL
2. **Uploads logo** and updates institution name
3. **Creates additional admins** for the institution
4. **Manages students** and exams
5. **Customizes branding** and settings

### Student Access

1. **Students** visit their institution's URL
2. **Log in** with student ID and password
3. **Access exams** assigned to their institution
4. **View results** and progress

## Benefits

### 1. Brand Recognition
- Each institution has their own branded experience
- Logo and name prominently displayed
- Professional appearance for each school

### 2. Data Security
- Complete isolation between institutions
- No cross-institution data access
- Secure authentication per institution

### 3. User Experience
- Simple, direct access for each institution
- No confusion about which system to use
- Institution-specific navigation and features

### 4. Scalability
- Easy to add new institutions
- No impact on existing institutions
- Independent management and customization

## Technical Architecture

### URL Structure
```
Frontend (React App):
https://cbt.netlify.app/
├── /institution.html?slug={slug} (Institution Login Pages)
├── /admin-dashboard.html (Admin Dashboard)
└── /student-dashboard.html (Student Dashboard)

Backend (API):
https://cbt-rew7.onrender.com/
├── /admin (Managed Admin Platform)
└── /api/* (API Endpoints)
```

### Database Schema
```javascript
// Tenant Model
{
  name: "Institution Name",
  slug: "institution-slug",
  logo_url: "https://example.com/logo.png",
  // ... other fields
}

// User Model
{
  tenant_id: ObjectId, // Links to specific institution
  username: "user123",
  role: "admin" | "student",
  // ... other fields
}
```

### Authentication Flow
1. User visits institution URL
2. System validates institution exists and is active
3. User provides credentials
4. System validates against institution-specific users
5. User redirected to appropriate dashboard

## Deployment Information

### Current Deployment
- **Platform**: Render
- **URL**: `https://cbt-rew7.onrender.com`
- **Database**: MongoDB Atlas
- **Status**: Live and functional

### Testing
- Create test institutions via managed admin platform
- Access institution-specific URLs
- Test admin and student login flows
- Verify data isolation between institutions

## Future Enhancements

### 1. Custom Domains
- Support for custom domain names per institution
- SSL certificates for each domain
- Professional branding options

### 2. Advanced Branding
- Custom color schemes per institution
- Institution-specific themes
- Advanced logo and branding options

### 3. Integration Features
- SSO integration per institution
- API access for institution systems
- Webhook notifications

## Conclusion

The institution-specific URL system provides:
- **Complete data isolation** between institutions
- **Professional branding** for each school
- **Secure authentication** and access control
- **Scalable architecture** for multiple institutions
- **User-friendly experience** for all stakeholders

This implementation ensures that each institution has their own exclusive, branded CBT system while maintaining the benefits of a centralized managed platform.
