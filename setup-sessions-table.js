/**
 * Setup script to create the DynamoDB sessions table for Lambda
 * Run this once: node setup-sessions-table.js
 */

require('dotenv').config();
const { DynamoDBClient, CreateTableCommand, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const TABLE_NAME = 'snapcaption-sessions';

async function createSessionsTable() {
  try {
    // Check if table exists
    try {
      const describeCommand = new DescribeTableCommand({ TableName: TABLE_NAME });
      await client.send(describeCommand);
      console.log(`✅ Table '${TABLE_NAME}' already exists!`);
      return;
    } catch (error) {
      if (error.name !== 'ResourceNotFoundException') {
        throw error;
      }
    }

    // Create table
    const createCommand = new CreateTableCommand({
      TableName: TABLE_NAME,
      KeySchema: [
        { AttributeName: 'id', KeyType: 'HASH' }, // Partition key (session ID)
      ],
      AttributeDefinitions: [
        { AttributeName: 'id', AttributeType: 'S' },
      ],
      BillingMode: 'PAY_PER_REQUEST', // On-demand billing (better for Lambda)
    });

    await client.send(createCommand);
    console.log(`✅ Table '${TABLE_NAME}' created successfully!`);
    console.log('⏳ Waiting for table to be active...');

    // Wait for table to be active
    let tableActive = false;
    while (!tableActive) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const describeCommand = new DescribeTableCommand({ TableName: TABLE_NAME });
      const response = await client.send(describeCommand);
      tableActive = response.Table.TableStatus === 'ACTIVE';
      if (!tableActive) {
        process.stdout.write('.');
      }
    }
    
    console.log('\n✅ Table is now active and ready to use!');
  } catch (error) {
    console.error('❌ Error creating table:', error);
    throw error;
  }
}

// Run the setup
createSessionsTable()
  .then(() => {
    console.log('\n🎉 Sessions table setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  });
