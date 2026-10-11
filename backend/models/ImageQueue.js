import mongoose from 'mongoose';

const imageQueueSchema = new mongoose.mongoose.Schema({
  filename: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: ['pending', 'drawn', 'skipped'],
    default: 'pending', // Replaces the true/false boolean tracking from progress_manifest.json[cite: 5]
  },
  locked_until: {
    type: Date,
    default: null,
  },
  structure_type: {
    type: String,
    enum: ['linear', 'cyclic', 'unknown'],
    default: 'unknown',
  },
  created_at: {
    type: Date,
    default: Date.now,
  }
});

const ImageQueue = mongoose.model('ImageQueue', imageQueueSchema);

export default ImageQueue;