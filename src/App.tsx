// App.tsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Plus, FileText, BarChart, LogOut, Menu, X, User, Shield } from 'lucide-react';
import { Layout } from './components/Layout';
import { AuthPage } from './components/AuthPage';
import { ChildRecordForm } from './components/ChildRecordForm';
import { RecordsList } from './components/RecordsList';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminLogin } from './components/AdminLogin';
import { LandingPage } from './components/LandingPage';
import { AuthService } from './services/auth';
import { SyncService } from './services/sync';
import { db } from './services/database';
import { useTranslation } from 'react-i18next';
import './i18n';

function App() {
  const { t, i18n } = useTranslation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(AuthService.getCurrentUser());
  const [userType, setUserType] = useState<'admin' | 'field-agent' | null>(null);
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Set default language to English for everyone
        i18n.changeLanguage('en');
        localStorage.setItem('appLanguage', 'en');
        
        await db.init();
        SyncService.init();
        
        const authStatus = AuthService.isAuthenticated();
        setIsAuthenticated(authStatus);
        setCurrentUser(AuthService.getCurrentUser());
        setUserType(AuthService.getUserType());

        // If no user type is set but we have auth, default to field agent
        if (authStatus && !AuthService.getUserType()) {
          localStorage.setItem('userType', 'field-agent');
          setUserType('field-agent');
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  const handleAuthSuccess = (type: 'admin' | 'field-agent') => {
    setIsAuthenticated(true);
    setCurrentUser(AuthService.getCurrentUser());
    setUserType(type);
    setShowAdminLogin(false);
  };

  const handleFieldAgentLogin = async () => {
    await AuthService.loginAsFieldAgent();
    handleAuthSuccess('field-agent');
  };

  const handleAdminLoginClick = () => {
    setShowAdminLogin(true);
  };

  const handleLogout = async () => {
    await AuthService.logout();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setUserType(null);
    setShowAdminLogin(false);
  };

  const handleBackToLanding = () => {
    // Clear authentication state but keep the ability to go back
    setIsAuthenticated(false);
    setCurrentUser(null);
    setUserType(null);
    setShowAdminLogin(false);
    // Clear localStorage but preserve user data for potential re-login
    localStorage.removeItem('authToken');
    localStorage.removeItem('userType');
  };
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('appLanguage', lng);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-indigo-600 font-medium">{t('initializing')}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (showAdminLogin) {
      return <AdminLogin onAuthSuccess={() => handleAuthSuccess('admin')} />;
    }
    return <LandingPage onFieldAgentLogin={handleFieldAgentLogin} onAdminLogin={handleAdminLoginClick} />;
  }

  // Determine which routes are accessible based on user type
  const isFieldAgent = userType === 'field-agent';
  const isAdmin = userType === 'admin';

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Navigation */}
        <nav className="bg-white shadow-lg border-b border-indigo-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">CHR</span>
                  </div>
                  <h1 className="text-xl font-semibold text-gray-900">{t('appTitle')}</h1>
                </div>

                {/* Desktop Navigation - Show different links based on user type */}
                <div className="hidden md:flex items-center space-x-8 ml-10">
                  {isFieldAgent && (
                    <>
                      <Link to="/new-record" className="flex items-center space-x-2 px-4 py-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors duration-200">
                        <Plus className="w-4 h-4" />
                        <span>{t('newRecord')}</span>
                      </Link>
                      <Link to="/records" className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors duration-200">
                        <FileText className="w-4 h-4" />
                        <span>{t('allRecords')}</span>
                      </Link>
                    </>
                  )}
                  {isAdmin && (
                    <Link to="/dashboard" className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors duration-200">
                      <BarChart className="w-4 h-4" />
                      <span>{t('dashboard')}</span>
                    </Link>
                  )}
                </div>
              </div>

              <div className="hidden md:flex items-center space-x-4">
                {/* Language Switcher */}
                <select
                  className="border rounded-md px-2 py-1 text-gray-700"
                  value={i18n.language}
                  onChange={(e) => changeLanguage(e.target.value)}
                >
                  <option value="en">English</option>
                  <option value="hi">हिन्दी</option>
                  <option value="te">తెలుగు</option>
                  <option value="kn">ಕನ್ನಡ</option>
                </select>

                {currentUser && (
                  <div className="text-sm text-gray-600">
                    <span>{t('welcome')}, </span>
                    <span className="font-medium">
                      {isAdmin ? currentUser.name : `${currentUser.name} (ID: ${currentUser.id.slice(-8)})`}
                    </span>
                    <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                      {isAdmin ? 'Admin' : 'Field Agent'}
                    </span>
                  </div>
                )}

                <button onClick={handleBackToLanding} className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors duration-200">
                  <span>Back to Main</span>
                </button>
                <button onClick={handleLogout} className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors duration-200">
                  <LogOut className="w-4 h-4" />
                  <span>{t('logout')}</span>
                </button>
              </div>

              {/* Mobile menu button */}
              <div className="md:hidden flex items-center">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="text-gray-500 hover:text-gray-700 focus:outline-none focus:text-gray-700"
                >
                  {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Navigation - Show different links based on user type */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200">
              <div className="px-2 pt-2 pb-3 space-y-1 bg-white">
                {isFieldAgent && (
                  <>
                    <Link to="/new-record" className="flex items-center space-x-2 px-3 py-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md transition-colors duration-200" onClick={() => setMobileMenuOpen(false)}>
                      <Plus className="w-4 h-4" />
                      <span>{t('newRecord')}</span>
                    </Link>
                    <Link to="/records" className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-md transition-colors duration-200" onClick={() => setMobileMenuOpen(false)}>
                      <FileText className="w-4 h-4" />
                      <span>{t('allRecords')}</span>
                    </Link>
                  </>
                )}
                {isAdmin && (
                  <Link to="/dashboard" className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-md transition-colors duration-200" onClick={() => setMobileMenuOpen(false)}>
                    <BarChart className="w-4 h-4" />
                    <span>{t('dashboard')}</span>
                  </Link>
                )}

                <div className="border-t border-gray-200 pt-2">
                  {currentUser && (
                    <div className="px-3 py-2 text-sm text-gray-600">
                      <span>{t('welcome')}, </span>
                      <span className="font-medium">
                        {isAdmin ? currentUser.name : `${currentUser.name} (ID: ${currentUser.id.slice(-8)})`}
                      </span>
                      <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                        {isAdmin ? 'Admin' : 'Field Agent'}
                      </span>
                    </div>
                  )}
                  <button onClick={handleBackToLanding} className="w-full flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-md transition-colors duration-200">
                    <span>Back to Main</span>
                  </button>
                  <button onClick={handleLogout} className="w-full flex items-center space-x-2 px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors duration-200">
                    <LogOut className="w-4 h-4" />
                    <span>{t('logout')}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* Main Content with Route Protection */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            {/* Default route based on user type */}
            <Route path="/" element={
              isFieldAgent ? <Navigate to="/records" replace /> : 
              isAdmin ? <Navigate to="/dashboard" replace /> : 
              <Navigate to="/" replace />
            } />
            
            {/* Field Agent Routes - Only accessible to field agents */}
            {isFieldAgent && (
              <>
                <Route
                  path="/new-record"
                  element={
                    <div>
                      <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('createHealthRecord')}</h1>
                        <p className="text-gray-600">{t('fillForm')}</p>
                      </div>
                      <ChildRecordForm onSaved={() => (window.location.href = '/records')} />
                    </div>
                  }
                />
                <Route path="/records" element={<RecordsList />} />
              </>
            )}
            
            {/* Admin Routes - Only accessible to admins */}
            {isAdmin && (
              <Route path="/dashboard" element={<AdminDashboard />} />
            )}
            
            {/* Catch all route - redirect to appropriate default based on user type */}
            <Route path="*" element={
              isFieldAgent ? <Navigate to="/records" replace /> : 
              isAdmin ? <Navigate to="/dashboard" replace /> : 
              <Navigate to="/" replace />
            } />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;