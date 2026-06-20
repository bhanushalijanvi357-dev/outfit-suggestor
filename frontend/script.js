const API_URL = 'https://outfit-suggestor--bhanushalijanvi.replit.app';
let currentUser = null;
let currentSuggestion = null;

// Page Navigation
function showPage(pageName) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageName + '-page').classList.add('active');
    
    if (pageName === 'dashboard') {
        loadWardrobeItems();
        loadFavoriteOutfits();
    }
}

// Dashboard Tab Navigation
function showDashboardTab(tabName) {
    document.querySelectorAll('.dashboard-tab').forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabName + '-tab').classList.add('active');
    
    document.querySelectorAll('.dashboard-nav .nav-link').forEach(link => link.classList.remove('active'));
    event.target.classList.add('active');
    
    if (tabName === 'wardrobe') {
        loadWardrobeItems();
    } else if (tabName === 'favorites') {
        loadFavoriteOutfits();
    }
}

// Registration
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm-password').value;
    
    if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Registration successful! Please login.');
            showPage('login');
            document.getElementById('registerForm').reset();
        } else {
            alert(data.message || 'Registration failed');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Registration error. Please try again.');
    }
});

// Login
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = data.user;
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            alert('Login successful!');
            showPage('dashboard');
            document.getElementById('loginForm').reset();
        } else {
            alert(data.message || 'Login failed');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Login error. Please try again.');
    }
});

// Get Outfit Suggestion
document.getElementById('suggestionForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const gender = document.getElementById('gender').value;
    const occasion = document.getElementById('occasion').value;
    const weather = document.getElementById('weather').value;
    const season = document.getElementById('season').value;
    const color = document.getElementById('color').value;
    
    try {
        const response = await fetch(`${API_URL}/outfits/suggest`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ gender, occasion, weather, season, color })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentSuggestion = data.outfit;
            displaySuggestion(data.outfit);
        } else {
            alert(data.message || 'Failed to get suggestion');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error getting suggestion. Please try again.');
    }
});

function displaySuggestion(outfit) {
    document.getElementById('topwear-suggestion').textContent = outfit.topwear;
    document.getElementById('bottomwear-suggestion').textContent = outfit.bottomwear;
    document.getElementById('footwear-suggestion').textContent = outfit.footwear;
    document.getElementById('accessories-suggestion').textContent = outfit.accessories || 'Optional';
    
    document.getElementById('suggestion-result').style.display = 'block';
}

// Save Favorite Outfit
async function saveFavorite() {
    if (!currentSuggestion) {
        alert('No outfit to save');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/outfits/favorites`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(currentSuggestion)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Outfit saved to favorites!');
            loadFavoriteOutfits();
        } else {
            alert(data.message || 'Failed to save outfit');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error saving outfit. Please try again.');
    }
}

// Load Wardrobe Items
async function loadWardrobeItems() {
    try {
        const response = await fetch(`${API_URL}/wardrobe`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        const wardrobeList = document.getElementById('wardrobe-list');
        
        if (data.items && data.items.length > 0) {
            wardrobeList.innerHTML = data.items.map(item => `
                <div class="wardrobe-item">
                    <div class="wardrobe-icon">
                        ${getItemIcon(item.type)}
                    </div>
                    <h4>${item.type}</h4>
                    <p>Color: ${item.color}</p>
                    <p>Brand: ${item.brand}</p>
                    <button onclick="deleteWardrobeItem(${item.id})">Delete</button>
                </div>
            `).join('');
        } else {
            wardrobeList.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <p>No wardrobe items yet. Add your first item!</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading wardrobe:', error);
    }
}

// Load Favorite Outfits
async function loadFavoriteOutfits() {
    try {
        const response = await fetch(`${API_URL}/outfits/favorites`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        const favoritesList = document.getElementById('favorites-list');
        
        if (data.favorites && data.favorites.length > 0) {
            favoritesList.innerHTML = data.favorites.map(outfit => `
                <div class="favorite-item">
                    <h4>${outfit.occasion.toUpperCase()}</h4>
                    <p><strong>Top:</strong> ${outfit.topwear}</p>
                    <p><strong>Bottom:</strong> ${outfit.bottomwear}</p>
                    <p><strong>Shoes:</strong> ${outfit.footwear}</p>
                    <p><strong>Accessories:</strong> ${outfit.accessories || 'None'}</p>
                    <p><strong>Weather:</strong> ${outfit.weather}</p>
                    <p><strong>Season:</strong> ${outfit.season}</p>
                    <button class="btn btn-secondary" style="margin-top: 1rem;" onclick="deleteFavorite(${outfit.id})">Delete</button>
                </div>
            `).join('');
        } else {
            favoritesList.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <p>No favorite outfits yet. Save your first suggestion!</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading favorites:', error);
    }
}

// Add Wardrobe Item
document.getElementById('addWardrobeForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const type = document.getElementById('item-type').value;
    const color = document.getElementById('item-color').value;
    const brand = document.getElementById('item-brand').value;
    
    try {
        const response = await fetch(`${API_URL}/wardrobe`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ type, color, brand })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Item added to wardrobe!');
            document.getElementById('addWardrobeForm').reset();
            closeWardrobeModal();
            loadWardrobeItems();
        } else {
            alert(data.message || 'Failed to add item');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error adding item. Please try again.');
    }
});

// Delete Wardrobe Item
async function deleteWardrobeItem(id) {
    if (!confirm('Delete this item?')) return;
    
    try {
        const response = await fetch(`${API_URL}/wardrobe/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            loadWardrobeItems();
        } else {
            alert('Failed to delete item');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Delete Favorite
async function deleteFavorite(id) {
    if (!confirm('Delete this favorite?')) return;
    
    try {
        const response = await fetch(`${API_URL}/outfits/favorites/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            loadFavoriteOutfits();
        } else {
            alert('Failed to delete favorite');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Wardrobe Modal
function showAddWardrobeModal() {
    document.getElementById('wardrobeModal').classList.add('active');
}

function closeWardrobeModal() {
    document.getElementById('wardrobeModal').classList.remove('active');
}

// Logout
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        currentUser = null;
        showPage('home');
        alert('Logged out successfully!');
    }
}

// Helper function to get item icon
function getItemIcon(type) {
    const icons = {
        'shirt': '👔',
        'tshirt': '👕',
        'jeans': '👖',
        'pants': '👖',
        'shoes': '👟',
        'jacket': '🧥'
    };
    return icons[type] || '👗';
}

// Check if user is logged in on page load
window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        currentUser = JSON.parse(user);
        showPage('dashboard');
    } else {
        showPage('home');
    }
});

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    const modal = document.getElementById('wardrobeModal');
    if (e.target === modal) {
        closeWardrobeModal();
    }
});
