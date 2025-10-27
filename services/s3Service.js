const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');

// Configure S3 client - use IAM role in production (Lambda), explicit credentials locally
const s3ClientConfig = {
  region: process.env.AWS_REGION,
};

// Only add credentials if running locally (not in Lambda)
if (process.env.NODE_ENV !== 'production' && process.env.AWS_ACCESS_KEY_ID) {
  s3ClientConfig.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
}

const s3Client = new S3Client(s3ClientConfig);

/**
 * Upload an image to S3
 * @param {Buffer} fileBuffer - Image file buffer
 * @param {string} originalName - Original filename
 * @param {string} mimeType - File MIME type
 * @returns {Promise<string>} - S3 URL of uploaded image
 */
async function uploadImageToS3(fileBuffer, originalName, mimeType) {
  try {
    const fileExtension = originalName.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    
    const uploadParams = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: `images/${fileName}`,
      Body: fileBuffer,
      ContentType: mimeType,
      // Note: ACL removed because bucket has ACLs disabled
      // Images will be accessed via signed URLs
    };

    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    // Construct the S3 URL
    const imageUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/images/${fileName}`;
    
    return imageUrl;
  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw new Error('Failed to upload image to S3');
  }
}

/**
 * Generate a signed URL for an S3 object
 * @param {string} imageUrl - The S3 URL of the image
 * @returns {Promise<string>} - Signed URL valid for 1 hour
 */
async function getSignedImageUrl(imageUrl) {
  try {
    // Extract the key from the S3 URL
    const urlParts = imageUrl.split('.amazonaws.com/');
    if (urlParts.length < 2) {
      // If URL doesn't match S3 pattern, return as-is (might be already accessible)
      return imageUrl;
    }
    
    const key = urlParts[1];
    
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
    });
    
    // Generate signed URL valid for 1 hour
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    // Return original URL as fallback
    return imageUrl;
  }
}

module.exports = {
  uploadImageToS3,
  getSignedImageUrl,
};
