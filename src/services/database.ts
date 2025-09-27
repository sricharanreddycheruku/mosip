import { ChildRecord, Representative } from '../types';
import CryptoJS from 'crypto-js';

const DB_NAME = 'ChildHealthDB';
const DB_VERSION = 2; // Incremented version to ensure upgrade runs
const ENCRYPTION_KEY = 'child-health-secure-key-2025';

class DatabaseService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;
        this.handleDatabaseUpgrade(db, oldVersion, DB_VERSION);
      };
    });

    return this.initPromise;
  }

  private handleDatabaseUpgrade(db: IDBDatabase, oldVersion: number, newVersion: number) {
    console.log(`Upgrading database from version ${oldVersion} to ${newVersion}`);

    // If oldVersion is 0, it's a new database
    if (oldVersion < 1) {
      // Create all object stores from scratch
      
      // Child records store
      const childStore = db.createObjectStore('childRecords', { keyPath: 'id' });
      childStore.createIndex('healthId', 'healthId', { unique: true });
      childStore.createIndex('representativeId', 'representativeId');
      childStore.createIndex('isUploaded', 'isUploaded');
      childStore.createIndex('createdAt', 'createdAt');
      
      // Representatives store
      const repStore = db.createObjectStore('representatives', { keyPath: 'id' });
      repStore.createIndex('nationalId', 'nationalId', { unique: true });
      
      // Settings store
      db.createObjectStore('settings', { keyPath: 'key' });
      
      return;
    }

    // For future migrations, handle version-specific changes here
    if (oldVersion < 2) {
      // Version 2 migration logic (if needed)
      // For now, just ensure all stores exist with proper indexes
      
      // Child records store
      if (!db.objectStoreNames.contains('childRecords')) {
        const childStore = db.createObjectStore('childRecords', { keyPath: 'id' });
        childStore.createIndex('healthId', 'healthId', { unique: true });
        childStore.createIndex('representativeId', 'representativeId');
        childStore.createIndex('isUploaded', 'isUploaded');
        childStore.createIndex('createdAt', 'createdAt');
      } else {
        // Only try to modify existing store if we're in a transaction
        try {
          const transaction = db.transaction(['childRecords'], 'readwrite');
          const store = transaction.objectStore('childRecords');
          
          // Add missing indexes if they don't exist
          if (!store.indexNames.contains('healthId')) {
            store.createIndex('healthId', 'healthId', { unique: true });
          }
          if (!store.indexNames.contains('representativeId')) {
            store.createIndex('representativeId', 'representativeId');
          }
          if (!store.indexNames.contains('isUploaded')) {
            store.createIndex('isUploaded', 'isUploaded');
          }
          if (!store.indexNames.contains('createdAt')) {
            store.createIndex('createdAt', 'createdAt');
          }
        } catch (error) {
          console.warn('Could not modify childRecords store:', error);
        }
      }

      // Representatives store
      if (!db.objectStoreNames.contains('representatives')) {
        const repStore = db.createObjectStore('representatives', { keyPath: 'id' });
        repStore.createIndex('nationalId', 'nationalId', { unique: true });
      } else {
        try {
          const transaction = db.transaction(['representatives'], 'readwrite');
          const store = transaction.objectStore('representatives');
          
          if (!store.indexNames.contains('nationalId')) {
            store.createIndex('nationalId', 'nationalId', { unique: true });
          }
        } catch (error) {
          console.warn('Could not modify representatives store:', error);
        }
      }

      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Database not initialized');
    }
  }

  private encrypt(data: string): string {
    return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
  }

  private decrypt(encryptedData: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Decryption error:', error);
      return encryptedData; // Return original if decryption fails
    }
  }

  async saveChildRecord(record: ChildRecord): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['childRecords'], 'readwrite');
      const store = transaction.objectStore('childRecords');

      // Encrypt sensitive data
      const encryptedRecord = {
        ...record,
        childName: this.encrypt(record.childName),
        parentGuardianName: this.encrypt(record.parentGuardianName),
        facePhoto: this.encrypt(record.facePhoto),
      };

      const request = store.put(encryptedRecord);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getChildRecords(): Promise<ChildRecord[]> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['childRecords'], 'readonly');
      const store = transaction.objectStore('childRecords');

      const request = store.getAll();
      request.onsuccess = () => {
        try {
          const records = request.result.map((record: any) => ({
            ...record,
            childName: this.decrypt(record.childName),
            parentGuardianName: this.decrypt(record.parentGuardianName),
            facePhoto: this.decrypt(record.facePhoto),
          }));
          resolve(records);
        } catch (error) {
          reject(error);
        }
      };
      request.onerror = () => reject(request.error);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getChildRecordByHealthId(healthId: string): Promise<ChildRecord | null> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['childRecords'], 'readonly');
      const store = transaction.objectStore('childRecords');
      const index = store.index('healthId');

      const request = index.get(healthId);
      request.onsuccess = () => {
        const record = request.result;
        if (record) {
          resolve({
            ...record,
            childName: this.decrypt(record.childName),
            parentGuardianName: this.decrypt(record.parentGuardianName),
            facePhoto: this.decrypt(record.facePhoto),
          });
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async markRecordAsUploaded(id: string): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['childRecords'], 'readwrite');
      const store = transaction.objectStore('childRecords');

      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const record = getRequest.result;
        if (record) {
          record.isUploaded = true;
          record.updatedAt = new Date();
          
          // Re-encrypt the data when updating
          record.childName = this.encrypt(record.childName);
          record.parentGuardianName = this.encrypt(record.parentGuardianName);
          record.facePhoto = this.encrypt(record.facePhoto);
          
          const putRequest = store.put(record);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('Record not found'));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async saveRepresentative(rep: Representative): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['representatives'], 'readwrite');
      const store = transaction.objectStore('representatives');

      const request = store.put(rep);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getRepresentative(nationalId: string): Promise<Representative | null> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['representatives'], 'readonly');
      const store = transaction.objectStore('representatives');
      const index = store.index('nationalId');

      const request = index.get(nationalId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async clearAll(): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['childRecords', 'representatives'], 'readwrite');
    
    await Promise.all([
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore('childRecords').clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore('representatives').clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      })
    ]);
  }

  // Method to delete the entire database (use with caution)
  async deleteDatabase(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.initPromise = null;

    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Method to get database info
  async getDatabaseInfo() {
    await this.ensureInitialized();
    return {
      name: DB_NAME,
      version: DB_VERSION,
      objectStores: Array.from(this.db?.objectStoreNames || [])
    };
  }
}

export const db = new DatabaseService();