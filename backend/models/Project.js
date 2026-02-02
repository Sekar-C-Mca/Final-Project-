const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: [true, 'Please provide a project name'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    path: {
        type: String,
        trim: true
    },
    language: {
        type: String,
        enum: ['python', 'javascript', 'java', 'cpp', 'mixed'],
        default: 'python'
    },
    status: {
        type: String,
        enum: ['active', 'archived'],
        default: 'active'
    },
    totalModules: {
        type: Number,
        default: 0
    },
    highRiskCount: {
        type: Number,
        default: 0
    },
    mediumRiskCount: {
        type: Number,
        default: 0
    },
    lowRiskCount: {
        type: Number,
        default: 0
    },
    lastAnalysis: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update timestamp on save
ProjectSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Project', ProjectSchema);
