#!/bin/bash
# Lambda Deployment Script for SnapCaption.AI

echo "🚀 SnapCaption.AI - AWS Lambda Deployment"
echo "=========================================="
echo ""

# Step 1: Create sessions table
echo "📊 Step 1: Creating DynamoDB sessions table..."
node setup-sessions-table.js

if [ $? -ne 0 ]; then
    echo "❌ Failed to create sessions table"
    exit 1
fi

echo ""
echo "✅ Sessions table created successfully!"
echo ""

# Step 2: Install Serverless Framework globally (if not installed)
echo "📦 Step 2: Checking Serverless Framework..."
if ! command -v serverless &> /dev/null; then
    echo "Installing Serverless Framework globally..."
    npm install -g serverless
else
    echo "✅ Serverless Framework already installed"
fi

echo ""

# Step 3: Deploy to AWS Lambda
echo "🚀 Step 3: Deploying to AWS Lambda..."
echo ""
serverless deploy

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed"
    exit 1
fi

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "🎉 Your application is now live on AWS Lambda!"
echo "Check the output above for your API Gateway URL"
echo ""
