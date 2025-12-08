class OfflineStorage {
  constructor() {
    this.dbName = 'TajirPOS';
    this.dbVersion = 1;
    this.db = null;
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => {
        console.error('IndexedDB: Failed to open database', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('IndexedDB: Database opened successfully');
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        console.log('IndexedDB: Upgrading database...');
        const db = event.target.result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('customers')) {
          const customerStore = db.createObjectStore('customers', { keyPath: 'customer_id' });
          customerStore.createIndex('name', 'name', { unique: false });
          customerStore.createIndex('phone', 'phone', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('products')) {
          const productStore = db.createObjectStore('products', { keyPath: 'product_id' });
          productStore.createIndex('name', 'name', { unique: false });
          productStore.createIndex('type_id', 'type_id', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('bills')) {
          const billStore = db.createObjectStore('bills', { keyPath: 'bill_id' });
          billStore.createIndex('customer_id', 'customer_id', { unique: false });
          billStore.createIndex('date', 'date', { unique: false });
          billStore.createIndex('status', 'status', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('pending_sync')) {
          const syncStore = db.createObjectStore('pending_sync', { keyPath: 'id', autoIncrement: true });
          syncStore.createIndex('type', 'type', { unique: false });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('settings')) {
          const settingsStore = db.createObjectStore('settings', { keyPath: 'key' });
        }
        
        console.log('IndexedDB: Database upgrade completed');
      };
    });
  }

  async saveData(storeName, data) {
    await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const request = store.put(data);
      
      request.onsuccess = () => {
        console.log(`IndexedDB: Saved data to ${storeName}`, data);
        resolve(request.result);
      };
      
      request.onerror = () => {
        console.error(`IndexedDB: Failed to save data to ${storeName}`, request.error);
        reject(request.error);
      };
    });
  }

  async getData(storeName, key) {
    await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      
      const request = store.get(key);
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = () => {
        console.error(`IndexedDB: Failed to get data from ${storeName}`, request.error);
        reject(request.error);
      };
    });
  }

  async getAllData(storeName, indexName = null, indexValue = null) {
    await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      
      let request;
      
      if (indexName && indexValue !== null) {
        const index = store.index(indexName);
        request = index.getAll(indexValue);
      } else {
        request = store.getAll();
      }
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = () => {
        console.error(`IndexedDB: Failed to get all data from ${storeName}`, request.error);
        reject(request.error);
      };
    });
  }

  async deleteData(storeName, key) {
    await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const request = store.delete(key);
      
      request.onsuccess = () => {
        console.log(`IndexedDB: Deleted data from ${storeName}`, key);
        resolve();
      };
      
      request.onerror = () => {
        console.error(`IndexedDB: Failed to delete data from ${storeName}`, request.error);
        reject(request.error);
      };
    });
  }

  async clearStore(storeName) {
    await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const request = store.clear();
      
      request.onsuccess = () => {
        console.log(`IndexedDB: Cleared store ${storeName}`);
        resolve();
      };
      
      request.onerror = () => {
        console.error(`IndexedDB: Failed to clear store ${storeName}`, request.error);
        reject(request.error);
      };
    });
  }

  async addPendingSync(type, data) {
    const syncItem = {
      type: type,
      data: data,
      timestamp: Date.now(),
      retryCount: 0
    };
    
    return this.saveData('pending_sync', syncItem);
  }

  async getPendingSync() {
    return this.getAllData('pending_sync');
  }

  async removePendingSync(id) {
    return this.deleteData('pending_sync', id);
  }

  async saveSetting(key, value) {
    return this.saveData('settings', { key, value });
  }

  async getSetting(key) {
    const setting = await this.getData('settings', key);
    return setting ? setting.value : null;
  }

  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.init();
    }
  }

  async getDatabaseSize() {
    await this.ensureInitialized();
    
    const stores = ['customers', 'products', 'bills', 'pending_sync', 'settings'];
    let totalSize = 0;
    
    for (const storeName of stores) {
      const data = await this.getAllData(storeName);
      totalSize += JSON.stringify(data).length;
    }
    
    return totalSize;
  }

  async exportData() {
    await this.ensureInitialized();
    
    const exportData = {};
    const stores = ['customers', 'products', 'bills', 'settings'];
    
    for (const storeName of stores) {
      exportData[storeName] = await this.getAllData(storeName);
    }
    
    return exportData;
  }

  async importData(data) {
    await this.ensureInitialized();
    
    for (const [storeName, items] of Object.entries(data)) {
      if (Array.isArray(items)) {
        for (const item of items) {
          await this.saveData(storeName, item);
        }
      }
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OfflineStorage;
} 