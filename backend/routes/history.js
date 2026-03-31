const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const PredictionHistory = require('../models/PredictionHistory');

// All routes are protected — user must be logged in
router.use(protect);

// @route  POST /api/history
// @desc   Save a new prediction result
// @access Private
router.post('/', async (req, res) => {
    try {
        const {
            filename,
            projectName,
            features,
            algorithmPredictions,
            consensusRisk,
            issuesDetected
        } = req.body;

        const entry = await PredictionHistory.create({
            userId: req.user._id,
            filename: filename || 'unknown',
            projectName: projectName || 'Unknown Project',
            features: features || {},
            algorithmPredictions: algorithmPredictions || [],
            consensusRisk: consensusRisk || 'unknown',
            issuesDetected: issuesDetected || []
        });

        res.status(201).json({ success: true, data: entry });
    } catch (err) {
        console.error('History save error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to save history entry' });
    }
});

// @route  GET /api/history
// @desc   Get paginated prediction history for the logged-in user
// @access Private
router.get('/', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 50);
        const skip = (page - 1) * limit;

        const [entries, total] = await Promise.all([
            PredictionHistory.find({ userId: req.user._id })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            PredictionHistory.countDocuments({ userId: req.user._id })
        ]);

        res.json({
            success: true,
            data: entries,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (err) {
        console.error('History fetch error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to fetch history' });
    }
});

// @route  GET /api/history/stats
// @desc   Aggregated stats: total, risk distribution, trend (last 7 days)
// @access Private
router.get('/stats', async (req, res) => {
    try {
        const userId = req.user._id;
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const [riskAgg, totalScans, recentScans, topFiles] = await Promise.all([
            // Risk distribution
            PredictionHistory.aggregate([
                { $match: { userId } },
                { $group: { _id: '$consensusRisk', count: { $sum: 1 } } }
            ]),
            // Total scans
            PredictionHistory.countDocuments({ userId }),
            // Last 7 days count
            PredictionHistory.countDocuments({ userId, createdAt: { $gte: sevenDaysAgo } }),
            // Top 3 most scanned filenames
            PredictionHistory.aggregate([
                { $match: { userId } },
                { $group: { _id: '$filename', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 3 }
            ])
        ]);

        const riskDist = { low: 0, medium: 0, high: 0, unknown: 0 };
        riskAgg.forEach(r => { riskDist[r._id] = r.count; });

        const highRiskPct = totalScans > 0
            ? ((riskDist.high / totalScans) * 100).toFixed(1)
            : '0.0';

        res.json({
            success: true,
            stats: {
                totalScans,
                recentScans,
                riskDistribution: riskDist,
                highRiskPercent: parseFloat(highRiskPct),
                topFiles: topFiles.map(f => ({ filename: f._id, count: f.count }))
            }
        });
    } catch (err) {
        console.error('History stats error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to compute stats' });
    }
});

// @route  DELETE /api/history
// @desc   Clear all history for the logged-in user
// @access Private
router.delete('/', async (req, res) => {
    try {
        const result = await PredictionHistory.deleteMany({ userId: req.user._id });
        res.json({ success: true, message: `Cleared ${result.deletedCount} history entries` });
    } catch (err) {
        console.error('History clear error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to clear history' });
    }
});

// @route  DELETE /api/history/:id
// @desc   Delete a single history entry
// @access Private
router.delete('/:id', async (req, res) => {
    try {
        const entry = await PredictionHistory.findOneAndDelete({
            _id: req.params.id,
            userId: req.user._id   // ensure user owns it
        });

        if (!entry) {
            return res.status(404).json({ success: false, message: 'Entry not found' });
        }

        res.json({ success: true, message: 'Entry deleted' });
    } catch (err) {
        console.error('History delete error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to delete entry' });
    }
});

module.exports = router;
