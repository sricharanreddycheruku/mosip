import React, { useState, useRef } from 'react';
import { Camera, MapPin, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { ChildRecord } from '../types';
import { generateHealthId, calculateBMI, getMalnutritionStatus } from '../utils/healthId';
import { db } from '../services/database';
import { AuthService } from '../services/auth';
import { useTranslation } from 'react-i18next';

interface ChildRecordFormProps {
  onSaved: () => void;
}

export function ChildRecordForm({ onSaved }: ChildRecordFormProps) {
  const { t, i18n } = useTranslation();

  const [formData, setFormData] = useState({
    childName: '',
    age: '',
    childWeight: '',
    childHeight: '',
    parentGuardianName: '',
    visibleSignsMalnutrition: '',
    recentIllnesses: '',
    parentalConsent: false,
    language: (localStorage.getItem('appLanguage') || 'en') as 'en' | 'hi' | 'te' | 'kn',
  });
  const [facePhoto, setFacePhoto] = useState<string>('');
  const [location, setLocation] = useState<GeolocationCoordinates | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bmiPreview, setBmiPreview] = useState<{ bmi: number; status: string } | null>(null);
  const [manualLocation, setManualLocation] = useState({ latitude: '', longitude: '' });
  const [useManualLocation, setUseManualLocation] = useState(false);

  // Calculate BMI preview when weight/height changes
  React.useEffect(() => {
    if (formData.childWeight && formData.childHeight && formData.age) {
      const weight = Number(formData.childWeight);
      const height = Number(formData.childHeight);
      const age = Number(formData.age);
      
      if (weight > 0 && height > 0 && age > 0) {
        const bmi = calculateBMI(weight, height);
        const status = getMalnutritionStatus(bmi, age);
        setBmiPreview({ bmi, status });
      } else {
        setBmiPreview(null);
      }
    } else {
      setBmiPreview(null);
    }
  }, [formData.childWeight, formData.childHeight, formData.age]);
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert(t('alerts.geolocationNotSupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation(position.coords);
        setUseManualLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert(t('alerts.unableToGetLocation'));
      }
    );
  };

  const handleManualLocationSubmit = () => {
    const lat = parseFloat(manualLocation.latitude);
    const lng = parseFloat(manualLocation.longitude);
    
    if (isNaN(lat) || isNaN(lng)) {
      alert('Please enter valid latitude and longitude values');
      return;
    }
    
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      alert('Please enter valid coordinate ranges (Lat: -90 to 90, Lng: -180 to 180)');
      return;
    }
    
    setLocation({
      latitude: lat,
      longitude: lng,
      accuracy: 0,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null
    });
    setUseManualLocation(true);
  };
  const handlePhotoCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFacePhoto(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.childName.trim()) newErrors.childName = t('validation.childNameRequired');
    if (!formData.age || Number(formData.age) <= 0) newErrors.age = t('validation.ageRequired');
    if (!formData.childWeight || Number(formData.childWeight) <= 0) newErrors.childWeight = t('validation.weightRequired');
    if (!formData.childHeight || Number(formData.childHeight) <= 0) newErrors.childHeight = t('validation.heightRequired');
    if (!formData.parentGuardianName.trim()) newErrors.parentGuardianName = t('validation.parentNameRequired');
    if (!formData.parentalConsent) newErrors.parentalConsent = t('validation.consentRequired');
    if (!facePhoto) newErrors.facePhoto = t('validation.photoRequired');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      const currentUser = AuthService.getCurrentUser();
      if (!currentUser) throw new Error(t('alerts.noAuthUser'));

      const bmi = calculateBMI(Number(formData.childWeight), Number(formData.childHeight));
      const malnutritionStatus = getMalnutritionStatus(bmi, Number(formData.age));

      const record: ChildRecord = {
        id: `child_${Date.now()}`,
        healthId: generateHealthId(),
        childName: formData.childName,
        facePhoto,
        age: Number(formData.age),
        childWeight: Number(formData.childWeight),
        childHeight: Number(formData.childHeight),
        parentGuardianName: formData.parentGuardianName,
        visibleSignsMalnutrition: formData.visibleSignsMalnutrition || 'None reported',
        recentIllnesses: formData.recentIllnesses || 'None reported',
        parentalConsent: formData.parentalConsent,
        location: location
          ? {
              latitude: location.latitude,
              longitude: location.longitude
            }
          : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        isUploaded: false,
        representativeId: currentUser.id,
        language: formData.language
      };

      await db.saveChildRecord(record);
      setSaved(true);

      alert(
        t('alerts.savedMessage', {
          healthId: record.healthId,
          bmi: bmi.toFixed(1),
          status: malnutritionStatus
        })
      );

      // Reset form
      setFormData({
        childName: '',
        age: '',
        childWeight: '',
        childHeight: '',
        parentGuardianName: '',
        visibleSignsMalnutrition: '',
        recentIllnesses: '',
        parentalConsent: false,
        language: 'en'
      });
      setFacePhoto('');
      setLocation(null);

      setTimeout(() => {
        setSaved(false);
        onSaved();
      }, 1200);
    } catch (error) {
      console.error('Error saving record:', error);
      alert(t('alerts.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (saved) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-2xl font-semibold text-gray-900 mb-2">{t('recordSavedTitle')}</h3>
          <p className="text-gray-600">{t('recordSavedRedirect')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('newChildHealthRecord')}</h2>
        <p className="text-gray-600">{t('fillInDetails')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Child Photo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('childPhoto')} <span className="text-red-500">*</span>
          </label>

          <div className="flex items-center space-x-4">
            {facePhoto ? (
              <div className="relative">
                <img src={facePhoto} alt="Child" className="w-24 h-24 object-cover rounded-lg border-2 border-gray-300" />
                <button type="button" onClick={() => setFacePhoto('')} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600">
                  ×
                </button>
              </div>
            ) : (
              <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                <Camera className="w-8 h-8 text-gray-400" />
              </div>
            )}

            <button type="button" onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center space-x-2">
              <Camera className="w-4 h-4" />
              <span>{t('captureUploadPhoto')}</span>
            </button>

            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} className="hidden" />
          </div>

          {errors.facePhoto && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.facePhoto}
            </p>
          )}
        </div>

        {/* Basic Information */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="childName" className="block text-sm font-medium text-gray-700 mb-1">
              {t('childName')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="childName"
              autoComplete="off"
              autoComplete="off"
              value={formData.childName}
              onChange={(e) => setFormData({ ...formData, childName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder={t('placeholders.childName')}
            />
            {errors.childName && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.childName}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">
              {t('age')} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="age"
              min="0"
              max="18"
              step="0.1"
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder={t('placeholders.age')}
            />
            {errors.age && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.age}
              </p>
            )}
          </div>
        </div>

        {/* Physical Measurements */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="childWeight" className="block text-sm font-medium text-gray-700 mb-1">
              {t('weight')} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="childWeight"
              min="0"
              step="0.1"
              value={formData.childWeight}
              onChange={(e) => setFormData({ ...formData, childWeight: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder={t('placeholders.measurePlaceholder')}
            />
            {errors.childWeight && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.childWeight}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="childHeight" className="block text-sm font-medium text-gray-700 mb-1">
              {t('height')} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="childHeight"
              min="0"
              step="0.1"
              value={formData.childHeight}
              onChange={(e) => setFormData({ ...formData, childHeight: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder={t('placeholders.measurePlaceholder')}
            />
            {errors.childHeight && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.childHeight}
              </p>
            )}
          </div>
        </div>

        {/* BMI Preview */}
        {bmiPreview && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Health Assessment Preview</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700">BMI: </span>
                <span className="font-semibold">{bmiPreview.bmi.toFixed(1)}</span>
              </div>
              <div>
                <span className="text-blue-700">Status: </span>
                <span className={`font-semibold ${
                  bmiPreview.status === 'Normal' ? 'text-green-600' :
                  bmiPreview.status.includes('Moderate') ? 'text-orange-600' :
                  'text-red-600'
                }`}>
                  {bmiPreview.status}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Parent/Guardian Information */}
        <div>
          <label htmlFor="parentGuardianName" className="block text-sm font-medium text-gray-700 mb-1">
            {t('parentGuardianName')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="parentGuardianName"
            value={formData.parentGuardianName}
            onChange={(e) => setFormData({ ...formData, parentGuardianName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder={t('placeholders.parentName')}
          />
          {errors.parentGuardianName && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.parentGuardianName}
            </p>
          )}
        </div>

        {/* Health Information */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="visibleSignsMalnutrition" className="block text-sm font-medium text-gray-700 mb-1">
              {t('visibleSignsMalnutrition')}
            </label>
            <textarea
              id="visibleSignsMalnutrition"
              rows={3}
              value={formData.visibleSignsMalnutrition}
              onChange={(e) => setFormData({ ...formData, visibleSignsMalnutrition: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder={t('placeholders.visibleSignsPlaceholder')}
            />
          </div>

          <div>
            <label htmlFor="recentIllnesses" className="block text-sm font-medium text-gray-700 mb-1">
              {t('recentIllnesses')}
            </label>
            <textarea
              id="recentIllnesses"
              rows={3}
              value={formData.recentIllnesses}
              onChange={(e) => setFormData({ ...formData, recentIllnesses: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder={t('placeholders.recentIllnessesPlaceholder')}
            />
          </div>
        </div>



        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('getLocation')}</label>
          <div className="flex items-center space-x-4">
            {location ? (
              <div className="flex-1 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  📍 {t('locationCaptured', { lat: location.latitude.toFixed(6), lng: location.longitude.toFixed(6) })}
                  {useManualLocation && <span className="ml-2 text-xs">(Manual)</span>}
                </p>
              </div>
            ) : (
              <div className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-600">{t('noLocationCaptured')}</p>
              </div>
            )}

            <button type="button" onClick={getCurrentLocation} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2">
              <MapPin className="w-4 h-4" />
              <span>{t('getLocation')}</span>
            </button>
          </div>
          
          {/* Manual Location Entry */}
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Enter Location Manually</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={manualLocation.latitude}
                  onChange={(e) => setManualLocation({ ...manualLocation, latitude: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., 12.9716"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={manualLocation.longitude}
                  onChange={(e) => setManualLocation({ ...manualLocation, longitude: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., 77.5946"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleManualLocationSubmit}
              className="mt-3 px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700"
            >
              Set Manual Location
            </button>
          </div>
        </div>

        {/* Parental Consent */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="parentalConsent"
              autoComplete="off"
              checked={formData.parentalConsent}
              onChange={(e) => setFormData({ ...formData, parentalConsent: e.target.checked })}
              className="mt-1 w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <div>
              <label htmlFor="parentalConsent" className="block text-sm font-medium text-gray-900">
                {t('parentalConsent')} <span className="text-red-500">*</span>
              </label>
              <p className="text-sm text-gray-600 mt-1">{t('parentalConsentText')}</p>
            </div>
          </div>

          {errors.parentalConsent && (
            <p className="mt-2 text-sm text-red-600 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.parentalConsent}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4 pt-6">
          <button type="submit" disabled={loading} className="px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-medium rounded-lg hover:from-green-600 hover:to-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2">
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>{t('saveRecord')}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
