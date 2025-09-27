// components/LandingPage.tsx
import React from 'react';
import { User, Shield, Database, Wifi, WifiOff } from 'lucide-react';

interface LandingPageProps {
  onFieldAgentLogin: () => void;
  onAdminLogin: () => void;
}

export function LandingPage({ onFieldAgentLogin, onAdminLogin }: LandingPageProps) {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleAdminLogin = () => {
    if (!isOnline) {
      alert('Admin login requires internet connection. Please connect to the internet and try again.');
      return;
    }
    onAdminLogin();
  };

  const handleFieldAgentLogin = () => {
    if (!isOnline) {
      alert('Field agent login requires internet connection for authentication. You can work offline after logging in.');
      return;
    }
    onFieldAgentLogin();
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl mx-auto">
        {/* Connection Status */}
        <div className="text-center mb-6">
          <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full text-sm ${
            isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            <span>{isOnline ? 'Connected to Internet' : 'No Internet Connection'}</span>
          </div>
        </div>

        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Database className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Child Health Record System</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Comprehensive child health monitoring and malnutrition tracking system
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Field Agent Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow duration-300">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6 mx-auto">
              <User className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 text-center mb-4">Field Agent</h3>
            <p className="text-gray-600 text-center mb-6">
              Collect child health data offline. Work without internet connection and sync when available.
            </p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                Work completely offline
              </li>
              <li className="flex items-center text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                Login required for personalized records
              </li>
              <li className="flex items-center text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                Sync records when internet is available
              </li>
              <li className="flex items-center text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                Automatic data backup
              </li>
            </ul>
            <button
              onClick={handleFieldAgentLogin}
              disabled={!isOnline}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 px-6 rounded-lg font-semibold hover:from-green-600 hover:to-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start as Field Agent
            </button>
            {!isOnline && (
              <p className="text-xs text-red-600 text-center mt-2">
                Internet connection required for login
              </p>
            )}
          </div>

          {/* Admin Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow duration-300">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6 mx-auto">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 text-center mb-4">Administrator</h3>
            <p className="text-gray-600 text-center mb-6">
              Access analytics, manage records, and monitor field operations with comprehensive dashboards.
            </p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center text-sm text-gray-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                View analytics and reports
              </li>
              <li className="flex items-center text-sm text-gray-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                Monitor field agent activities
              </li>
              <li className="flex items-center text-sm text-gray-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                Download health records
              </li>
              <li className="flex items-center text-sm text-gray-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                System administration
              </li>
            </ul>
            <button
              onClick={handleAdminLogin}
              disabled={!isOnline}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 px-6 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Login as Administrator
            </button>
            {!isOnline && (
              <p className="text-xs text-red-600 text-center mt-2">
                Internet connection required for admin access
              </p>
            )}
          </div>
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-500 text-sm">
            Secure • Offline-First • Multi-Language Support
          </p>
        </div>
      </div>
    </div>
  );
}