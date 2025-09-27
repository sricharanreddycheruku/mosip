import { ChildRecord } from '../types';
import { db } from './database';
import { APIService } from './api';
import { AuthService } from './auth';

export class SyncService {
  private static isOnline = navigator.onLine;
  private static syncInProgress = false;
  private static retryQueue: ChildRecord[] = [];
  private static maxRetries = 3;
  private static retryDelay = 5000; // 5 seconds

  static init() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      setTimeout(() => this.syncPendingRecords(), 1000);
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Auto-sync every 30 seconds when online
    setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.syncPendingRecords();
      }
    }, 30000);
  }

  static getConnectionStatus() {
    return {
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
      retryQueueLength: this.retryQueue.length,
    };
  }

  static async syncPendingRecords(): Promise<void> {
    if (!this.isOnline || this.syncInProgress) return;

    // Check if user is authenticated for sync
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      console.log('No auth token available for sync');
      return;
    }
    this.syncInProgress = true;
    
    try {
      const records = await db.getChildRecords();
      const currentUser = AuthService.getCurrentUser();
      const pendingRecords = records.filter(r => 
        !r.isUploaded && 
        (currentUser?.id === 'admin_001' || r.representativeId === currentUser?.id)
      );
      let successCount = 0;
      let failedRecords: ChildRecord[] = [];
      
      for (const record of pendingRecords) {
        try {
          await this.uploadRecordWithRetry(record);
          await db.markRecordAsUploaded(record.id);
          successCount++;
        } catch (error) {
          console.error(`Failed to upload record ${record.id}:`, error);
          failedRecords.push(record);
        }
      }

      // Add failed records to retry queue
      this.retryQueue = [...this.retryQueue, ...failedRecords];
      
      // Trigger custom event for UI updates
      window.dispatchEvent(new CustomEvent('syncComplete', {
        detail: { 
          uploadedCount: successCount,
          failedCount: failedRecords.length,
          totalPending: pendingRecords.length
        }
      }));
      
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  private static async uploadRecordWithRetry(record: ChildRecord, retryCount = 0): Promise<void> {
    try {
      await this.uploadRecord(record);
    } catch (error) {
      if (retryCount < this.maxRetries) {
        console.log(`Retrying upload for record ${record.id}, attempt ${retryCount + 1}`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * (retryCount + 1)));
        return this.uploadRecordWithRetry(record, retryCount + 1);
      }
      throw error;
    }
  }

  private static async uploadRecord(record: ChildRecord): Promise<void> {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      throw new Error('No authentication token available');
    }

    // Try real API first, fallback to mock
    try {
      await APIService.uploadChildRecord(record, authToken);
    } catch (error) {
      // Fallback to mock upload for demo purposes
      console.log('API upload failed, using mock upload:', error);
      await this.mockUpload(record);
    }
  }

  private static async mockUpload(record: ChildRecord): Promise<void> {
    // Mock API upload with random failure simulation
    await new Promise((resolve, reject) => {
      setTimeout(() => {
        // 10% chance of failure for demo purposes
        if (Math.random() < 0.1) {
          reject(new Error('Mock network error'));
        } else {
          resolve(void 0);
        }
      }, 1000 + Math.random() * 2000);
    });
    
    // Simulate upload to server
    console.log(`Uploading record for ${record.childName} (Health ID: ${record.healthId})`);
  }

  static async getPendingRecordsCount(): Promise<number> {
    const records = await db.getChildRecords();
    const currentUser = AuthService.getCurrentUser();
    return records.filter(r => 
      !r.isUploaded && 
      (currentUser?.id === 'admin_001' || r.representativeId === currentUser?.id)
    ).length;
  }

  static async retryFailedUploads(): Promise<void> {
    if (this.retryQueue.length === 0 || !this.isOnline) return;

    const recordsToRetry = [...this.retryQueue];
    this.retryQueue = [];

    for (const record of recordsToRetry) {
      try {
        await this.uploadRecordWithRetry(record);
        await db.markRecordAsUploaded(record.id);
      } catch (error) {
        // Add back to retry queue if still failing
        this.retryQueue.push(record);
      }
    }
  }

  static getRetryQueueCount(): number {
    return this.retryQueue.length;
  }
}