const mongoose = require('mongoose');

const AlgorithmPredictionSchema = new mongoose.Schema({
    algorithm: { type: String, required: true },
    riskLevel: { type: String, enum: ['low', 'medium', 'high', 'unknown'], default: 'unknown' },
    confidence: { type: Number, default: 0 }
}, { _id: false });

const FeaturesSchema = new mongoose.Schema({
    loc: { type: Number, default: 0 },
    complexity: { type: Number, default: 0 },
    commentRatio: { type: Number, default: 0 },
    functions: { type: Number, default: 0 },
    classes: { type: Number, default: 0 },
    dependencies: { type: Number, default: 0 }
}, { _id: false });

const PredictionHistorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    filename: { type: String, required: true, trim: true },
    projectName: { type: String, default: 'Unknown Project', trim: true },

    features: { type: FeaturesSchema, default: () => ({}) },

    algorithmPredictions: { type: [AlgorithmPredictionSchema], default: [] },

    consensusRisk: {
        type: String,
        enum: ['low', 'medium', 'high', 'unknown'],
        default: 'unknown',
        index: true
    },

    // Spot-verdict issues detected for this file
    issuesDetected: { type: [String], default: [] },

    createdAt: { type: Date, default: Date.now, index: true }
},
    {
        // Compound index for fast per-user date-sorted queries
        indexes: [{ fields: { userId: 1, createdAt: -1 } }]
    });

// TTL: auto-remove entries older than 90 days (optional safety net)
PredictionHistorySchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

module.exports = mongoose.model('PredictionHistory', PredictionHistorySchema);
