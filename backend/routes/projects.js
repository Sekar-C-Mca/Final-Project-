const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const Project = require('../models/Project');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const axios = require('axios');

// All routes are protected
router.use(protect);

// @route   GET /api/projects
// @desc    Get all projects for logged in user
// @access  Private
router.get('/', async (req, res) => {
    try {
        const projects = await Project.find({ userId: req.user.id })
            .sort({ updatedAt: -1 });

        res.status(200).json({
            success: true,
            count: projects.length,
            projects
        });
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching projects'
        });
    }
});

// @route   GET /api/projects/:id
// @desc    Get single project
// @access  Private
router.get('/:id', async (req, res) => {
    try {
        const project = await Project.findOne({
            _id: req.params.id,
            userId: req.user.id
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        res.status(200).json({
            success: true,
            project
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching project'
        });
    }
});

// @route   POST /api/projects
// @desc    Create a new project
// @access  Private
router.post(
    '/',
    [
        body('name').notEmpty().withMessage('Project name is required'),
        validate
    ],
    async (req, res) => {
        try {
            const project = await Project.create({
                ...req.body,
                userId: req.user.id
            });

            res.status(201).json({
                success: true,
                message: 'Project created successfully',
                project
            });
        } catch (error) {
            console.error('Error creating project:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating project'
            });
        }
    }
);

// @route   PUT /api/projects/:id
// @desc    Update a project
// @access  Private
router.put('/:id', async (req, res) => {
    try {
        let project = await Project.findOne({
            _id: req.params.id,
            userId: req.user.id
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        project = await Project.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Project updated successfully',
            project
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating project'
        });
    }
});

// @route   DELETE /api/projects/:id
// @desc    Delete a project
// @access  Private
router.delete('/:id', async (req, res) => {
    try {
        const project = await Project.findOne({
            _id: req.params.id,
            userId: req.user.id
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        await project.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Project deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting project'
        });
    }
});

// @route   GET /api/projects/:id/analysis
// @desc    Get analysis results for a project from ML backend
// @access  Private
router.get('/:id/analysis', async (req, res) => {
    try {
        const project = await Project.findOne({
            _id: req.params.id,
            userId: req.user.id
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Fetch from ML backend
        const mlResponse = await axios.get(
            `${process.env.ML_API_URL}/results/${req.params.id}`
        );

        // Update project statistics
        if (mlResponse.data.results) {
            const results = mlResponse.data.results;
            project.totalModules = results.length;
            project.highRiskCount = results.filter(r => r.risk_level === 'high').length;
            project.mediumRiskCount = results.filter(r => r.risk_level === 'medium').length;
            project.lowRiskCount = results.filter(r => r.risk_level === 'low').length;
            project.lastAnalysis = new Date();
            await project.save();
        }

        res.status(200).json({
            success: true,
            data: mlResponse.data
        });
    } catch (error) {
        console.error('Error fetching analysis:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error fetching analysis results'
        });
    }
});

// @route   GET /api/projects/:id/statistics
// @desc    Get statistics for a project
// @access  Private
router.get('/:id/statistics', async (req, res) => {
    try {
        const project = await Project.findOne({
            _id: req.params.id,
            userId: req.user.id
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Fetch from ML backend
        const mlResponse = await axios.get(
            `${process.env.ML_API_URL}/statistics/${req.params.id}`
        );

        res.status(200).json({
            success: true,
            data: mlResponse.data
        });
    } catch (error) {
        console.error('Error fetching statistics:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error fetching statistics'
        });
    }
});

module.exports = router;
