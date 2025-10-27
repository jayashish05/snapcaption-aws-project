/**
 * AWS Lambda Handler for SnapCaption.AI
 * This file wraps the Express app for serverless deployment
 */

const serverless = require('serverless-http');
const app = require('./server');

// Configure serverless-http options
const handler = serverless(app, {
  binary: ['image/*', 'application/octet-stream'], // Handle binary uploads
});

module.exports.handler = handler;
