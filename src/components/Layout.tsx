import React from 'react';
import { Wifi, WifiOff, Upload, Clock } from 'lucide-react';
import { SyncService } from '../services/sync';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  showSyncStatus?: boolean;
}

export function Layout({ children, title, showSyncStatus = true }: LayoutProps) {
  const [connectionStatus, setConnectionStatus] = React.useState(SyncService.getConnectionStatus());
  const [pendingCount, setPendingCount] = React.useState(0);
  const [retryCount, setRetryCount] = React.useState(0);
  const [language, setLanguage] = React.useState<string>(localStorage.getItem('appLanguage') || 'en');

  React.useEffect(() => {
    document.documentElement.lang = language;
    localStorage.setItem('appLanguage', language);
  }, [language]);

  React.useEffect(() => {
    const updateStatus = () => {
      setConnectionStatus(SyncService.getConnectionStatus());
    };

    const updatePendingCount = async () => {
      const count = await SyncService.getPendingRecordsCount();
      setPendingCount(count);
      setRetryCount(SyncService.getRetryQueueCount());
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    window.addEventListener('syncComplete', updatePendingCount);
    
    updatePendingCount();
    const interval = setInterval(() => {
      updateStatus();
      updatePendingCount();
    }, 5000);

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
      window.removeEventListener('syncComplete', updatePendingCount);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-indigo-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CHR</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
            </div>
            
            {showSyncStatus && (
              <div className="flex items-center space-x-4">
                {/* Connection Status */}
                <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                  connectionStatus.isOnline 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {connectionStatus.isOnline ? (
                    <>
                      <Wifi className="w-4 h-4" />
                      <span>Online</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-4 h-4" />
                      <span>Offline</span>
                    </>
                  )}
                </div>
                
                {/* Sync Status */}
                {pendingCount > 0 && (
                  <div className="flex items-center space-x-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                    {connectionStatus.syncInProgress ? (
                      <Clock className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span>{pendingCount} pending</span>
                  </div>
                )}

                {/* Retry Queue Status */}
                {retryCount > 0 && (
                  <div className="flex items-center space-x-2 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{retryCount} failed</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}