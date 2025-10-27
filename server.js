require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const imageRoutes = require('./routes/imageRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session configuration with DynamoDB store (for Lambda/production)
let sessionStore;
if (process.env.NODE_ENV === 'production') {
  const DynamoDBStore = require('connect-dynamodb')(session);
  sessionStore = new DynamoDBStore({
    table: 'snapcaption-sessions',
    // Don't specify AWS config - use IAM role in Lambda
    AWSConfigJSON: {
      region: process.env.AWS_REGION,
    },
    readCapacityUnits: 5,
    writeCapacityUnits: 5,
  });
}

app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'snapcaption-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS in production
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  },
}));

// Middleware - Increase JSON payload limit for base64 images
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/', authRoutes);
app.use('/', imageRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Handle multer errors
  if (err.message === 'Only image files are allowed!') {
    return res.status(400).json({ 
      error: 'Only image files are allowed! Please upload a valid image.' 
    });
  }
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ 
      error: 'File size too large. Maximum size is 5MB.' 
    });
  }

  // Handle other errors
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
    // Return JSON for AJAX requests
    res.status(statusCode).json({ error: message });
  } else {
    // Render error page for regular requests
    res.status(statusCode).render('index', { 
      images: [], 
      totalCount: 0,
      searchTerm: '',
      error: message 
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server (only for local development)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`✨ SnapCaption.AI is running on http://localhost:${PORT}`);
    console.log(`📸 Ready to generate AI-powered image captions!`);
    
    // Check required environment variables
    const requiredEnvVars = [
      'AWS_REGION',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'S3_BUCKET_NAME',
      'DYNAMODB_TABLE_NAME',
      'GEMINI_API_KEY'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.warn('\n⚠️  Warning: Missing environment variables:');
      missingVars.forEach(varName => console.warn(`   - ${varName}`));
      console.warn('   Please check your .env file\n');
    }
  });
}

// Export app for Lambda
module.exports = app;
