// API service for backend communication
export class APIService {
  private static baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

  static async uploadChildRecord(record: any, authToken: string): Promise<void> {
    const response = await fetch(`${this.baseURL}/child-records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(record)
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }
  }

  static async getHealthBookletPDF(healthId: string): Promise<Blob> {
    const response = await fetch(`${this.baseURL}/health-booklet/${healthId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/pdf'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch health booklet: ${response.statusText}`);
    }

    return response.blob();
  }

  static async getChildRecords(authToken: string): Promise<any[]> {
    const response = await fetch(`${this.baseURL}/child-records`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch records: ${response.statusText}`);
    }

    return response.json();
  }
}