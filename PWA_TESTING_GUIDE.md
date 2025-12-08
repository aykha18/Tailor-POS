# 🧪 PWA Testing Guide - Tajir POS

## 📋 Overview

This guide covers testing the Progressive Web App (PWA) features in Tajir POS, including offline functionality, installation, and data synchronization.

---

## 🚀 Quick Start

### 1. Start Application
```bash
python app.py
```

### 2. Access PWA Dashboard
Navigate to: `http://localhost:5000/pwa-status`

---

## 🧪 Testing Checklist

### ✅ **Basic PWA Features**

#### **1. Manifest & Installation**
- [ ] Navigate to `http://localhost:5000/manifest.json` - verify JSON loads
- [ ] Check Chrome DevTools → Application → Manifest
- [ ] Verify "Install" button appears in browser
- [ ] Test desktop installation via "Install App" button

#### **2. Service Worker**
- [ ] Open DevTools → Application → Service Workers
- [ ] Verify service worker is registered and active
- [ ] Check Application → Cache Storage for cached assets

#### **3. Offline Functionality**
- [ ] Disconnect internet and refresh page
- [ ] Verify app loads from cache
- [ ] Test core functionality works offline
- [ ] Check IndexedDB for local data storage

### ✅ **Advanced Features**

#### **4. Data Synchronization**
- [ ] Use PWA Status Dashboard "Test Offline" button
- [ ] Verify test bill saves locally
- [ ] Reconnect internet and click "Sync Now"
- [ ] Check pending data syncs to server

#### **5. Notifications**
- [ ] Click "Test Notification" and grant permission
- [ ] Verify notification appears
- [ ] Test background notifications with closed browser

---

## 🔧 Troubleshooting

### Common Issues
- **Service Worker Not Registering**: Clear browser cache and reload
- **Offline Mode Not Working**: Check cache storage in DevTools
- **Sync Issues**: Verify internet connection and server status

### Debug Commands
```bash
# Check PWA status
curl http://localhost:5000/pwa-status

# Clear browser cache (Chrome)
# DevTools → Application → Storage → Clear site data
```

---

## 📊 Monitoring

### PWA Status Dashboard Features
- Installation status
- Online/offline status  
- Service Worker status
- Offline data counts
- Sync status
- Display mode

### Key Metrics to Monitor
- Offline data storage usage
- Sync success/failure rates
- Installation success rate
- Cache hit/miss ratios 