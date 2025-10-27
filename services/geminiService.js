const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generate caption for an image using Google Gemini
 * @param {Buffer} imageBuffer - Image file buffer
 * @param {string} mimeType - Image MIME type
 * @returns {Promise<string>} - Generated caption
 */
async function generateCaption(imageBuffer, mimeType) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const imagePart = {
      inlineData: {
        data: imageBuffer.toString('base64'),
        mimeType: mimeType,
      },
    };

    const prompt = 'Analyze this image and provide a detailed, creative caption that describes what you see. Keep it concise but informative (2-3 sentences max).';

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const caption = response.text();

    return caption.trim();
  } catch (error) {
    console.error('Error generating caption with Gemini:', error);
    throw new Error('Failed to generate caption');
  }
}

/**
 * Regenerate caption for an existing image URL
 * @param {string} imageUrl - URL of the image
 * @returns {Promise<string>} - Generated caption
 */
async function regenerateCaptionFromUrl(imageUrl) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `Analyze this image and provide a detailed, creative caption that describes what you see. Keep it concise but informative (2-3 sentences max). Image URL: ${imageUrl}`;

    // Note: For production, you'd want to fetch the image and pass it as base64
    // For now, we'll use a different approach with the URL
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: await fetchImageAsBase64(imageUrl),
          mimeType: 'image/jpeg', // Adjust based on actual image type
        },
      },
    ]);

    const response = await result.response;
    const caption = response.text();

    return caption.trim();
  } catch (error) {
    console.error('Error regenerating caption:', error);
    throw new Error('Failed to regenerate caption');
  }
}

/**
 * Helper function to fetch image from URL and convert to base64
 * @param {string} url - Image URL
 * @returns {Promise<string>} - Base64 encoded image
 */
async function fetchImageAsBase64(url) {
  try {
    const https = require('https');
    const http = require('http');
    
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      
      protocol.get(url, (response) => {
        const chunks = [];
        
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve(buffer.toString('base64'));
        });
        response.on('error', reject);
      }).on('error', reject);
    });
  } catch (error) {
    console.error('Error fetching image:', error);
    throw error;
  }
}

module.exports = {
  generateCaption,
  regenerateCaptionFromUrl,
};
