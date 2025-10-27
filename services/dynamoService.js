const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

// Configure DynamoDB client - use IAM role in production (Lambda), explicit credentials locally
const clientConfig = {
  region: process.env.AWS_REGION,
};

// Only add credentials if running locally (not in Lambda)
if (process.env.NODE_ENV !== 'production' && process.env.AWS_ACCESS_KEY_ID) {
  clientConfig.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
}

const client = new DynamoDBClient(clientConfig);
const docClient = DynamoDBDocumentClient.from(client);

/**
 * Save image metadata to DynamoDB
 * @param {string} id - Unique image ID
 * @param {string} imageUrl - S3 URL of the image
 * @param {string} caption - Generated caption
 * @param {string} userId - User ID who owns the image
 * @returns {Promise<Object>} - Saved item
 */
async function saveImageMetadata(id, imageUrl, caption, userId) {
  try {
    const item = {
      image_id: id,  // Changed from 'id' to 'image_id' to match DynamoDB table
      imageUrl,
      caption,
      userId,
      createdAt: new Date().toISOString(),
    };

    const command = new PutCommand({
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Item: item,
    });

    await docClient.send(command);
    return item;
  } catch (error) {
    console.error('Error saving to DynamoDB:', error);
    throw new Error('Failed to save image metadata');
  }
}

/**
 * Get all images from DynamoDB for a specific user
 * @param {string} userId - User ID to filter by
 * @returns {Promise<Array>} - Array of image items
 */
async function getAllImages(userId) {
  try {
    const command = new ScanCommand({
      TableName: process.env.DYNAMODB_TABLE_NAME,
      FilterExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
    });

    const response = await docClient.send(command);
    
    // Sort by createdAt in descending order (newest first)
    return (response.Items || []).sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
  } catch (error) {
    console.error('Error fetching from DynamoDB:', error);
    throw new Error('Failed to fetch images');
  }
}

/**
 * Update caption for an existing image
 * @param {string} id - Image ID
 * @param {string} newCaption - New caption text
 * @returns {Promise<Object>} - Update result
 */
async function updateImageCaption(id, newCaption) {
  try {
    const command = new UpdateCommand({
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: { image_id: id },  // Changed from 'id' to 'image_id'
      UpdateExpression: 'SET caption = :caption',
      ExpressionAttributeValues: {
        ':caption': newCaption,
      },
      ReturnValues: 'ALL_NEW',
    });

    const response = await docClient.send(command);
    return response.Attributes;
  } catch (error) {
    console.error('Error updating caption in DynamoDB:', error);
    throw new Error('Failed to update caption');
  }
}

/**
 * Search images by caption or date for a specific user
 * @param {string} searchTerm - Search term
 * @param {string} userId - User ID to filter by
 * @returns {Promise<Array>} - Filtered images
 */
async function searchImages(searchTerm, userId) {
  try {
    const allImages = await getAllImages(userId);
    
    if (!searchTerm) {
      return allImages;
    }

    const lowerSearchTerm = searchTerm.toLowerCase();
    
    return allImages.filter(image => {
      // Search in caption
      const captionMatch = image.caption.toLowerCase().includes(lowerSearchTerm);
      
      // Search in date (format: YYYY-MM-DD)
      const dateMatch = image.createdAt.split('T')[0].includes(lowerSearchTerm);
      
      return captionMatch || dateMatch;
    });
  } catch (error) {
    console.error('Error searching images:', error);
    throw new Error('Failed to search images');
  }
}

module.exports = {
  saveImageMetadata,
  getAllImages,
  updateImageCaption,
  searchImages,
};
