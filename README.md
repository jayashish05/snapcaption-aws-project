# SnapCaption.AI

An AI-powered image caption generator using Google Gemini API with AWS S3 storage and DynamoDB database.

## Features

- 🖼️ Upload images to AWS S3
- 🤖 Generate AI captions using Google Gemini
- 💾 Store metadata in DynamoDB
- 🔍 Search images by caption or date
- 🔄 Regenerate captions for existing images
- 📊 View total image count
- 🎨 Clean, minimal UI with TailwindCSS

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env` and fill in your credentials:
   ```bash
   cp .env.example .env
   ```

4. Configure your AWS credentials and create:
   - S3 bucket for image storage
   - DynamoDB table named `snapcaption-images` with partition key `id` (String)

5. Get your Google Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

6. Run the application:
   ```bash
   npm start
   # Or for development with auto-reload:
   npm run dev
   ```

7. Open http://localhost:3000 in your browser

## Project Structure

```
├── server.js                 # Main Express server
├── routes/
│   └── imageRoutes.js       # Image upload, caption, and search routes
├── services/
│   ├── s3Service.js         # AWS S3 operations
│   ├── dynamoService.js     # AWS DynamoDB operations
│   └── geminiService.js     # Google Gemini API integration
├── views/
│   ├── index.ejs            # Main page template
│   └── partials/
│       ├── header.ejs       # Header partial
│       └── footer.ejs       # Footer partial
└── public/
    └── styles.css           # Additional styles (if needed)
```

## Technologies

- **Frontend**: EJS, TailwindCSS
- **Backend**: Node.js, Express
- **AI**: Google Gemini API
- **Cloud**: AWS S3, AWS DynamoDB
- **File Upload**: Multer

## License

MIT
