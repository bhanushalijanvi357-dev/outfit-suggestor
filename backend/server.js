const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

dotenv.config();

const app = express();

// Middleware
app.use(cors({
       origin: 'https://outfit-suggestor-kzmj.vercel.app/',
       credentials: true
   }));
app.use(express.json());

// Data files (no MySQL needed!)
const dataDir = path.join(__dirname, 'data');
const usersFile = path.join(dataDir, 'users.json');
const wardrobeFile = path.join(dataDir, 'wardrobe.json');
const favoritesFile = path.join(dataDir, 'favorites.json');

// Create data directory if doesn't exist
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// Initialize data files
function initializeDataFiles() {
    if (!fs.existsSync(usersFile)) {
        const initialUsers = [
            { id: 1, name: 'John Doe', email: 'john@example.com', password: 'password123' },
            { id: 2, name: 'Jane Smith', email: 'jane@example.com', password: 'password123' }
        ];
        fs.writeFileSync(usersFile, JSON.stringify(initialUsers, null, 2));
    }

    if (!fs.existsSync(wardrobeFile)) {
        fs.writeFileSync(wardrobeFile, JSON.stringify([], null, 2));
    }

    if (!fs.existsSync(favoritesFile)) {
        fs.writeFileSync(favoritesFile, JSON.stringify([], null, 2));
    }
}

initializeDataFiles();

// Helper functions to read/write data
function readUsers() {
    return JSON.parse(fs.readFileSync(usersFile, 'utf8'));
}

function writeUsers(users) {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

function readWardrobe() {
    return JSON.parse(fs.readFileSync(wardrobeFile, 'utf8'));
}

function writeWardrobe(wardrobe) {
    fs.writeFileSync(wardrobeFile, JSON.stringify(wardrobe, null, 2));
}

function readFavorites() {
    return JSON.parse(fs.readFileSync(favoritesFile, 'utf8'));
}

function writeFavorites(favorites) {
    fs.writeFileSync(favoritesFile, JSON.stringify(favorites, null, 2));
}

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
app.post('/api/auth/register', (req, res) => {
    const { name, email, password } = req.body;
    
    try {
        const users = readUsers();
        
        // Check if email already exists
        if (users.some(u => u.email === email)) {
            return res.status(400).json({ message: 'Email already exists' });
        }
        
        // Add new user
        const newUser = {
            id: Math.max(...users.map(u => u.id), 0) + 1,
            name,
            email,
            password
        };
        
        users.push(newUser);
        writeUsers(users);
        
        res.status(201).json({ 
            message: 'User registered successfully',
            userId: newUser.id 
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Login
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    try {
        const users = readUsers();
        const user = users.find(u => u.email === email && u.password === password);
        
        if (!user) {
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
    },
    'unisex': {
        'casual': {
            'hot': {
                'summer': { topwear: 'Cotton T-shirt', bottomwear: 'Shorts', footwear: 'Sneakers', accessories: 'Sunglasses' }
            },
            'mild': {
                'spring': { topwear: 'Casual Shirt', bottomwear: 'Jeans', footwear: 'Sneakers', accessories: 'Watch' }
            },
            'cold': {
                'winter': { topwear: 'Hoodie', bottomwear: 'Jeans', footwear: 'Boots', accessories: 'Scarf' }
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
        }
        
        suggestion.topwear = `${color} ${suggestion.topwear.split(' ').pop()}`;
        
        const outfit = {
            userId: req.user.userId,
            gender,
            occasion,
            weather,
            season,
            color,
            topwear: suggestion.topwear,
            bottomwear: suggestion.bottomwear,
            footwear: suggestion.footwear,
            accessories: suggestion.accessories
        };
        
        res.json({ outfit });
    } catch (error) {
        console.error('Suggestion error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Save Favorite Outfit
app.post('/api/outfits/favorites', authenticateToken, (req, res) => {
    const { gender, occasion, weather, season, color, topwear, bottomwear, footwear, accessories } = req.body;
    
    try {
        const favorites = readFavorites();
        
        const newFavorite = {
            id: Math.max(...favorites.map(f => f.id || 0), 0) + 1,
            user_id: req.user.userId,
            occasion,
            weather,
            season,
            topwear,
            bottomwear,
            footwear,
            accessories,
            created_at: new Date().toISOString()
        };
        
        favorites.push(newFavorite);
        writeFavorites(favorites);
        
        res.status(201).json({ 
            message: 'Outfit saved successfully',
            id: newFavorite.id 
        });
    } catch (error) {
        console.error('Save favorite error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get Favorite Outfits
app.get('/api/outfits/favorites', authenticateToken, (req, res) => {
    try {
        const favorites = readFavorites();
        const userFavorites = favorites.filter(f => f.user_id === req.user.userId);
        res.json({ favorites: userFavorites });
    } catch (error) {
        console.error('Get favorites error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete Favorite
app.delete('/api/outfits/favorites/:id', authenticateToken, (req, res) => {
    try {
        const favorites = readFavorites();
        const filtered = favorites.filter(f => !(f.id == req.params.id && f.user_id === req.user.userId));
        writeFavorites(filtered);
        res.json({ message: 'Favorite deleted' });
    } catch (error) {
        console.error('Delete favorite error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// =================== WARDROBE ROUTES ===================

// Get Wardrobe Items
app.get('/api/wardrobe', authenticateToken, (req, res) => {
    try {
        const wardrobe = readWardrobe();
        const userWardrobe = wardrobe.filter(w => w.user_id === req.user.userId);
        res.json({ items: userWardrobe });
    } catch (error) {
        console.error('Get wardrobe error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Add Wardrobe Item
app.post('/api/wardrobe', authenticateToken, (req, res) => {
    const { type, color, brand } = req.body;
    
    try {
        const wardrobe = readWardrobe();
        
        const newItem = {
            id: Math.max(...wardrobe.map(w => w.id || 0), 0) + 1,
            user_id: req.user.userId,
            type,
            color,
            brand,
            created_at: new Date().toISOString()
        };
        
        wardrobe.push(newItem);
        writeWardrobe(wardrobe);
        
        res.status(201).json({ 
            message: 'Item added successfully',
            id: newItem.id 
        });
    } catch (error) {
        console.error('Add item error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete Wardrobe Item
app.delete('/api/wardrobe/:id', authenticateToken, (req, res) => {
    try {
        const wardrobe = readWardrobe();
        const filtered = wardrobe.filter(w => !(w.id == req.params.id && w.user_id === req.user.userId));
        writeWardrobe(filtered);
        res.json({ message: 'Item deleted' });
    } catch (error) {
        console.error('Delete item error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log('📝 Using JSON file storage (no MySQL needed!)');
});
