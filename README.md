# Child Health Record Booklet Application

A comprehensive offline-first health data collection system for field agents working in remote areas to track child malnutrition and health indicators.

## 🌟 Features

### Core Functionality
- **Offline-First Data Collection**: Work completely offline with local data storage
- **Child Health Records**: Comprehensive form with photo capture, measurements, and health indicators
- **Unique Health ID Generation**: Automatic generation of unique identifiers for each child
- **eSignet Authentication**: Secure authentication using national ID and OTP
- **Data Synchronization**: Automatic sync when internet connectivity is restored
- **PDF Health Booklets**: Generate and download comprehensive health records

### Advanced Features
- **Multi-Language Support**: English, Hindi, Telugu, and Kannada
- **Geo-location Tagging**: GPS coordinates for survey data
- **Local Data Encryption**: AES encryption for sensitive health information
- **Retry Mechanism**: Automatic retry for failed uploads
- **Admin Dashboard**: Comprehensive analytics and insights
- **Real-time BMI Calculation**: Instant health assessment preview

### Technical Features
- **Progressive Web App (PWA)**: Works on desktop and mobile
- **IndexedDB Storage**: Robust offline data storage
- **Responsive Design**: Optimized for all screen sizes
- **Connection Status**: Real-time online/offline indicators
- **Data Export**: PDF generation and download capabilities

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Modern web browser with IndexedDB support

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd child-health-record-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the development server**
   ```bash
   # Start both frontend and API server
   npm run dev:full
   
   # Or start individually
   npm run server  # API server on port 3001
   npm run dev     # Frontend on port 5173
   ```

5. **Access the application**
   - Frontend: http://localhost:5173
   - API Server: http://localhost:3001
   - Health Check: http://localhost:3001/api/health

## 📱 User Roles

### Field Agent (Offline Mode)
- Collect child health data without internet
- Generate unique Health IDs
- Capture photos and GPS coordinates
- Sync data when connectivity is available
- **Demo Access**: Click "Start as Field Agent" on landing page

### Administrator
- View comprehensive dashboards and analytics
- Download health records by Health ID
- Monitor field agent activities
- Access advanced filtering and reporting
- **Demo Credentials**: Username: `admin`, Password: `admin123`

## 🏗️ Architecture

### Frontend Stack
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Recharts** for data visualization
- **i18next** for internationalization
- **IndexedDB** for offline storage

### Backend Stack
- **Express.js** API server
- **CORS** enabled for cross-origin requests
- **Multer** for file uploads
- **In-memory storage** (demo) - easily replaceable with database

### Data Flow
1. **Offline Collection**: Data stored locally in encrypted IndexedDB
2. **Connection Detection**: Automatic online/offline status monitoring
3. **Authentication**: eSignet integration (mocked for demo)
4. **Sync Process**: Automatic upload with retry mechanism
5. **Admin Access**: Real-time dashboard with filtered views

## 📊 API Endpoints

### Child Records
- `POST /api/child-records` - Upload child record
- `GET /api/child-records` - Get all records
- `GET /api/child-records/:healthId` - Get specific record
- `DELETE /api/child-records` - Clear all records (testing)

### Health Booklets
- `GET /api/health-booklet/:healthId` - Generate PDF booklet

### Statistics
- `GET /api/statistics` - Get dashboard statistics
- `GET /api/health` - Health check endpoint

## 🔒 Security Features

### Data Protection
- **AES Encryption**: All sensitive data encrypted locally
- **Secure Authentication**: eSignet integration with OTP verification
- **Data Validation**: Comprehensive input validation and sanitization
- **CORS Protection**: Configured for secure cross-origin requests

### Privacy Compliance
- **Parental Consent**: Required checkbox for data collection
- **Data Minimization**: Only collect necessary health information
- **Local Storage**: Data remains on device until explicitly synced
- **Audit Trail**: Track all data operations and uploads

## 🌍 Multi-Language Support

Supported languages:
- **English** (en) - Default
- **Hindi** (hi) - हिन्दी
- **Telugu** (te) - తెలుగు
- **Kannada** (kn) - ಕನ್ನಡ

Language files located in `src/locales/`

## 📱 Mobile Support

### PWA Features
- **Offline Functionality**: Full app functionality without internet
- **Responsive Design**: Optimized for mobile screens
- **Camera Integration**: Direct photo capture on mobile devices
- **GPS Integration**: Automatic location capture
- **Touch Optimized**: Mobile-friendly interactions

### Installation
- Add to home screen on mobile devices
- Works like a native app
- Automatic updates when online

## 🔧 Configuration

### Environment Variables
```env
VITE_API_URL=http://localhost:3001/api
VITE_ESIGNET_BASE_URL=https://esignet.collab.mosip.net
VITE_ENABLE_REAL_ESIGNET=false
VITE_ENABLE_GEOLOCATION=true
VITE_ENABLE_OFFLINE_MODE=true
```

### Feature Flags
- **Real eSignet**: Enable actual eSignet integration
- **Geolocation**: Enable GPS coordinate capture
- **Offline Mode**: Enable offline functionality

## 🧪 Testing

### Demo Data
The application includes demo functionality:
- **Mock Authentication**: Simplified login for testing
- **Sample Records**: Pre-populated data for demonstration
- **Simulated Network**: Mock API responses and failures

### Test Scenarios
1. **Offline Collection**: Disconnect internet and create records
2. **Sync Process**: Reconnect and observe automatic synchronization
3. **Admin Dashboard**: View analytics and download reports
4. **Multi-language**: Switch between supported languages
5. **Mobile Experience**: Test on various screen sizes

## 📈 Analytics & Insights

### Dashboard Metrics
- **Total Children**: Count of all recorded children
- **Malnutrition Cases**: Children identified with malnutrition
- **Upload Status**: Pending vs. uploaded records
- **Regional Distribution**: Geographic spread of data
- **Trend Analysis**: Weekly patterns and growth

### Filtering Options
- **Date Range**: Today, week, month, all time
- **Upload Status**: All, uploaded, pending
- **Health Status**: Normal, moderate, severe malnutrition
- **Regional**: Filter by geographic regions

## 🚀 Deployment

### Production Build
```bash
npm run build
npm run preview
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001 5173
CMD ["npm", "run", "dev:full"]
```

### Environment Setup
1. Configure production API endpoints
2. Set up real eSignet integration
3. Configure database connections
4. Enable HTTPS for security
5. Set up monitoring and logging

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

### Code Standards
- TypeScript for type safety
- ESLint for code quality
- Prettier for formatting
- Conventional commits

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

### Documentation
- API documentation in `/docs/api.md`
- Architecture overview in `/docs/architecture.md`
- Deployment guide in `/docs/deployment.md`

### Issues
Report bugs and feature requests through GitHub issues.

### Contact
For questions about MOSIP integration or eSignet setup, refer to the official MOSIP documentation.

---

**Built for MOSIP Decide Challenge - Empowering Field Agents to Capture Critical Child Health Data Anywhere**