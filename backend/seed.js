import mongoose from 'mongoose';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import ImageQueue from './models/ImageQueue.js';

dotenv.config({ path: '../.env' });

const BUCKET_NAME = 'reference-images';

// Initialize Cloudflare R2 S3 Client
const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function seedDatabase() {
  try {
    // Connect to MongoDB Atlas
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected successfully.');

    let isTruncated = true;
    let continuationToken = undefined;
    let processedCount = 0;

    console.log(`Scanning R2 bucket: ${BUCKET_NAME}...`);

    // Handle pagination in case the bucket has more than 1000 objects
    while (isTruncated) {
      const command = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        ContinuationToken: continuationToken,
      });

      const response = await s3Client.send(command);
      
      if (!response.Contents) {
        console.log('Bucket is empty.');
        break;
      }

      // Filter for .json files to extract the base filename
      const jsonFiles = response.Contents.filter(obj => obj.Key.endsWith('.json'));

      for (const file of jsonFiles) {
        // e.g., extracts "train_00336.json" from the object key[cite: 4, 5]
        const filename = file.Key; 

        // Upsert ensures we don't create duplicates if the script runs multiple times
        await ImageQueue.updateOne(
          { filename: filename },
          { 
            $setOnInsert: { 
              filename: filename,
              status: 'pending',
              locked_until: null
            } 
          },
          { upsert: true }
        );

        processedCount++;
        if (processedCount % 500 === 0) {
          console.log(`Processed ${processedCount} files...`);
        }
      }

      isTruncated = response.IsTruncated;
      continuationToken = response.NextContinuationToken;
    }

    console.log(`\nSeeding complete! Successfully processed and queued ${processedCount} items.`);

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
    process.exit(0);
  }
}

seedDatabase();