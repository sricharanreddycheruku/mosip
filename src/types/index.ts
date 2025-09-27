export interface ChildRecord {
  id: string;
  healthId: string;
  childName: string;
  facePhoto: string;
  age: number;
  childWeight: number;
  childHeight: number;
  parentGuardianName: string;
  visibleSignsMalnutrition: string;
  recentIllnesses: string;
  parentalConsent: boolean;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  isUploaded: boolean;
  representativeId: string;
  language: 'en' | 'hi' | 'te' | 'kn';
}

export interface Representative {
  id: string;
  nationalId: string;
  name: string;
  email: string;
  phone: string;
  isAuthenticated: boolean;
}

export interface SyncStatus {
  isOnline: boolean;
  pendingUploads: number;
  lastSyncTime?: Date;
}

export interface AdminStats {
  totalChildren: number;
  malnutritionCases: number;
  pendingUploads: number;
  activeRepresentatives: number;
  moderateCases?: number;
  severeCases?: number;
  normalCases?: number;
}
