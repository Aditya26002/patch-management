import mongoose from 'mongoose';

const patchSchema = new mongoose.Schema({
  patchId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  severity: {
    type: String,
    enum: ['Critical', 'Important', 'Moderate', 'Low'],
    required: true
  },
  category: {
    type: String,
    enum: ['Security', 'Feature Update', 'Bug Fix'],
    required: true
  },
  affectedOS: [{
    type: String,
    required: true
  }],
  releaseDate: {
    type: Date,
    required: true
  },
  size: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  installedOnHosts: [{
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Host'
    },
    installedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed'],
      default: 'pending'
    }
  }],
  // ? NEW: Upload history tracking
  uploadHistory: [{
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    uploadedBy: String,
    fileName: String,
    fileSize: String,
    status: {
      type: String,
      enum: ['success', 'failed'],
      default: 'success'
    },
    errorMessage: String
  }]
}, {
  timestamps: true,
  versionKey: false,
});

const Patch = mongoose.model('Patch', patchSchema);

export default Patch;