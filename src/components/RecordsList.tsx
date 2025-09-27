// components/RecordsList.tsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, Download, Upload, MapPin, Clock, CheckCircle, AlertCircle, Search, Filter, RefreshCw, Wifi } from 'lucide-react';
import { ChildRecord } from '../types';
import { db } from '../services/database';
import { PDFService } from '../services/pdf';
import { SyncService } from '../services/sync';
import { calculateBMI, getMalnutritionStatus } from '../utils/healthId';
import { AuthService } from '../services/auth';
import { AuthPage } from './AuthPage';

export function RecordsList() {
  const { t } = useTranslation();
  const [records, setRecords] = useState<ChildRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'uploaded' | 'pending'>('all');
  const [selectedRecord, setSelectedRecord] = useState<ChildRecord | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [showAuthForSync, setShowAuthForSync] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(SyncService.getConnectionStatus());
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    loadRecords();
    
    // Set default filter to pending for all users and default language to English
    setFilterStatus('pending');
    
    // Listen for sync events
    const handleSyncComplete = () => {
      loadRecords();
      setConnectionStatus(SyncService.getConnectionStatus());
    };

    const updateConnectionStatus = () => {
      setConnectionStatus(SyncService.getConnectionStatus());
    };

    window.addEventListener('syncComplete', handleSyncComplete);
    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);
    
    const interval = setInterval(updateConnectionStatus, 5000);
    
    return () => {
      window.removeEventListener('syncComplete', handleSyncComplete);
      window.removeEventListener('online', updateConnectionStatus);
      window.removeEventListener('offline', updateConnectionStatus);
      clearInterval(interval);
    };
  }, []);

  const loadRecords = async () => {
    try {
      const currentUser = AuthService.getCurrentUser();
      if (!currentUser) {
        console.error('No authenticated user found');
        setLoading(false);
        return;
      }

      const allRecords = await db.getChildRecords();
      // Filter records by current representative's ID
      const userRecords = allRecords.filter(record => record.representativeId === currentUser.id);
      setRecords(userRecords.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error) {
      console.error('Failed to load records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    // Check if authentication is required for sync
    if (AuthService.requireAuthForSync()) {
      setShowAuthForSync(true);
      return;
    }

    await performSync();
  };

  const performSync = async () => {
    setSyncing(true);
    try {
      await SyncService.syncPendingRecords();
      // Also retry any failed uploads
      await SyncService.retryFailedUploads();
    } catch (error) {
      console.error('Sync failed:', error);
      alert(t('alerts.syncFailed'));
    } finally {
      setSyncing(false);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthForSync(false);
    performSync();
  };

  const handleAuthCancel = () => {
    setShowAuthForSync(false);
  };

  const handleLogin = () => {
    setShowLoginModal(true);
  };

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    loadRecords(); // Reload records after login
  };

  const handleLogout = async () => {
    await AuthService.logout();
    window.location.reload(); // Refresh to go back to landing page
  };
  const handleDownloadPDF = async (record: ChildRecord) => {
    try {
      await PDFService.downloadHealthBooklet(record);
    } catch (error) {
      console.error('Failed to download PDF:', error);
      alert(t('alerts.downloadFailed'));
    }
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch = 
      record.childName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.healthId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.parentGuardianName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filterStatus === 'all' || 
      (filterStatus === 'uploaded' && record.isUploaded) || 
      (filterStatus === 'pending' && !record.isUploaded);
    
    return matchesSearch && matchesFilter;
  });

  const pendingCount = records.filter(r => !r.isUploaded).length;
  const retryCount = SyncService.getRetryQueueCount();

  if (showAuthForSync) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} onCancel={handleAuthCancel} />;
  }

  if (showLoginModal) {
    return <AuthPage onAuthSuccess={handleLoginSuccess} />;
  }
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('allRecords')}</h2>
          <p className="text-gray-600">
            {t('totalChildren', { count: records.length })} • 
            {pendingCount > 0 && ` ${pendingCount} pending`}
            {retryCount > 0 && ` • ${retryCount} failed`}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Login/Logout Buttons */}
          <button
            onClick={handleLogin}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
          >
            <span>Login</span>
          </button>
          
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2"
          >
            <span>Logout</span>
          </button>

          {/* Connection Status Indicator */}
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
            connectionStatus.isOnline 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            <Wifi className="w-4 h-4" />
            <span>{connectionStatus.isOnline ? 'Online' : 'Offline'}</span>
          </div>

          {/* Sync Button */}
          {(pendingCount > 0 || retryCount > 0) && (
            <button 
              onClick={handleSync}
              disabled={syncing || !connectionStatus.isOnline}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {syncing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span>
                {syncing ? 'Syncing...' : 
                 retryCount > 0 ? `Retry ${retryCount + pendingCount}` :
                 `Sync ${pendingCount}`}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | 'uploaded' | 'pending')}
            className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="all">{t('allRecords')}</option>
            <option value="uploaded">{t('uploaded')}</option>
            <option value="pending">{t('pending')}</option>
          </select>
        </div>
      </div>

      {/* Records Grid */}
      {filteredRecords.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('noRecordsFound')}</h3>
          <p className="text-gray-600">
            {searchTerm || filterStatus !== 'all' ? t('tryAdjustSearch') : t('noRecordsHelp')}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecords.map((record) => {
            const bmi = calculateBMI(record.childWeight, record.childHeight);
            const malnutritionStatus = getMalnutritionStatus(bmi, record.age);
            
            return (
              <div key={record.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden">
                {/* Status Badge */}
                <div className="p-4 pb-0">
                  <div className="flex justify-between items-start mb-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      record.isUploaded ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {record.isUploaded ? (
                        <span className="flex items-center space-x-1">
                          <CheckCircle className="w-3 h-3" />
                          <span>{t('uploaded')}</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-1">
                          {connectionStatus.syncInProgress ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>Syncing</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" />
                              <span>{t('pending')}</span>
                            </>
                          )}
                        </span>
                      )}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      malnutritionStatus === 'Normal' ? 'bg-green-100 text-green-800' :
                      malnutritionStatus.includes('Moderate') ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {malnutritionStatus}
                    </span>
                  </div>

                  {/* Photo and Basic Info */}
                  <div className="flex items-center space-x-3 mb-4">
                    <img src={record.facePhoto} alt={record.childName} className="w-12 h-12 object-cover rounded-lg border-2 border-gray-200" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{record.childName}</h3>
                      <p className="text-sm text-gray-600">{record.age} {t('age')}</p>
                      <p className="text-sm text-gray-500">{record.parentGuardianName}</p>
                    </div>
                  </div>
                </div>

                {/* Health ID */}
                <div className="px-4 py-2 bg-gray-50">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{t('healthIdLabel')}</p>
                  <p className="font-mono text-sm font-semibold text-indigo-600">{record.healthId}</p>
                </div>

                {/* Quick Stats */}
                <div className="p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('weightLabel')}</span>
                    <span className="font-medium">{record.childWeight} kg</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('heightLabel')}</span>
                    <span className="font-medium">{record.childHeight} cm</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('bmiLabel')}</span>
                    <span className="font-medium">{bmi.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-3 h-3 mr-1" />
                    <span className="truncate">
                      {record.location ? 
                        `${record.location.latitude.toFixed(4)}, ${record.location.longitude.toFixed(4)}` : 
                        'No location'
                      }
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-end space-x-2">
                  <button
                    onClick={() => setSelectedRecord(record)}
                    className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                    title={t('viewDetails')}
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDownloadPDF(record)}
                    className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                    title={t('downloadPDF')}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Record Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-xl font-bold text-gray-900">{selectedRecord.childName}</h3>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <img src={selectedRecord.facePhoto} alt={selectedRecord.childName} className="w-full h-48 object-cover rounded-lg mb-4" />
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600">{t('healthIdLabel')}</label>
                      <p className="font-mono text-lg font-semibold text-indigo-600">{selectedRecord.healthId}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">{t('parentGuardianName')}</label>
                      <p className="text-gray-900">{selectedRecord.parentGuardianName}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">{t('age')}</label>
                      <p className="text-lg font-semibold text-gray-900">{selectedRecord.age}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">{t('weightLabel')}</label>
                      <p className="text-lg font-semibold text-gray-900">{selectedRecord.childWeight} kg</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">{t('heightLabel')}</label>
                      <p className="text-lg font-semibold text-gray-900">{selectedRecord.childHeight} cm</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Location</label>
                    <p className="text-gray-900">
                      {selectedRecord.location ? 
                        `${selectedRecord.location.latitude.toFixed(6)}, ${selectedRecord.location.longitude.toFixed(6)}` : 
                        'No location captured'
                      }
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">{t('malnutritionStatus')}</label>
                    <p className={`text-lg font-semibold ${
                      getMalnutritionStatus(calculateBMI(selectedRecord.childWeight, selectedRecord.childHeight), selectedRecord.age) === 'Normal' ? 'text-green-600' :
                      getMalnutritionStatus(calculateBMI(selectedRecord.childWeight, selectedRecord.childHeight), selectedRecord.age).includes('Moderate') ? 'text-orange-600' :
                      'text-red-600'
                    }`}>
                      {getMalnutritionStatus(calculateBMI(selectedRecord.childWeight, selectedRecord.childHeight), selectedRecord.age)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg transition-colors duration-200"
                >
                  {t('close')}
                </button>
                <button
                  onClick={() => handleDownloadPDF(selectedRecord)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>{t('downloadPDF')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}