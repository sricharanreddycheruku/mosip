// Simple Express server for API endpoints
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// In-memory storage for demo (use database in production)
let childRecords = [];
let uploadedFiles = new Map();
let activeFieldAgents = new Map(); // Track active field agents

// Middleware to track field agent activity
const trackFieldAgent = (req, res, next) => {
  const authToken = req.headers.authorization?.replace('Bearer ', '');
  if (authToken && authToken !== 'admin_token') {
    const agentId = authToken.replace('token_', '');
    activeFieldAgents.set(agentId, {
      id: agentId,
      lastActive: new Date(),
      isOnline: true
    });
    
    // Clean up inactive agents (older than 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    for (const [id, agent] of activeFieldAgents.entries()) {
      if (agent.lastActive < fiveMinutesAgo) {
        activeFieldAgents.delete(id);
      }
    }
  }
  next();
};
// Storage configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Upload child record
app.post('/api/child-records', trackFieldAgent, (req, res) => {
  try {
    const record = req.body;
    
    // Validate required fields
    if (!record.healthId || !record.childName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if record already exists
    const existingIndex = childRecords.findIndex(r => r.healthId === record.healthId);
    if (existingIndex >= 0) {
      // Update existing record
      childRecords[existingIndex] = { ...record, updatedAt: new Date().toISOString() };
    } else {
      // Add new record
      childRecords.push({ ...record, uploadedAt: new Date().toISOString() });
    }
    
    console.log(`Record uploaded: ${record.childName} (${record.healthId})`);
    res.json({ success: true, healthId: record.healthId });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload record' });
  }
});

// Get all child records
app.get('/api/child-records', trackFieldAgent, (req, res) => {
  try {
    // In production, implement proper authentication and filtering
    res.json(childRecords);
  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch records' });
  }
});

// Get active field agents
app.get('/api/field-agents', (req, res) => {
  try {
    const agents = Array.from(activeFieldAgents.values()).map(agent => ({
      ...agent,
      name: `Field Agent ${agent.id.slice(-4)}`,
      recordCount: childRecords.filter(r => r.representativeId === agent.id).length
    }));
    res.json(agents);
  } catch (error) {
    console.error('Field agents fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch field agents' });
  }
});
// Get child record by Health ID
app.get('/api/child-records/:healthId', (req, res) => {
  try {
    const { healthId } = req.params;
    const record = childRecords.find(r => r.healthId === healthId);
    
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    res.json(record);
  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch record' });
  }
});

// Generate and download health booklet PDF
app.get('/api/health-booklet/:healthId', async (req, res) => {
  try {
    const { healthId } = req.params;
    const record = childRecords.find(r => r.healthId === healthId);
    
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    // In a real implementation, you would generate the PDF here
    // For now, we'll return a simple response indicating the PDF would be generated
    res.setHeader('Content-Type', 'application/json');
    res.json({ 
      message: 'PDF generation endpoint - implement with jsPDF or similar library',
      record: {
        healthId: record.healthId,
        childName: record.childName,
        downloadUrl: `/api/health-booklet/${healthId}/download`
      }
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// Statistics endpoint for admin dashboard
app.get('/api/statistics', (req, res) => {
  try {
    const totalRecords = childRecords.length;
    const uploadedRecords = childRecords.filter(r => r.uploadedAt).length;
    const pendingRecords = totalRecords - uploadedRecords;
    
    // Calculate malnutrition statistics
    let malnutritionCases = 0;
    childRecords.forEach(record => {
      if (record.childWeight && record.childHeight) {
        const bmi = record.childWeight / Math.pow(record.childHeight / 100, 2);
        if (bmi < 15.5) malnutritionCases++;
      }
    });
    
    res.json({
      totalRecords,
      uploadedRecords,
      pendingRecords,
      malnutritionCases,
      activeFieldAgents: activeFieldAgents.size
    });
  } catch (error) {
    console.error('Statistics error:', error);
    res.status(500).json({ error: 'Failed to generate statistics' });
  }
});

// Delete all records (for testing)
app.delete('/api/child-records', (req, res) => {
  childRecords = [];
  res.json({ success: true, message: 'All records deleted' });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Child Health Record API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;