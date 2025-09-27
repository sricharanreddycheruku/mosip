import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { Users, AlertTriangle, Upload, TrendingUp, Download, Search, Filter, Calendar, MapPin, FileText } from 'lucide-react';
import { ChildRecord, AdminStats } from '../types';
import { db } from '../services/database';
import { PDFService } from '../services/pdf';
import { calculateBMI, getMalnutritionStatus } from '../utils/healthId';
import { useTranslation } from 'react-i18next';

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#6B7280'];

export function AdminDashboard() {
  const { t } = useTranslation();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [records, setRecords] = useState<ChildRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchHealthId, setSearchHealthId] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [nationalIdFilter, setNationalIdFilter] = useState('');
  const [fieldAgents, setFieldAgents] = useState<any[]>([]);
  const [filteredRecordsCache, setFilteredRecordsCache] = useState<ChildRecord[]>([]);

  useEffect(() => {
    loadDashboardData();
    loadFieldAgents();
  }, []);

  // Update filtered records cache when filters change
  useEffect(() => {
    const filtered = getFilteredRecords();
    setFilteredRecordsCache(filtered);
  }, [dateFilter, statusFilter, nationalIdFilter, records]);

  const loadFieldAgents = async () => {
    try {
      // In a real implementation, this would fetch from API
      // For now, we'll get unique representative IDs from records
      const allRecords = await db.getChildRecords();
      const uniqueReps = Array.from(new Set(allRecords.map(r => r.representativeId)));
      const agents = uniqueReps.map(id => ({
        id,
        name: `Field Agent ${id.slice(-4)}`,
        isOnline: Math.random() > 0.3, // Mock online status
        recordCount: allRecords.filter(r => r.representativeId === id).length
      }));
      setFieldAgents(agents);
    } catch (error) {
      console.error('Failed to load field agents:', error);
    }
  };
  const loadDashboardData = async () => {
    try {
      const allRecords = await db.getChildRecords();
      setRecords(allRecords); // Admin sees ALL records

      const totalChildren = allRecords.length;
      let normalCases = 0, moderateCases = 0, severeCases = 0;

      allRecords.forEach(record => {
        const bmi = calculateBMI(record.childWeight, record.childHeight);
        const status = getMalnutritionStatus(bmi, record.age);
        if (status === 'Normal') normalCases++;
        if (status === 'Moderate Acute Malnutrition') moderateCases++;
        if (status === 'Severe Acute Malnutrition') severeCases++;
      });

      const malnutritionCases = moderateCases + severeCases;
      const pendingUploads = allRecords.filter(r => !r.isUploaded).length;

      setStats({
        totalChildren,
        malnutritionCases,
        pendingUploads,
        activeRepresentatives: fieldAgents.filter(a => a.isOnline).length,
        moderateCases,
        severeCases,
        normalCases
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredRecords = () => {
    let filtered = [...records];

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      filtered = filtered.filter(record => new Date(record.createdAt) >= filterDate);
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'uploaded') {
        filtered = filtered.filter(record => record.isUploaded);
      } else if (statusFilter === 'pending') {
        filtered = filtered.filter(record => !record.isUploaded);
      } else {
        filtered = filtered.filter(record => {
          const bmi = calculateBMI(record.childWeight, record.childHeight);
          const status = getMalnutritionStatus(bmi, record.age);
          return status.toLowerCase().includes(statusFilter);
        });
      }
    }

    // National ID filter
    if (nationalIdFilter.trim()) {
      filtered = filtered.filter(record => 
        record.representativeId.toLowerCase().includes(nationalIdFilter.toLowerCase())
      );
    }
    return filtered;
  };

  // Get filtered data for charts using cached filtered records
  const getFilteredDataForCharts = () => {
    const filteredRecords = filteredRecordsCache.length > 0 ? filteredRecordsCache : getFilteredRecords();
    
    let normalCases = 0, moderateCases = 0, severeCases = 0;
    filteredRecords.forEach(record => {
      const bmi = calculateBMI(record.childWeight, record.childHeight);
      const status = getMalnutritionStatus(bmi, record.age);
      if (status === 'Normal') normalCases++;
      if (status === 'Moderate Acute Malnutrition') moderateCases++;
      if (status === 'Severe Acute Malnutrition') severeCases++;
    });

    const ageGroups = filteredRecords.reduce((acc, record) => {
      const ageGroup = record.age < 1 ? '0-1' :
        record.age < 3 ? '1-3' :
        record.age < 5 ? '3-5' :
        record.age < 10 ? '5-10' : '10+';
      acc[ageGroup] = (acc[ageGroup] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const ageGroupData = Object.entries(ageGroups).map(([group, count]) => ({
      age: group,
      count,
    }));

    const AGE_ORDER = ['0-1', '1-3', '3-5', '5-10', '10+'];
    ageGroupData.sort((a, b) => AGE_ORDER.indexOf(a.age) - AGE_ORDER.indexOf(b.age));

    return {
      malnutritionData: [
        { name: t('statusGood'), value: normalCases },
        { name: t('statusModerate'), value: moderateCases },
        { name: t('statusHighRisk'), value: severeCases },
      ],
      ageGroupData
    };
  };

  const handleSearchAndDownload = async () => {
    if (!searchHealthId.trim()) {
      alert(t('alerts.enterHealthId'));
      return;
    }
    try {
      const record = await db.getChildRecordByHealthId(searchHealthId.trim());
      if (record) {
        await PDFService.downloadHealthBooklet(record);
      } else {
        alert(t('alerts.noRecordFound'));
      }
    } catch (error) {
      console.error('Failed to search/download record:', error);
      alert(t('alerts.downloadFailed'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">{t('noRecordsFound')}</p>
      </div>
    );
  }

  const { malnutritionData, ageGroupData } = getFilteredDataForCharts();

  // Trend data for the last 7 days
  const trendData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dayRecords = records.filter(record => {
      const recordDate = new Date(record.createdAt);
      return recordDate.toDateString() === date.toDateString();
    });
    return {
      date: date.toLocaleDateString('en-US', { weekday: 'short' }),
      records: dayRecords.length,
      malnutrition: dayRecords.filter(record => {
        const bmi = calculateBMI(record.childWeight, record.childHeight);
        const status = getMalnutritionStatus(bmi, record.age);
        return status !== 'Normal';
      }).length
    };
  });

  const filteredRecords = getFilteredRecords();
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central" fontSize="12" fontWeight="bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('dashboard')}</h2>
        <p className="text-gray-600">{t('fillForm')}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('totalChildren')}</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalChildren}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('malnutritionCases')}</p>
              <p className="text-3xl font-bold text-gray-900">{stats.malnutritionCases}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('pendingUploads')}</p>
              <p className="text-3xl font-bold text-gray-900">{stats.pendingUploads}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Upload className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('activeFieldAgents')}</p>
              <p className="text-3xl font-bold text-gray-900">{stats.activeRepresentatives}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Health ID Search */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">{t('downloadHealthRecord')}</h3>
        <div className="flex space-x-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder={t('enterHealthIdPlaceholder') || ''}
              value={searchHealthId}
              onChange={(e) => setSearchHealthId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleSearchAndDownload}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center space-x-2"
          >
            <Search className="w-4 h-4" />
            <span>{t('searchAndDownload')}</span>
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Advanced Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Upload Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Records</option>
              <option value="uploaded">Uploaded</option>
              <option value="pending">Pending</option>
              <option value="normal">Normal Status</option>
              <option value="moderate">Moderate Malnutrition</option>
              <option value="severe">Severe Malnutrition</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search by National ID</label>
            <input
              type="text"
              value={nationalIdFilter}
              onChange={(e) => setNationalIdFilter(e.target.value)}
              placeholder="Enter field agent national ID..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setDateFilter('all');
                setStatusFilter('all');
                setNationalIdFilter('');
              }}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredRecordsCache.length || getFilteredRecords().length} of {records.length} records
        </div>
      </div>

      {/* Field Agents Status */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Active Field Agents</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fieldAgents.map(agent => (
            <div key={agent.id} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">{agent.name}</h4>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  agent.isOnline ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {agent.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              <p className="text-sm text-gray-600">Records: {agent.recordCount}</p>
              <p className="text-xs text-gray-500">ID: {agent.id}</p>
            </div>
          ))}
        </div>
      </div>
      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">{t('nutritionalStatusDistribution')}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Legend verticalAlign="bottom" height={36} />
              <Pie
                data={malnutritionData}
                cx="50%" cy="50%"
                labelLine={false} label={renderCustomizedLabel}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {malnutritionData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">{t('childrenByAgeGroup')}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ageGroupData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="age" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Weekly Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="records" stroke="#6366F1" strokeWidth={2} name="Total Records" />
              <Line type="monotone" dataKey="malnutrition" stroke="#EF4444" strokeWidth={2} name="Malnutrition Cases" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>


      {/* Recent Records */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">{t('recentRecords')}</h3>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <FileText className="w-4 h-4" />
            <span>{filteredRecords.length} records</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">{t('childName')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">{t('healthIdLabel')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Parent/Guardian</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">{t('age')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">BMI</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">{t('statusLabel')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">{t('createdLabel')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Field Agent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Upload</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRecords.slice(0, 20).map((record) => {
                const bmi = calculateBMI(record.childWeight, record.childHeight);
                const malnutritionStatus = getMalnutritionStatus(bmi, record.age);
                return (
                  <tr key={record.id}>
                    <td className="px-6 py-4">{record.childName}</td>
                    <td className="px-6 py-4 font-mono text-indigo-600">{record.healthId}</td>
                    <td className="px-6 py-4">{record.parentGuardianName}</td>
                    <td className="px-6 py-4">{record.age}</td>
                    <td className="px-6 py-4 font-semibold">{bmi.toFixed(1)}</td>
                    <td className="px-6 py-4">
                      <span className={
                        malnutritionStatus === 'Normal' ? 'bg-green-100 text-green-800 px-2 py-1 rounded-full' :
                        malnutritionStatus.includes('Moderate') ? 'bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full' :
                        'bg-red-100 text-red-800 px-2 py-1 rounded-full'
                      }>
                        {malnutritionStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4">{new Date(record.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-xs text-gray-500">{record.representativeId.slice(-8)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        record.isUploaded ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {record.isUploaded ? 'Uploaded' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => PDFService.downloadHealthBooklet(record)}
                        className="text-indigo-600 hover:text-indigo-900 flex items-center space-x-1"
                      >
                        <Download className="w-4 h-4" />
                        <span>{t('downloadPDF')}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}