# Deploying CBT Backend to Render

This guide will help you deploy your CBT backend to Render, which is often simpler than Vercel for Node.js applications.

## Prerequisites

1. **GitHub Repository**: Your code should be in a GitHub repository
2. **Render Account**: Sign up at [render.com](https://render.com)

## Step 1: Prepare Your Repository

Your repository is already configured with:
- ✅ `render.yaml` - Render configuration file
- ✅ `package.json` - Proper start script
- ✅ `src/server.js` - Main application file

## Step 2: Deploy to Render

### Option A: Using render.yaml (Recommended)

1. **Go to [Render Dashboard](https://dashboard.render.com)**
2. **Click "New +" → "Blueprint"**
3. **Connect your GitHub repository**
4. **Select your CBT backend repository**
5. **Render will automatically detect the `render.yaml` file**
6. **Click "Apply" to deploy**

### Option B: Manual Setup

1. **Go to [Render Dashboard](https://dashboard.render.com)**
2. **Click "New +" → "Web Service"**
3. **Connect your GitHub repository**
4. **Configure the service:**
   - **Name**: `cbt-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

## Step 3: Environment Variables

After deployment, go to your service settings and add these environment variables:

### Required Variables:
- `NODE_ENV` = `production`
- `JWT_SECRET` = [Generate a strong secret]
- `PORT` = `10000` (Render will override this automatically)

### Optional Variables (if you add database later):
- `MONGODB_URI` = Your MongoDB connection string
- `DB_TYPE` = `mongodb`

## Step 4: Generate JWT Secret

You can generate a strong JWT secret using:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Or use an online generator like:
- https://generate-secret.vercel.app/64

## Step 5: Test Your Deployment

Once deployed, your API will be available at:
`https://your-service-name.onrender.com`

Test endpoints:
- Health check: `https://your-service-name.onrender.com/health`
- API info: `https://your-service-name.onrender.com/api`

## Advantages of Render over Vercel

✅ **Simpler configuration** - No complex routing needed
✅ **Better for Node.js APIs** - Designed for backend services
✅ **Free tier available** - No credit card required
✅ **Automatic HTTPS** - SSL certificates included
✅ **Custom domains** - Easy to set up
✅ **Environment variables** - Simple UI for management

## Troubleshooting

### Common Issues:

1. **Build fails**: Check that all dependencies are in `package.json`
2. **Port issues**: Render automatically sets PORT environment variable
3. **Environment variables**: Make sure JWT_SECRET is set
4. **Timeout**: Free tier has 15-minute timeout for inactivity

### Useful Commands:

```bash
# Test locally
npm start

# Check logs in Render dashboard
# Go to your service → Logs tab
```

## Next Steps

After successful deployment:

1. **Update your frontend** to use the new Render URL
2. **Set up your database** (MongoDB Atlas recommended)
3. **Configure CORS** if needed
4. **Add authentication routes** using the JWT configuration

## Support

- [Render Documentation](https://render.com/docs)
- [Render Community](https://community.render.com)
- [Node.js on Render](https://render.com/docs/deploy-node-express-app)

Your backend should deploy much more smoothly on Render! 🚀 