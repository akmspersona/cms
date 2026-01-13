// dashboard.js - Dashboard-specific functionality

import { db } from './firebase.js';
import { getCurrentUser } from './auth.js';
import { 
    collection, 
    query, 
    where, 
    getDocs,
    orderBy,
    limit 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// DOM elements
const totalLeadsElement = document.getElementById('totalLeads');
const activeLeadsElement = document.getElementById('activeLeads');
const upcomingRemindersElement = document.getElementById('upcomingReminders');
const conversionRateElement = document.getElementById('conversionRate');
const recentLeadsBody = document.getElementById('recentLeadsBody');
const dashboardReminders = document.getElementById('dashboardReminders');
const userNameElement = document.getElementById('userName');

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', async () => {
    const user = getCurrentUser();
    
    if (user) {
        // Set user name from email
        if (userNameElement && user.email) {
            const name = user.email.split('@')[0];
            userNameElement.textContent = name.charAt(0).toUpperCase() + name.slice(1);
        }
        
        // Load dashboard data
        await loadDashboardData(user.uid);
    }
});

// Load all dashboard data
async function loadDashboardData(userId) {
    try {
        await Promise.all([
            loadLeadStats(userId),
            loadRecentLeads(userId),
            loadUpcomingReminders(userId)
        ]);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showErrorMessage('Failed to load dashboard data');
    }
}

// Load lead statistics
async function loadLeadStats(userId) {
    const leadsRef = collection(db, 'leads');
    const q = query(leadsRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    const totalLeads = querySnapshot.size;
    const activeLeads = querySnapshot.docs.filter(doc => 
        doc.data().status !== 'Closed'
    ).length;
    
    const closedLeads = querySnapshot.docs.filter(doc => 
        doc.data().status === 'Closed'
    ).length;
    
    const conversionRate = totalLeads > 0 ? 
        Math.round((closedLeads / totalLeads) * 100) : 0;
    
    // Update DOM
    totalLeadsElement.textContent = totalLeads;
    activeLeadsElement.textContent = activeLeads;
    conversionRateElement.textContent = `${conversionRate}%`;
}

// Load recent leads
async function loadRecentLeads(userId) {
    const leadsRef = collection(db, 'leads');
    const q = query(
        leadsRef, 
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(5)
    );
    
    const querySnapshot = await getDocs(q);
    recentLeadsBody.innerHTML = '';
    
    if (querySnapshot.empty) {
        recentLeadsBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center">No leads found. Add your first lead!</td>
            </tr>
        `;
        return;
    }
    
    querySnapshot.forEach((doc) => {
        const lead = doc.data();
        const date = lead.createdAt?.toDate();
        const formattedDate = date ? formatDate(date) : 'N/A';
        
        const row = `
            <tr>
                <td>${lead.name || 'No Name'}</td>
                <td>${lead.email || 'No Email'}</td>
                <td>
                    <span class="status-badge status-${lead.status?.toLowerCase() || 'new'}">
                        ${lead.status || 'New'}
                    </span>
                </td>
                <td>${formattedDate}</td>
            </tr>
        `;
        
        recentLeadsBody.innerHTML += row;
    });
}

// Load upcoming reminders
async function loadUpcomingReminders(userId) {
    const remindersRef = collection(db, 'reminders');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const q = query(
        remindersRef,
        where('userId', '==', userId),
        where('reminderDate', '>=', today),
        where('completed', '==', false),
        orderBy('reminderDate', 'asc'),
        limit(5)
    );
    
    const querySnapshot = await getDocs(q);
    dashboardReminders.innerHTML = '';
    upcomingRemindersElement.textContent = querySnapshot.size;
    
    if (querySnapshot.empty) {
        dashboardReminders.innerHTML = `
            <div class="text-center">
                <p>No upcoming reminders</p>
            </div>
        `;
        return;
    }
    
    querySnapshot.forEach((doc) => {
        const reminder = doc.data();
        const reminderDate = reminder.reminderDate?.toDate();
        const today = new Date();
        const isDueToday = reminderDate && 
            reminderDate.toDateString() === today.toDateString();
        
        const reminderItem = `
            <div class="reminder-item ${isDueToday ? 'due-today' : ''}">
                <div class="reminder-content">
                    <div>
                        <strong>${reminder.title || 'No Title'}</strong>
                        <p class="mt-1">${reminder.notes || 'No notes'}</p>
                        <small>
                            <i class="far fa-clock"></i> 
                            ${formatDate(reminderDate)}
                        </small>
                    </div>
                    <div class="reminder-actions">
                        <button class="btn btn-sm btn-success" onclick="markReminderComplete('${doc.id}')">
                            <i class="fas fa-check"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        dashboardReminders.innerHTML += reminderItem;
    });
}

// Helper function to format dates
function formatDate(date) {
    if (!date) return 'N/A';
    
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return 'Today';
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }
}

// Export data function
document.getElementById('exportData')?.addEventListener('click', async () => {
    const user = getCurrentUser();
    if (!user) return;
    
    try {
        // Get all leads
        const leadsRef = collection(db, 'leads');
        const leadsQuery = query(leadsRef, where('userId', '==', user.uid));
        const leadsSnapshot = await getDocs(leadsQuery);
        
        // Convert to CSV
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Name,Email,Phone,Status,Source,Notes,Created Date\n";
        
        leadsSnapshot.forEach((doc) => {
            const lead = doc.data();
            const row = [
                `"${lead.name || ''}"`,
                `"${lead.email || ''}"`,
                `"${lead.phone || ''}"`,
                `"${lead.status || ''}"`,
                `"${lead.source || ''}"`,
                `"${(lead.notes || '').replace(/"/g, '""')}"`,
                `"${lead.createdAt?.toDate().toLocaleDateString() || ''}"`
            ].join(',');
            csvContent += row + "\n";
        });
        
        // Create download link
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showMessage('Data exported successfully!', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showMessage('Failed to export data', 'error');
    }
});

// Show message function
function showMessage(text, type) {
    // Create message element if it doesn't exist
    let messageDiv = document.getElementById('dashboardMessage');
    if (!messageDiv) {
        messageDiv = document.createElement('div');
        messageDiv.id = 'dashboardMessage';
        messageDiv.className = 'message';
        document.querySelector('.dashboard').prepend(messageDiv);
    }
    
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}

// Show error message
function showErrorMessage(text) {
    showMessage(text, 'error');
}

// Make markReminderComplete available globally
window.markReminderComplete = async function(reminderId) {
    const { updateReminder } = await import('./reminders.js');
    await updateReminder(reminderId, { completed: true });
    location.reload(); // Refresh to show updated list
};
