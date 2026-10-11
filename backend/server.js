import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import ImageQueue from './models/ImageQueue.js';
import { uploadFile, copyFile } from './utils/s3Client.js';

dotenv.config();

const app = express();

// Enable CORS and body parsing with a 50mb limit for Base64 canvas images
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// MongoDB Atlas Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((err) => console.error('MongoDB connection error:', err));

/**
 * GET /api/queue
 * Replaces the local progress_manifest.json inspection[cite: 6, 7].
 * Atomically locks a pending image for 5 minutes using findOneAndUpdate.
 */
app.get('/api/queue', async (req, res) => {
  try {
    const now = new Date();
    const lockDurationMs = 5 * 60 * 1000; // 5 minutes
    const lockTime = new Date(now.getTime() + lockDurationMs);

    // Atomically find one 'pending' item that is unlocked or has an expired lock
    const imageItem = await ImageQueue.findOneAndUpdate(
      {
        status: 'pending',
        $or: [{ locked_until: null }, { locked_until: {$lt: now } }],
      },
      { $set: { locked_until: lockTime } },
      { new: true, sort: { created_at: 1 } }
    );

    if (!imageItem) {
      return res.status(404).json({
        message: 'No pending images available in the queue.',
      });
    }

    // Convert filename (e.g. 'train_00336.json') to the corresponding reference image name[cite: 4, 6]
    const baseName = imageItem.filename.replace(/\.json$/i, '');
    const jpgFilename = `${baseName}.jpg`;
    const imageUrl = `${process.env.PUBLIC_R2_DEV_URL}/${jpgFilename}`;

    return res.json({
      filename: imageItem.filename,
      imageUrl: imageUrl,
    });
  } catch (error) {
    console.error('Error in GET /api/queue:', error);
    return res.status(500).json({ error: 'Failed to fetch next queued item.' });
  }
});

/**
 * POST /api/save
 * Replaces local os.write file saving and progress_manifest.json updates[cite: 6, 7].
 * Stores canvas PNG to R2, duplicates matching JSON label, and marks status as 'drawn'.
 */
app.post('/api/save', async (req, res) => {
  try {
    const { image, filename } = req.body;

    if (!image || !filename) {
      return res.status(400).json({ error: 'Missing required fields: image, filename.' });
    }

    // Parse Base64 image payload (handles presence or absence of data URI prefix)
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const baseName = filename.replace(/\.json$/i, '');
    const pngFilename = `${baseName}.png`;

    // 1. Upload drawn PNG to Cloudflare R2 'canvas-dataset' bucket
    await uploadFile(buffer, pngFilename, 'canvas-dataset', 'image/png');

    // 2. Duplicate matching .json label from 'reference-images' to 'canvas-dataset'[cite: 4]
    const jsonFilename = filename.endsWith('.json') ? filename : `${baseName}.json`;
    await copyFile('reference-images', 'canvas-dataset', jsonFilename);

    // 3. Update status to 'drawn' (replacing boolean true state) and release lock[cite: 6, 7]
    const updatedDoc = await ImageQueue.findOneAndUpdate(
      { filename: filename },
      { $set: { status: 'drawn', locked_until: null } },
      { new: true }
    );

    if (!updatedDoc) {
      return res.status(404).json({ error: 'Target record not found in ImageQueue.' });
    }

    return res.json({ status: 'success', message: 'Drawing saved and label paired.' });
  } catch (error) {
    console.error('Error in POST /api/save:', error);
    return res.status(500).json({ error: 'Failed to process drawing submission.' });
  }
});

/**
 * POST /api/skip
 * Replaces progress_manifest.json 'skipped' status assignment[cite: 6].
 * Marks database document as 'skipped' and clears lock.
 */
app.post('/api/skip', async (req, res) => {
  try {
    const { filename } = req.body;

    if (!filename) {
      return res.status(400).json({ error: 'Missing required field: filename.' });
    }

    const updatedDoc = await ImageQueue.findOneAndUpdate(
      { filename: filename },
      { $set: { status: 'skipped', locked_until: null } },
      { new: true }
    );

    if (!updatedDoc) {
      return res.status(404).json({ error: 'Target record not found in ImageQueue.' });
    }

    return res.json({ status: 'success', message: 'Image marked as skipped.' });
  } catch (error) {
    console.error('Error in POST /api/skip:', error);
    return res.status(500).json({ error: 'Failed to update skip status.' });
  }
});

// Port binding
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});