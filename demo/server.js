const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Express app setup
const app = express();
app.use(express.json());

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/demo', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// User schema
const UserSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

// API Routes
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        const user = new User({
            username,
            email,
            password: hashedPassword
        });
        
        await user.save();
        res.status(201).json({ message: 'User created successfully' });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        res.json({ message: 'Login successful', user: user.username });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Complex nested route with poor structure
app.get('/api/users/:id/posts/:postId/comments', async (req, res) => {
    try {
        const { id, postId } = req.params;
        
        // This is intentionally complex and poorly structured
        const user = await User.findById(id);
        if (user) {
            if (postId) {
                // Simulating complex logic
                for (let i = 0; i < 100; i++) {
                    for (let j = 0; j < 50; j++) {
                        // Complex nested logic
                        if (i * j > 1000) {
                            console.log('Complex calculation:', i, j);
                        }
                    }
                }
                res.json({ comments: [] });
            } else {
                res.status(400).json({ error: 'Post ID required' });
            }
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});