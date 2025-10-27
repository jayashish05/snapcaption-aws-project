const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

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
const USERS_TABLE = 'snapcaption-users';

/**
 * Create a new user
 * @param {string} email - User email
 * @param {string} password - Plain text password
 * @param {string} name - User's name
 * @returns {Promise<Object>} - Created user object (without password)
 */
async function createUser(email, password, name) {
  try {
    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const userId = uuidv4();
    const user = {
      userId,
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      createdAt: new Date().toISOString(),
    };

    const command = new PutCommand({
      TableName: USERS_TABLE,
      Item: user,
    });

    await docClient.send(command);

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

/**
 * Get user by email
 * @param {string} email - User email
 * @returns {Promise<Object|null>} - User object or null
 */
async function getUserByEmail(email) {
  try {
    const command = new QueryCommand({
      TableName: USERS_TABLE,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email.toLowerCase(),
      },
    });

    const result = await docClient.send(command);
    return result.Items && result.Items.length > 0 ? result.Items[0] : null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
}

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} - User object or null
 */
async function getUserById(userId) {
  try {
    const command = new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId },
    });

    const result = await docClient.send(command);
    return result.Item || null;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
}

/**
 * Validate user credentials
 * @param {string} email - User email
 * @param {string} password - Plain text password
 * @returns {Promise<Object|null>} - User object (without password) or null
 */
async function validateUser(email, password) {
  try {
    const user = await getUserByEmail(email);
    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return null;
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } catch (error) {
    console.error('Error validating user:', error);
    return null;
  }
}

module.exports = {
  createUser,
  getUserByEmail,
  getUserById,
  validateUser,
};
