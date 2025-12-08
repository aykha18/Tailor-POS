# Tajir POS Domain Setup Guide

## 🌐 Connecting tajirtech.com to Railway

Your Tajir POS app is already deployed on Railway at: [https://tajir.up.railway.app/app](https://tajir.up.railway.app/app)

### **Step 1: Railway Domain Configuration**

1. **Login to Railway Dashboard**
   - Go to [railway.app](https://railway.app)
   - Select your Tajir POS project

2. **Add Custom Domain**
   - Go to **Settings → Domains**
   - Click **"Add Domain"**
   - Enter: `tajirtech.com`
   - Railway will provide DNS instructions

### **Step 2: Hostinger DNS Configuration**

Since you bought the domain from Hostinger:

1. **Login to Hostinger**
   - Go to [hpanel.hostinger.com](https://hpanel.hostinger.com)
   - Navigate to **Domains → tajirtech.com → DNS**

2. **Add DNS Records**

#### **Option A: CNAME Record (Recommended)**
```
Type: CNAME
Name: @ (or leave empty)
Value: tajir.up.railway.app
TTL: 300 (or automatic)
```

#### **Option B: A Record (Alternative)**
```
Type: A
Name: @ (or leave empty)
Value: [Railway IP address from dashboard]
TTL: 300
```

### **Step 3: SSL Certificate**

Railway automatically provides SSL certificates for custom domains. Once DNS is configured:
- Your site will be available at `https://tajirtech.com`
- SSL certificate will be automatically provisioned

### **Step 4: Verify Setup**

1. **Wait for DNS propagation** (can take up to 24 hours)
2. **Test your domain**: Visit `https://tajirtech.com`
3. **Check SSL**: Ensure the padlock icon appears in browser

### **Step 5: Update App Configuration**

The app is already configured for production. Key settings:

- **Port**: Uses `PORT` environment variable from Railway
- **Host**: `0.0.0.0` (accepts all connections)
- **Debug**: Disabled in production
- **Database**: Uses Railway's persistent storage

### **Step 6: Environment Variables (Optional)**

In Railway dashboard, you can set these environment variables:

```
SECRET_KEY=your-secure-secret-key
DATABASE_URL=your-database-url
RAILWAY_ENVIRONMENT=production
```

### **Troubleshooting**

#### **Domain Not Working?**
1. Check DNS propagation: [whatsmydns.net](https://whatsmydns.net)
2. Verify DNS records in Hostinger
3. Check Railway domain settings

#### **SSL Issues?**
1. Wait for SSL certificate provisioning (up to 1 hour)
2. Check if domain is properly configured in Railway
3. Clear browser cache and try again

#### **App Not Loading?**
1. Check Railway deployment status
2. View Railway logs for errors
3. Verify the app is running on Railway

### **Current URLs**

- **Railway URL**: https://tajir.up.railway.app/app
- **Custom Domain**: https://tajirtech.com (after setup)
- **Landing Page**: https://tajirtech.com/ (after setup)

### **Support**

If you encounter issues:
- **Railway Support**: [railway.app/support](https://railway.app/support)
- **Hostinger Support**: [hostinger.com/support](https://hostinger.com/support)
- **WhatsApp**: +971 50 390 4508 or +971 52 456 6488

---

**Note**: DNS changes can take up to 24 hours to propagate globally, but usually work within 1-2 hours.
