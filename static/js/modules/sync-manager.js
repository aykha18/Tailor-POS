class SyncManager {
  constructor() {
    this.offlineStorage = new OfflineStorage();
    this.syncQueue = [];
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    this.retryAttempts = 3;
    this.retryDelay = 5000; // 5 seconds
  }

  async init() {
    try {
      await this.offlineStorage.init();
      this.setupEventListeners();
      this.checkOnlineStatus();
      
      // Initial sync if online
      if (this.isOnline) {
        await this.syncPendingData();
      }
      
      console.log('SyncManager: Initialized successfully');
    } catch (error) {
      console.error('SyncManager: Initialization failed', error);
    }
  }

  setupEventListeners() {
    // Online/offline status changes
    window.addEventListener('online', () => {
      console.log('SyncManager: Connection restored');
      this.isOnline = true;
      this.syncPendingData();
    });

    window.addEventListener('offline', () => {
      console.log('SyncManager: Connection lost');
      this.isOnline = false;
    });

    // Service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SYNC_COMPLETED') {
          console.log('SyncManager: Background sync completed');
          this.handleSyncCompleted();
        }
      });
    }
  }

  checkOnlineStatus() {
    this.isOnline = navigator.onLine;
    console.log('SyncManager: Online status:', this.isOnline);
  }

  async saveOfflineBill(billData) {
    try {
      // Generate a temporary ID for offline bills
      const offlineId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      billData.bill_id = offlineId;
      billData.offline_created = true;
      billData.created_at = new Date().toISOString();

      // Save to IndexedDB
      await this.offlineStorage.saveData('bills', billData);
      
      // Add to sync queue
      await this.offlineStorage.addPendingSync('bill', billData);
      
      console.log('SyncManager: Bill saved offline', offlineId);
      
      // Try to sync if online
      if (this.isOnline) {
        this.syncPendingData();
      }
      
      return offlineId;
    } catch (error) {
      console.error('SyncManager: Failed to save offline bill', error);
      throw error;
    }
  }

  async saveOfflineCustomer(customerData) {
    try {
      const offlineId = `offline_customer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      customerData.customer_id = offlineId;
      customerData.offline_created = true;
      customerData.created_at = new Date().toISOString();

      await this.offlineStorage.saveData('customers', customerData);
      await this.offlineStorage.addPendingSync('customer', customerData);
      
      console.log('SyncManager: Customer saved offline', offlineId);
      
      if (this.isOnline) {
        this.syncPendingData();
      }
      
      return offlineId;
    } catch (error) {
      console.error('SyncManager: Failed to save offline customer', error);
      throw error;
    }
  }

  async saveOfflineProduct(productData) {
    try {
      const offlineId = `offline_product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      productData.product_id = offlineId;
      productData.offline_created = true;
      productData.created_at = new Date().toISOString();

      await this.offlineStorage.saveData('products', productData);
      await this.offlineStorage.addPendingSync('product', productData);
      
      console.log('SyncManager: Product saved offline', offlineId);
      
      if (this.isOnline) {
        this.syncPendingData();
      }
      
      return offlineId;
    } catch (error) {
      console.error('SyncManager: Failed to save offline product', error);
      throw error;
    }
  }

  async syncPendingData() {
    if (!this.isOnline || this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;
    console.log('SyncManager: Starting sync process...');

    try {
      const pendingItems = await this.offlineStorage.getPendingSync();
      
      if (pendingItems.length === 0) {
        console.log('SyncManager: No pending items to sync');
        return;
      }

      console.log(`SyncManager: Found ${pendingItems.length} pending items`);

      for (const item of pendingItems) {
        try {
          await this.syncItem(item);
          await this.offlineStorage.removePendingSync(item.id);
          console.log(`SyncManager: Successfully synced item ${item.id}`);
        } catch (error) {
          console.error(`SyncManager: Failed to sync item ${item.id}`, error);
          
          // Increment retry count
          item.retryCount = (item.retryCount || 0) + 1;
          
          if (item.retryCount >= this.retryAttempts) {
            console.error(`SyncManager: Max retries reached for item ${item.id}`);
            await this.offlineStorage.removePendingSync(item.id);
          } else {
            // Update the item with new retry count
            await this.offlineStorage.saveData('pending_sync', item);
          }
        }
      }
    } catch (error) {
      console.error('SyncManager: Sync process failed', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  async syncItem(item) {
    const { type, data } = item;
    
    switch (type) {
      case 'bill':
        return this.syncBill(data);
      case 'customer':
        return this.syncCustomer(data);
      case 'product':
        return this.syncProduct(data);
      default:
        throw new Error(`Unknown sync type: ${type}`);
    }
  }

  async syncBill(billData) {
    const response = await fetch('/api/bills', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(billData)
    });

    if (!response.ok) {
      throw new Error(`Failed to sync bill: ${response.status}`);
    }

    const result = await response.json();
    console.log('SyncManager: Bill synced successfully', result);
    return result;
  }

  async syncCustomer(customerData) {
    const response = await fetch('/api/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(customerData)
    });

    if (!response.ok) {
      throw new Error(`Failed to sync customer: ${response.status}`);
    }

    const result = await response.json();
    console.log('SyncManager: Customer synced successfully', result);
    return result;
  }

  async syncProduct(productData) {
    const response = await fetch('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(productData)
    });

    if (!response.ok) {
      throw new Error(`Failed to sync product: ${response.status}`);
    }

    const result = await response.json();
    console.log('SyncManager: Product synced successfully', result);
    return result;
  }

  async loadOfflineData() {
    try {
      const [customers, products, bills] = await Promise.all([
        this.offlineStorage.getAllData('customers'),
        this.offlineStorage.getAllData('products'),
        this.offlineStorage.getAllData('bills')
      ]);

      return {
        customers,
        products,
        bills
      };
    } catch (error) {
      console.error('SyncManager: Failed to load offline data', error);
      return { customers: [], products: [], bills: [] };
    }
  }

  async getPendingSyncCount() {
    try {
      const pendingItems = await this.offlineStorage.getPendingSync();
      return pendingItems.length;
    } catch (error) {
      console.error('SyncManager: Failed to get pending sync count', error);
      return 0;
    }
  }

  async registerBackgroundSync() {
    if (!('serviceWorker' in navigator) || !('sync' in window)) {
      console.warn('SyncManager: Background sync not supported');
      return;
    }

    try {
      // Check if we have permission
      const permission = await navigator.permissions.query({ name: 'background-sync' });
      
      if (permission.state === 'denied') {
        console.warn('SyncManager: Background sync permission denied');
        return;
      }
      
      // Register background sync with better error handling
      const registration = await navigator.serviceWorker.ready;
      
      if (registration.sync) {
        await registration.sync.register('background-sync');
        console.log('SyncManager: Background sync registered successfully');
      } else {
        console.warn('SyncManager: Background sync not available in service worker');
      }
    } catch (error) {
      console.warn('SyncManager: Failed to register background sync', error.message);
      // Don't throw error, just log it as a warning
    }
  }

  handleSyncCompleted() {
    // Notify the UI that sync is completed
    const event = new CustomEvent('syncCompleted', {
      detail: { timestamp: Date.now() }
    });
    window.dispatchEvent(event);
  }

  async getSyncStatus() {
    const pendingCount = await this.getPendingSyncCount();
    const dbSize = await this.offlineStorage.getDatabaseSize();
    
    return {
      isOnline: this.isOnline,
      pendingSyncCount: pendingCount,
      databaseSize: dbSize,
      lastSync: await this.offlineStorage.getSetting('lastSync')
    };
  }

  async updateLastSync() {
    await this.offlineStorage.saveSetting('lastSync', Date.now());
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SyncManager;
} 