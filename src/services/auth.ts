// services/auth.ts
import { Representative } from '../types';
import { db } from './database';

export class AuthService {
  private static currentUser: Representative | null = null;

  static async authenticateWithESignet(nationalId: string, otp: string): Promise<Representative> {
    // Mock eSignet authentication
    if (!navigator.onLine) {
      throw new Error('Internet connection required for authentication');
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (otp !== '123456') {
      throw new Error('Invalid OTP');
    }

    let existingRep = await db.getRepresentative(nationalId);
    
    if (existingRep) {
      this.currentUser = existingRep;
    } else {
      const mockRep: Representative = {
        id: `rep_${Date.now()}`,
        nationalId,
        name: `Field Agent ${nationalId}`,
        email: `rep_${nationalId}@health.org`,
        phone: '+1234567890',
        isAuthenticated: true,
      };
      await db.saveRepresentative(mockRep);
      this.currentUser = mockRep;
    }

    localStorage.setItem('authToken', `token_${this.currentUser.id}`);
    localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
    localStorage.setItem('userType', 'field-agent');
    
    return this.currentUser;
  }

  static async authenticateAdmin(username: string, password: string): Promise<boolean> {
    if (!navigator.onLine) {
      throw new Error('Internet connection required for admin authentication');
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (username === 'admin' && password === 'admin123') {
      const adminUser: Representative = {
        id: 'admin_001',
        nationalId: 'admin',
        name: 'System Administrator',
        email: 'admin@health.org',
        phone: '+1234567890',
        isAuthenticated: true,
      };
      
      this.currentUser = adminUser;
      localStorage.setItem('authToken', 'admin_token');
      localStorage.setItem('currentUser', JSON.stringify(adminUser));
      localStorage.setItem('userType', 'admin');
      
      return true;
    }
    
    throw new Error('Invalid admin credentials');
  }

  static async logout(): Promise<void> {
    this.currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userType');
  }

  static getCurrentUser(): Representative | null {
    if (this.currentUser) return this.currentUser;
    
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      this.currentUser = JSON.parse(stored);
    }
    
    return this.currentUser;
  }

  static isAuthenticated(): boolean {
    return !!localStorage.getItem('authToken') && !!this.getCurrentUser();
  }

  static getUserType(): 'admin' | 'field-agent' | null {
    return localStorage.getItem('userType') as 'admin' | 'field-agent' | null;
  }

  static isAdmin(): boolean {
    return this.getUserType() === 'admin';
  }

  static async sendOTP(nationalId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`OTP sent to ${nationalId}: 123456`);
  }

  static async loginAsFieldAgent(): Promise<void> {
    if (!navigator.onLine) {
      throw new Error('Internet connection required for field agent login');
    }
    
    const fieldAgent: Representative = {
      id: 'field_agent_001',
      nationalId: 'field_agent',
      name: 'Field Agent (Offline Mode)',
      email: 'fieldagent@health.org',
      phone: '+1234567890',
      isAuthenticated: true,
    };
    
    this.currentUser = fieldAgent;
    localStorage.setItem('authToken', 'field_agent_token');
    localStorage.setItem('currentUser', JSON.stringify(fieldAgent));
    localStorage.setItem('userType', 'field-agent');
  }

  static isFieldAgentAuthenticated(): boolean {
    if (!navigator.onLine) {
      throw new Error('Internet connection required to send OTP');
    }
    
    return this.getUserType() === 'field-agent' && this.isAuthenticated();
  }

  static requireAuthForSync(): boolean {
    // For field agents, require authentication only when syncing
    return this.getUserType() === 'field-agent';
  }
}
