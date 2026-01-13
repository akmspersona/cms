// reminders.js - Reminder management functionality

import { db } from './firebase.js';
import { getCurrentUser } from './auth.js';
import { 
    collection, 
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query, 
    where, 
    getDocs,
    orderBy,
    serverTimestamp,
    Timestamp 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// DOM elements
const remindersList = document.getElementById('remindersList');
const completedReminders = document.getElementById('completedReminders');
const noRemindersElement = document.getElementById('noReminders');
const loadingRemindersElement = document.getElementById('loadingReminders');
const noCompletedElement = document.getElementById('noCompleted');
const reminderModal = document.getElementById('reminderModal');
const reminderForm = document.getElementById('reminderForm');
const reminderModalTitle = document.getElementById('reminderModalTitle');

// State variables
let currentReminders = [];
let currentLeads = [];
let currentReminderId = null;

// Initialize reminders page
document.addEventListener('DOMContentLoaded', async () => {
    const user = getCurrentUser();
    if (user) {
        await Promise.all([
            loadReminders(user.uid),
            loadLeadsForDropdown(user.uid)
        ]);
        setupEventListeners();
        updateReminderStats();
    }
});

// Load reminders from Firestore
async function loadReminders(userId) {
    showLoading(true);
    
    try {
        const remindersRef = collection(db, 'reminders');
        const q = query(
            remindersRef, 
            where('userId', '==', userId),
            orderBy('reminderDate', 'asc')
        );
        
        const querySnapshot = await getDocs(q);
        currentReminders = [];
        
        querySnapshot.forEach((doc) => {
            const reminder = doc.data();
            currentReminders.push({
                id: doc.id,
                ...reminder,
                reminderDate: reminder.reminderDate?.toDate()
            });
        });
        
        displayReminders(currentReminders);
        updateReminderStats();
        
    } catch (error) {
        console.error('Error loading reminders:', error);
        showMessage('Failed to load reminders', 'error');
    } finally {
        showLoading(false);
    }
}

// Load leads for dropdown
async function loadLeadsForDropdown(userId) {
    try {
        const leadsRef = collection(db, 'leads');
        const q = query(
            leadsRef, 
            where('userId', '==', userId),
            where('status', '!=', 'Closed')
        );
        
        const querySnapshot = await getDocs(q);
        currentLeads = [];
        
        querySnapshot.forEach((doc) => {
            currentLeads.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        populateLeadDropdown();
        
    } catch (error) {
        console.error('Error loading leads:', error);
    }
}

// Populate lead dropdown
function populateLeadDropdown() {
    const leadDropdown = document.getElementById('reminderLead');
    if (!leadDropdown) return;
    
    // Clear existing options except first one
    leadDropdown.innerHTML = '<option value="">No lead associated</option>';
    
    currentLeads.forEach(lead => {
        const option = document.createElement('option');
        option.value = lead.id;
        option.textContent = `${lead.name}${lead.company ? ` (${lead.company})` : ''}`;
        leadDropdown.appendChild(option);
    });
}

// Display reminders
function displayReminders(reminders) {
    remindersList.innerHTML = '';
    completedReminders.innerHTML = '';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const activeReminders = reminders.filter(r => !r.completed);
    const completedRemindersList = reminders.filter(r => r.completed);
    
    // Display active reminders
    if (activeReminders.length === 0) {
        noRemindersElement.classList.remove('hidden');
    } else {
        noRemindersElement.classList.add('hidden');
        
        activeReminders.forEach(reminder => {
            const reminderElement = createReminderElement(reminder, false);
            remindersList.innerHTML += reminderElement;
        });
    }
    
    // Display completed reminders
    if (completedRemindersList.length === 0) {
        noCompletedElement.classList.remove('hidden');
    } else {
        noCompletedElement.classList.add('hidden');
        
        completedRemindersList.forEach(reminder => {
            const reminderElement = createReminderElement(reminder, true);
            completedReminders.innerHTML += reminderElement;
        });
    }
    
    // Add event listeners to reminder actions
    addReminderActionListeners();
}

// Create reminder HTML element
function createReminderElement(reminder, isCompleted) {
    const reminderDate = reminder.reminderDate;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let statusClass = '';
    let statusText = '';
    
    if (isCompleted) {
        statusClass = 'completed';
        statusText = 'Completed';
    } else if (reminderDate < today) {
        statusClass = 'overdue';
        statusText = 'Overdue';
    } else if (reminderDate.toDateString() === today.toDateString()) {
        statusClass = 'due-today';
        statusText = 'Due Today';
    }
    
    const associatedLead = reminder.leadId ? 
        currentLeads.find(lead => lead.id === reminder.leadId) : null;
    
    return `
        <div class="reminder-item ${statusClass}" data-reminder-id="${reminder.id}">
            <div class="reminder-content">
                <div class="reminder-main">
                    <div class="reminder-header">
                        <h4>${reminder.title || 'No Title'}</h4>
                        <span class="reminder-status">${statusText}</span>
                    </div>
                    
                    ${reminder.description ? `
                        <p class="reminder-description">${reminder.description}</p>
                    ` : ''}
                    
                    <div class="reminder-details">
                        <div class="detail">
                            <i class="far fa-calendar"></i>
                            <span>${formatDate(reminderDate)}</span>
                        </div>
                        
                        ${reminder.reminderTime ? `
                            <div class="detail">
                                <i class="far fa-clock"></i>
                                <span>${reminder.reminderTime}</span>
                            </div>
                        ` : ''}
                        
                        <div class="detail">
                            <i class="fas fa-exclamation-circle"></i>
                            <span class="priority-${reminder.priority || 'medium'}">
                                ${(reminder.priority || 'medium').toUpperCase()}
                            </span>
                        </div>
                        
                        ${associatedLead ? `
                            <div class="detail">
                                <i class="fas fa-user"></i>
                                <span>${associatedLead.name}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="reminder-actions">
                    ${!isCompleted ? `
                        <button class="btn btn-sm btn-success complete-reminder" title="Mark Complete">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn btn-sm btn-outline edit-reminder" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                    ` : ''}
                    <button class="btn btn-sm btn-danger delete-reminder" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Setup event listeners
function setupEventListeners() {
    // Add reminder button
    document.getElementById('addReminderBtn')?.addEventListener('click', () => {
        openReminderModal();
    });
    
    document.getElementById('addFirstReminder')?.addEventListener('click', () => {
        openReminderModal();
    });
    
    // Modal controls
    document.getElementById('closeReminderModal')?.addEventListener('click', closeReminderModal);
    document.getElementById('cancelReminderModal')?.addEventListener('click', closeReminderModal);
    
    // Reminder form submission
    if (reminderForm) {
        reminderForm.addEventListener('submit', handleReminderSubmit);
    }
    
    // Filter and sort
    document.getElementById('filterReminders')?.addEventListener('change', filterReminders);
    document.getElementById('sortReminders')?.addEventListener('change', sortReminders);
    
    // Repeat reminder toggle
    document.getElementById('reminderRepeat')?.addEventListener('change', (e) => {
        document.getElementById('repeatOptions').classList.toggle('hidden', !e.target.checked);
    });
    
    // Set default date to tomorrow
    const dateInput = document.getElementById('reminderDate');
    if (dateInput) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        dateInput.value = tomorrow.toISOString().split('T')[0];
    }
}

// Add event listeners to reminder action buttons
function addReminderActionListeners() {
    // Complete buttons
    document.querySelectorAll('.complete-reminder').forEach(button => {
        button.addEventListener('click', async (e) => {
            const reminderId = e.target.closest('.reminder-item').dataset.reminderId;
            await markReminderComplete(reminderId);
        });
    });
    
    // Edit buttons
    document.querySelectorAll('.edit-reminder').forEach(button => {
        button.addEventListener('click', (e) => {
            const reminderId = e.target.closest('.reminder-item').dataset.reminderId;
            editReminder(reminderId);
        });
    });
    
    // Delete buttons
    document.querySelectorAll('.delete-reminder').forEach(button => {
        button.addEventListener('click', (e) => {
            const reminderId = e.target.closest('.reminder-item').dataset.reminderId;
            if (confirm('Are you sure you want to delete this reminder?')) {
                deleteReminder(reminderId);
            }
        });
    });
}

// Open reminder modal
function openReminderModal(reminder = null) {
    reminderModalTitle.textContent = reminder ? 'Edit Reminder' : 'Add New Reminder';
    
    if (reminder) {
        // Fill form with reminder data
        document.getElementById('reminderTitle').value = reminder.title || '';
        document.getElementById('reminderDescription').value = reminder.description || '';
        
        const reminderDate = reminder.reminderDate;
        if (reminderDate) {
            document.getElementById('reminderDate').value = 
                reminderDate.toISOString().split('T')[0];
        }
        
        document.getElementById('reminderTime').value = reminder.reminderTime || '';
        document.getElementById('reminderPriority').value = reminder.priority || 'medium';
        document.getElementById('reminderLead').value = reminder.leadId || '';
        
        if (reminder.repeatInterval) {
            document.getElementById('reminderRepeat').checked = true;
            document.getElementById('repeatInterval').value = reminder.repeatInterval;
            document.getElementById('repeatOptions').classList.remove('hidden');
        }
        
        currentReminderId = reminder.id;
    } else {
        // Reset form
        reminderForm.reset();
        
        // Set default date to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        document.getElementById('reminderDate').value = tomorrow.toISOString().split('T')[0];
        
        currentReminderId = null;
    }
    
    reminderModal.classList.add('active');
}

// Close reminder modal
function closeReminderModal() {
    reminderModal.classList.remove('active');
    reminderForm.reset();
    currentReminderId = null;
    
    // Hide repeat options
    document.getElementById('reminderRepeat').checked = false;
    document.getElementById('repeatOptions').classList.add('hidden');
}

// Handle reminder form submission
async function handleReminderSubmit(e) {
    e.preventDefault();
    
    const user = getCurrentUser();
    if (!user) return;
    
    // Get form data
    const title = document.getElementById('reminderTitle').value.trim();
    const description = document.getElementById('reminderDescription').value.trim();
    const dateStr = document.getElementById('reminderDate').value;
    const timeStr = document.getElementById('reminderTime').value;
    const priority = document.getElementById('reminderPriority').value;
    const leadId = document.getElementById('reminderLead').value;
    const shouldRepeat = document.getElementById('reminderRepeat').checked;
    const repeatInterval = shouldRepeat ? 
        document.getElementById('repeatInterval').value : null;
    
    // Combine date and time
    const reminderDate = new Date(dateStr);
    if (timeStr) {
        const [hours, minutes] = timeStr.split(':');
        reminderDate.setHours(parseInt(hours), parseInt(minutes));
    }
    
    const reminderData = {
        userId: user.uid,
        title,
        description,
        reminderDate: Timestamp.fromDate(reminderDate),
        reminderTime: timeStr || null,
        priority,
        leadId: leadId || null,
        completed: false,
        repeatInterval: repeatInterval,
        createdAt: currentReminderId ? undefined : serverTimestamp(),
        updatedAt: serverTimestamp()
    };
    
    try {
        if (currentReminderId) {
            // Update existing reminder
            const reminderRef = doc(db, 'reminders', currentReminderId);
            await updateDoc(reminderRef, reminderData);
            showMessage('Reminder updated successfully!', 'success');
        } else {
            // Add new reminder
            await addDoc(collection(db, 'reminders'), reminderData);
            showMessage('Reminder added successfully!', 'success');
        }
        
        // Close modal and refresh reminders
        closeReminderModal();
        loadReminders(user.uid);
        
    } catch (error) {
        console.error('Error saving reminder:', error);
        showMessage('Failed to save reminder', 'error');
    }
}

// Mark reminder as complete
export async function markReminderComplete(reminderId) {
    const user = getCurrentUser();
    if (!user) return;
    
    try {
        const reminderRef = doc(db, 'reminders', reminderId);
        await updateDoc(reminderRef, {
            completed: true,
            completedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        
        showMessage('Reminder marked as complete!', 'success');
        loadReminders(user.uid);
        
    } catch (error) {
        console.error('Error completing reminder:', error);
        showMessage('Failed to complete reminder', 'error');
    }
}

// Edit reminder
function editReminder(reminderId) {
    const reminder = currentReminders.find(r => r.id === reminderId);
    if (reminder) {
        openReminderModal(reminder);
    }
}

// Delete reminder
async function deleteReminder(reminderId) {
    const user = getCurrentUser();
    if (!user) return;
    
    try {
        const reminderRef = doc(db, 'reminders', reminderId);
        await deleteDoc(reminderRef);
        
        showMessage('Reminder deleted successfully', 'success');
        loadReminders(user.uid);
        
    } catch (error) {
        console.error('Error deleting reminder:', error);
        showMessage('Failed to delete reminder', 'error');
    }
}

// Filter reminders
function filterReminders() {
    const filterValue = document.getElementById('filterReminders').value;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let filtered = [...currentReminders];
    
    switch (filterValue) {
        case 'today':
            filtered = filtered.filter(r => 
                !r.completed && 
                r.reminderDate.toDateString() === today.toDateString()
            );
            break;
        case 'upcoming':
            filtered = filtered.filter(r => 
                !r.completed && 
                r.reminderDate >= today
            );
            break;
        case 'overdue':
            filtered = filtered.filter(r => 
                !r.completed && 
                r.reminderDate < today
            );
            break;
        case 'completed':
            filtered = filtered.filter(r => r.completed);
            break;
        // 'all' shows everything
    }
    
    displayReminders(filtered);
}

// Sort reminders
function sortReminders() {
    const sortValue = document.getElementById('sortReminders').value;
    const sorted = [...currentReminders];
    
    switch (sortValue) {
        case 'date-asc':
            sorted.sort((a, b) => a.reminderDate - b.reminderDate);
            break;
        case 'date-desc':
            sorted.sort((a, b) => b.reminderDate - a.reminderDate);
            break;
        case 'priority':
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            sorted.sort((a, b) => {
                const aPriority = priorityOrder[a.priority] || 0;
                const bPriority = priorityOrder[b.priority] || 0;
                return bPriority - aPriority || (a.reminderDate - b.reminderDate);
            });
            break;
    }
    
    displayReminders(sorted);
}

// Update reminder statistics
function updateReminderStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const activeReminders = currentReminders.filter(r => !r.completed).length;
    const dueToday = currentReminders.filter(r => 
        !r.completed && 
        r.reminderDate.toDateString() === today.toDateString()
    ).length;
    
    const activeElement = document.getElementById('activeReminders');
    const dueTodayElement = document.getElementById('dueToday');
    
    if (activeElement) activeElement.textContent = activeReminders;
    if (dueTodayElement) dueTodayElement.textContent = dueToday;
}

// Show/hide loading state
function showLoading(isLoading) {
    if (loadingRemindersElement) {
        loadingRemindersElement.style.display = isLoading ? 'block' : 'none';
    }
    if (remindersList) {
        remindersList.style.display = isLoading ? 'none' : 'block';
    }
}

// Show message
function showMessage(text, type) {
    // Create or get message element
    let messageDiv = document.getElementById('remindersMessage');
    if (!messageDiv) {
        messageDiv = document.createElement('div');
        messageDiv.id = 'remindersMessage';
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

// Format date helper function
function formatDate(date) {
    if (!date) return 'N/A';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
        return 'Tomorrow';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    }
}

// Export updateReminder function for dashboard use
export async function updateReminder(reminderId, updates) {
    const user = getCurrentUser();
    if (!user) return;
    
    try {
        const reminderRef = doc(db, 'reminders', reminderId);
        await updateDoc(reminderRef, {
            ...updates,
            updatedAt: serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error('Error updating reminder:', error);
        return false;
    }
}