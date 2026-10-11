import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import ImageQueue from './models/ImageQueue.js';

dotenv.config({ path: '../.env' });

// Read text files and convert them to arrays of filenames, removing empty lines
const readList = (filePath) => {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf-8')
    .split('\n')
    .map(name => name.trim())
    .filter(name => name.length > 0);
};

// Helper function to split massive arrays into smaller chunks
const chunkArray = (array, size) => {
  const chunked = [];
  for (let i = 0; i < array.length; i += size) {
    chunked.push(array.slice(i, i + size));
  }
  return chunked;
};

// Reusable function to process updates in batches and log progress
async function processInBatches(compoundsList, type, batchSize = 200) {
  if (compoundsList.length === 0) return 0;
  
  const batches = chunkArray(compoundsList, batchSize);
  let totalModified = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    
    const result = await ImageQueue.updateMany(
      { filename: { $in: batch } },
      { $set: { structure_type: type } }
    );
    
    totalModified += result.modifiedCount;
    
    // Calculate and print progress
    const currentCount = Math.min((i + 1) * batchSize, compoundsList.length);
    console.log(`[${type.toUpperCase()}] Processed ${currentCount} / ${compoundsList.length} items...`);
  }
  
  return totalModified;
}

async function updateDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB.\n');

    const linearCompounds = readList('./1d_compounds.txt');
    const cyclicCompounds = readList('./cyclic_compounds.txt');

    console.log(`Found ${linearCompounds.length} linear and ${cyclicCompounds.length} cyclic compounds in text files.\n`);

    // Process linear compounds
    console.log('--- Starting Linear Compounds ---');
    const linearUpdated = await processInBatches(linearCompounds, 'linear');
    console.log(`✅ Finished linear updates. Modified ${linearUpdated} records.\n`);

    // Process cyclic compounds
    console.log('--- Starting Cyclic Compounds ---');
    const cyclicUpdated = await processInBatches(cyclicCompounds, 'cyclic');
    console.log(`✅ Finished cyclic updates. Modified ${cyclicUpdated} records.\n`);

  } catch (error) {
    console.error('Error updating database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected. Migration complete.');
    process.exit(0);
  }
}

updateDatabase();