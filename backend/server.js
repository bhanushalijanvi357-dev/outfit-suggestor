const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');

dotenv.config();

// Initialize Firebase
const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
admin.initializeApp({
    credential: admin.credential.cert(firebaseConfig),
    projectId: firebaseConfig.project_id
});

const db = admin.firestore();

const app = express();

// Middleware
app.use(cors({
    origin: 'https://outfit-suggestor-kzmj.vercel.app',
    credentials: true
}));
app.use(express.json());

// Auth Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key', (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// =================== AUTHENTICATION ROUTES ===================

// Register
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    
    try {
        // Check if email exists
        const userDoc = await db.collection('users').doc(email).get();
        
        if (userDoc.exists) {
            return res.status(400).json({ message: 'Email already exists' });
        }
        
        // Create user
        const userId = `user_${Date.now()}`;
        await db.collection('users').doc(email).set({
            id: userId,
            name,
            email,
            password,
            createdAt: new Date()
        });
        
        res.status(201).json({ 
            message: 'User registered successfully',
            userId 
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const userDoc = await db.collection('users').doc(email).get();
        
        if (!userDoc.exists) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        
        const user = userDoc.data();
        
        if (user.password !== password) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET || 'your_secret_key',
            { expiresIn: '7d' }
        );
        
        res.json({
            message: 'Login successful',
            token,
            user: { id: user.id, name: user.name, email: user.email }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// =================== OUTFIT SUGGESTION ROUTES ===================

const outfitDatabase = {
    'male': {
        'casual': {
            'hot': {
                'summer': { topwear: 'Light Cotton T-shirt', bottomwear: 'Shorts', footwear: 'Sandals', accessories: 'Sunglasses' },
                'monsoon': { topwear: 'Cotton Shirt', bottomwear: 'Shorts', footwear: 'Waterproof Shoes', accessories: 'Cap' }
            },
            'mild': {
                'spring': { topwear: 'Casual Shirt', bottomwear: 'Chinos', footwear: 'Sneakers', accessories: 'Watch' },
                'summer': { topwear: 'T-shirt', bottomwear: 'Jeans', footwear: 'Sneakers', accessories: 'Belt' }
            },
            'cold': {
                'winter': { topwear: 'Sweater', bottomwear: 'Jeans', footwear: 'Boots', accessories: 'Scarf' }
            }
        },
        'college': {
            'hot': {
                'summer': { topwear: 'T-shirt', bottomwear: 'Jeans/Shorts', footwear: 'Sneakers', accessories: 'Backpack' },
                'monsoon': { topwear: 'Full Sleeve Shirt', bottomwear: 'Jeans', footwear: 'Shoes', accessories: 'Bag' }
            },
            'mild': {
                'spring': { topwear: 'Casual Shirt', bottomwear: 'Jeans', footwear: 'Sneakers', accessories: 'Watch' }
            },
            'cold': {
                'winter': { topwear: 'Hoodie/Jacket', bottomwear: 'Jeans', footwear: 'Boots', accessories: 'Cap' }
            }
        },
        'party': {
            'hot': {
                'summer': { topwear: 'Party Shirt', bottomwear: 'Trousers', footwear: 'Party Shoes', accessories: 'Watch' }
            },
            'mild': {
                'spring': { topwear: 'Formal Shirt', bottomwear: 'Trousers', footwear: 'Formal Shoes', accessories: 'Tie' }
            },
            'cold': {
                'winter': { topwear: 'Blazer', bottomwear: 'Formal Pants', footwear: 'Formal Shoes', accessories: 'Scarf' }
            }
        },
        'interview': {
            'hot': {
                'summer': { topwear: 'Formal Shirt', bottomwear: 'Formal Trousers', footwear: 'Formal Shoes', accessories: 'Watch' }
            },
            'mild': {
                'spring': { topwear: 'Formal Shirt', bottomwear: 'Formal Pants', footwear: 'Polished Shoes', accessories: 'Tie' }
            },
            'cold': {
                'winter': { topwear: 'Blazer + Shirt', bottomwear: 'Formal Pants', footwear: 'Formal Shoes', accessories: 'Watch' }
            }
        },
        'wedding': {
            'hot': {
                'summer': { topwear: 'Formal Shirt/Sherwani', bottomwear: 'Formal Pants/Dhoti', footwear: 'Formal Shoes', accessories: 'Turban' }
            },
            'mild': {
                'spring': { topwear: 'Kurta/Sherwani', bottomwear: 'Formal Pants', footwear: 'Ethnic Shoes', accessories: 'Stole' }
            },
            'cold': {
                'winter': { topwear: 'Sherwani', bottomwear: 'Formal Pants', footwear: 'Formal Shoes', accessories: 'Turban/Stole' }
            }
        }
    },
    'female': {
        'casual': {
            'hot': {
                'summer': { topwear: 'Crop Top/Tank Top', bottomwear: 'Shorts', footwear: 'Sandals', accessories: 'Sunglasses' },
                'monsoon': { topwear: 'Cotton Blouse', bottomwear: 'Shorts', footwear: 'Waterproof Shoes', accessories: 'Cap' }
            },
            'mild': {
                'spring': { topwear: 'Casual Blouse', bottomwear: 'Jeans', footwear: 'Sneakers', accessories: 'Earrings' },
                'summer': { topwear: 'T-shirt', bottomwear: 'Jeans', footwear: 'Sneakers', accessories: 'Necklace' }
            },
            'cold': {
                'winter': { topwear: 'Sweater', bottomwear: 'Jeans', footwear: 'Boots', accessories: 'Scarf' }
            }
        },
        'college': {
            'hot': {
                'summer': { topwear: 'T-shirt/Top', bottomwear: 'Shorts/Jeans', footwear: 'Sneakers', accessories: 'Backpack' },
                'monsoon': { topwear: 'Full Sleeve Top', bottomwear: 'Jeans', footwear: 'Shoes', accessories: 'Bag' }
            },
            'mild': {
                'spring': { topwear: 'Casual Shirt', bottomwear: 'Jeans', footwear: 'Sneakers', accessories: 'Watch' }
            },
            'cold': {
                'winter': { topwear: 'Hoodie/Jacket', bottomwear: 'Jeans', footwear: 'Boots', accessories: 'Scarf' }
            }
        },
        'party': {
            'hot': {
                'summer': { topwear: 'Party Dress', bottomwear: 'Not Applicable', footwear: 'Heels', accessories: 'Clutch' }
            },
            'mild': {
                'spring': { topwear: 'Formal Dress', bottomwear: 'Not Applicable', footwear: 'Heels', accessories: 'Jewelry' }
            },
            'cold': {
                'winter': { topwear: 'Party Dress + Shawl', bottomwear: 'Not Applicable', footwear: 'Heels', accessories: 'Stole' }
            }
        },
        'interview': {
            'hot': {
                'summer': { topwear: 'Formal Blouse', bottomwear: 'Formal Skirt/Pants', footwear: 'Formal Shoes', accessories: 'Watch' }
            },
            'mild': {
                'spring': { topwear: 'Formal Blouse', bottomwear: 'Formal Pants', footwear: 'Formal Shoes', accessories: 'Jewelry' }
            },
            'cold': {
                'winter': { topwear: 'Blazer + Shirt', bottomwear: 'Formal Pants', footwear: 'Formal Shoes', accessories: 'Watch' }
            }
        },
        'wedding': {
            'hot': {
                'summer': { topwear: 'Saree/Lehenga', bottomwear: 'Not Applicable', footwear: 'Ethnic Shoes', accessories: 'Jewelry' }
            },
            'mild': {
                'spring': { topwear: 'Saree/Dress', bottomwear: 'Not Applicable', footwear: 'Ethnic Heels', accessories: 'Bangles' }
            },
            'cold': {
                'winter': { topwear: 'Saree/Lehenga with Shawl', bottomwear: 'Not Applicable', footwear: 'Ethnic Shoes', accessories: 'Jewelry' }
            }
        }
    }
};

// Get Outfit Suggestion
app.post('/api/outfits/suggest', authenticateToken, (req, res) => {
    const { gender, occasion, weather, season, color } = req.body;
    
    try {
        let suggestion = outfitDatabase[gender]?.[occasion]?.[weather]?.[season];
        
        if (!suggestion) {
            suggestion = {
                topwear: `${color} T-shirt`,
                bottomwear: 'Jeans',
                footwear: 'Sneakers',
                accessories: 'Watch'
            };
        } else {
            suggestion.topwear = `${color} ${suggestion.topwear.split(' ').pop()}`;
        }
        
        res.json({ outfit: suggestion });
    } catch (error) {
        console.error('Suggestion error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Save Favorite Outfit
app.post('/api/outfits/favorites', authenticateToken, async (req, res) => {
    const { gender, occasion, weather, season, color, topwear, bottomwear, footwear, accessories } = req.body;
    
    try {
        const favoriteId = `fav_${Date.now()}`;
        
        await db.collection('users').doc(req.user.email).collection('favorites').doc(favoriteId).set({
            id: favoriteId,
            occasion,
            weather,
            season,
            topwear,
            bottomwear,
            footwear,
            accessories,
            createdAt: new Date()
        });
        
        res.status(201).json({ 
            message: 'Outfit saved successfully',
            id: favoriteId 
        });
    } catch (error) {
        console.error('Save favorite error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get Favorite Outfits
app.get('/api/outfits/favorites', authenticateToken, async (req, res) => {
    try {
        const snapshot = await db.collection('users').doc(req.user.email).collection('favorites').get();
        const favorites = [];
        
        snapshot.forEach(doc => {
            favorites.push(doc.data());
        });
        
        res.json({ favorites });
    } catch (error) {
        console.error('Get favorites error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete Favorite
app.delete('/api/outfits/favorites/:id', authenticateToken, async (req, res) => {
    try {
        await db.collection('users').doc(req.user.email).collection('favorites').doc(req.params.id).delete();
        res.json({ message: 'Favorite deleted' });
    } catch (error) {
        console.error('Delete favorite error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// =================== WARDROBE ROUTES ===================

// Get Wardrobe Items
app.get('/api/wardrobe', authenticateToken, async (req, res) => {
    try {
        const snapshot = await db.collection('users').doc(req.user.email).collection('wardrobe').get();
        const items = [];
        
        snapshot.forEach(doc => {
            items.push(doc.data());
        });
        
        res.json({ items });
    } catch (error) {
        console.error('Get wardrobe error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Add Wardrobe Item
app.post('/api/wardrobe', authenticateToken, async (req, res) => {
    const { type, color, brand } = req.body;
    
    try {
        const itemId = `item_${Date.now()}`;
        
        await db.collection('users').doc(req.user.email).collection('wardrobe').doc(itemId).set({
            id: itemId,
            type,
            color,
            brand,
            createdAt: new Date()
        });
        
        res.status(201).json({ 
            message: 'Item added successfully',
            id: itemId 
        });
    } catch (error) {
        console.error('Add item error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete Wardrobe Item
app.delete('/api/wardrobe/:id', authenticateToken, async (req, res) => {
    try {
        await db.collection('users').doc(req.user.email).collection('wardrobe').doc(req.params.id).delete();
        res.json({ message: 'Item deleted' });
    } catch (error) {
        console.error('Delete item error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log('🔥 Using Firebase Firestore for data storage');
});
