// route-guard.js - Protects pages that require authentication

import { checkAuth } from './auth.js';

// List of protected pages (pages that require login)
const protectedPages = ['dashboard.html', 'leads.html', 'reminders.html'];

// Get current page filename
const currentPage = window.location.pathname.split('/').pop();

// Check if current page requires authentication
if (protectedPages.includes(currentPage)) {
    // Check if user is authenticated
    const user = await checkAuth();
    
    if (!user) {
        // User not logged in, redirect to login page
        window.location.href = 'index.html';
    } else {
        // User is logged in, initialize page
        initializePage(user);
    }
} else if (currentPage === 'index.html') {
    // For login page, check if user is already logged in
    const user = await checkAuth();
    
    if (user) {
        // User already logged in, redirect to dashboard
        window.location.href = 'dashboard.html';
    }
}

// Function to initialize protected pages
function initializePage(user) {
    // Set user info in navbar
    const userEmailElement = document.getElementById('userEmail');
    const userAvatarElement = document.getElementById('userAvatar');
    
    if (userEmailElement && user.email) {
        userEmailElement.textContent = user.email;
    }
    
    if (userAvatarElement && user.email) {
        // Create initials from email
        const initials = user.email.substring(0, 2).toUpperCase();
        userAvatarElement.textContent = initials;
    }
    
    // Set up logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            const { logoutUser } = await import('./auth.js');
            logoutUser();
        });
    }
    
    // Set active navigation link
    setActiveNavLink();
    
    // Initialize dark mode if saved in localStorage
    initializeDarkMode();
}

// Set active navigation link based on current page
function setActiveNavLink() {
    const navLinks = document.querySelectorAll('.navbar-menu a');
    const currentPage = window.location.pathname.split('/').pop();
    
    navLinks.forEach(link => {
        const linkPage = link.getAttribute('href');
        if (linkPage === currentPage) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Dark mode functionality
function initializeDarkMode() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const body = document.body;
    
    // Check localStorage for saved preference
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    
    if (isDarkMode) {
        body.classList.add('dark-mode');
        if (darkModeToggle) darkModeToggle.checked = true;
    }
    
    // Toggle dark mode
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                body.classList.add('dark-mode');
                localStorage.setItem('darkMode', 'true');
            } else {
                body.classList.remove('dark-mode');
                localStorage.setItem('darkMode', 'false');
            }
        });
    }
}

// Export for use in other files
export { initializePage };