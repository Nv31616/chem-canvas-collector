import { S3Client, PutObjectCommand, CopyObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

// Initialize the S3 Client for Cloudflare R2
const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Uploads a file buffer to a specified Cloudflare R2 bucket.
 * 
 * @param {Buffer} buffer - The file data to upload.
 * @param {string} fileName - The destination file name (object key).
 * @param {string} bucketName - The target R2 bucket name.
 * @param {string} contentType - The MIME type of the file (e.g., 'image/png').
 * @returns {Promise<string>} - The public URL or object key.
 */
export const uploadFile = async (buffer, fileName, bucketName, contentType) => {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileName,
    Body: buffer,
    ContentType: contentType,
  });

  try {
    await s3Client.send(command);
    
    // Return the public URL if defined, otherwise return the file name key
    if (process.env.PUBLIC_R2_DEV_URL && bucketName === 'reference-images') {
      return `${process.env.PUBLIC_R2_DEV_URL}/${fileName}`;
    }
    return fileName;
  } catch (error) {
    console.error(`[S3Client] Error uploading ${fileName} to ${bucketName}:`, error);
    throw error;
  }
};

/**
 * Copies an existing file between Cloudflare R2 buckets.
 * 
 * @param {string} sourceBucket - The origin bucket name (e.g., 'reference-images').
 * @param {string} targetBucket - The destination bucket name (e.g., 'canvas-dataset').
 * @param {string} fileName - The name of the file to copy (e.g., 'chem_001.json').
 * @returns {Promise<boolean>} - Returns true upon successful execution.
 */
export const copyFile = async (sourceBucket, targetBucket, fileName) => {
  const command = new CopyObjectCommand({
    CopySource: `${sourceBucket}/${fileName}`, // Format required by AWS SDK
    Bucket: targetBucket,
    Key: fileName,
  });

  try {
    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error(`[S3Client] Error copying ${fileName} from ${sourceBucket} to ${targetBucket}:`, error);
    throw error;
  }
};

export default s3Client;