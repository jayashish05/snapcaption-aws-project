#!/bin/bash

# SnapCaption.AI - Environment Setup Helper
# This script helps you create your .env file

echo "🎨 SnapCaption.AI - Environment Setup"
echo "======================================"
echo ""

# Create .env file
if [ -f .env ]; then
    echo "⚠️  .env file already exists!"
    read -p "Do you want to overwrite it? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 1
    fi
fi

cp .env.example .env

echo "✅ Created .env file from template"
echo ""
echo "📝 Please edit the .env file and fill in your credentials:"
echo ""
echo "Required values:"
echo "  1. AWS_REGION (e.g., us-east-1)"
echo "  2. AWS_ACCESS_KEY_ID (from AWS IAM)"
echo "  3. AWS_SECRET_ACCESS_KEY (from AWS IAM)"
echo "  4. S3_BUCKET_NAME (your S3 bucket name)"
echo "  5. DYNAMODB_TABLE_NAME (use: snapcaption-images)"
echo "  6. GEMINI_API_KEY (from Google AI Studio)"
echo ""
echo "💡 Next steps:"
echo "  1. Edit .env file: nano .env"
echo "  2. Install dependencies: npm install"
echo "  3. Start server: npm start"
echo ""
