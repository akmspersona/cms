// leads.js - Lead management functionality

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
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// DOM elements
const leadsTableBody = document.getElementById('leadsTableBody');
const leadCountElement = document.getElementById('leadCount');
const loadingLeadsElement = document.getElementById('loadingLeads');
const noLeadsElement = document.getElementById('noLeads');
const searchInput = document.getElementById('searchLeads');
const filterStatus = document.getElementById('filterStatus');
const leadModal = document.getElementById('leadModal');
const deleteModal = document.getElementById('deleteModal');
const leadForm = document.getElementById('leadForm');
const modalTitle = document.getElementById('modalTitle');

// State variables
let currentLeads = [];
let currentLeadId = null;
let leadToDelete = null;

// Initialize leads page
document.addEventListener('DOMContentLoaded', () => {
    const user = getCurrentUser();
    if (user) {
        loadLeads(user.uid);
        setupEventListeners();
    }
});

// Load leads from Firestore
async function loadLeads(userId) {
    showLoading(true);
    
    try {
        const leadsRef = collection(db, 'leads');
        const q = query(
            leadsRef, 
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        currentLeads = [];
        
        querySnapshot.forEach((doc) => {
            currentLeads.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        displayLeads(currentLeads);
        updateLeadCount(currentLeads.length);
        
    } catch (error) {
        console.error('Error loading leads:', error);
        showMessage('Failed to load leads', 'error');
    } finally {
        showLoading(false);
    }
}

// Display leads in table
function displayLeads(leads) {
    leadsTableBody.innerHTML = '';
    
    if (leads.length === 0) {
        noLeadsElement.classList.remove('hidden');
        return;
    }
    
    noLeadsElement.classList.add('hidden');
    
    leads.forEach(lead => {
        const row = createLeadRow(lead);
        leadsTableBody.innerHTML += row;
    });
    
    // Add event listeners to action buttons
    addLeadActionListeners();
}

// Create HTML row for a lead
function createLeadRow(lead) {
    const lastContact = lead.lastContacted?.toDate();
    const formattedDate = lastContact ? formatDate(lastContact) : 'Never';
    
    return `
        <tr data-lead-id="${lead.id}">
            <td>
                <strong>${lead.name || 'No Name'}</strong>
                ${lead.company ? `<br><small>${lead.company}</small>` : ''}
            </td>
            <td>
                ${lead.email ? `
                    <div><i class="fas fa-envelope"></i> ${lead.email}</div>
                ` : ''}
                ${lead.phone ? `
                    <div><i class="fas fa-phone"></i> ${lead.phone}</div>
                ` : ''}
            </td>
            <td>
                <span class="status-badge status-${lead.status?.toLowerCase() || 'new'}">
                    ${lead.status || 'New'}
                </span>
            </td>
            <td>${lead.source || 'N/A'}</td>
            <td>${formattedDate}</td>
            <td>
                <div class="table-actions">
                    <button class="btn btn-sm btn-outline edit-lead" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline delete-lead" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                    ${lead.phone ? `
                        <a href="https://wa.me/${lead.phone.replace(/\D/g, '')}" 
                           target="_blank" 
                           class="btn btn-sm btn-success" 
                           title="WhatsApp">
                            <i class="fab fa-whatsapp"></i>
                        </a>
                    ` : ''}
                    ${lead.email ? `
                        <a href="mailto:${lead.email}" 
                           class="btn btn-sm btn-primary" 
                           title="Email">
                            <i class="fas fa-envelope"></i>
                        </a>
                    ` : ''}
                </div>
            </td>
        </tr>
    `;
}

// Setup event listeners
function setupEventListeners() {
    // Add lead button
    document.getElementById('addLeadBtn')?.addEventListener('click', () => {
        openLeadModal();
    });
    
    document.getElementById('addFirstLead')?.addEventListener('click', () => {
        openLeadModal();
    });
    
    // Modal controls
    document.getElementById('closeModal')?.addEventListener('click', closeLeadModal);
    document.getElementById('cancelModal')?.addEventListener('click', closeLeadModal);
    
    document.getElementById('closeDeleteModal')?.addEventListener('click', closeDeleteModal);
    document.getElementById('cancelDelete')?.addEventListener('click', closeDeleteModal);
    document.getElementById('confirmDelete')?.addEventListener('click', confirmDeleteLead);
    
    // Lead form submission
    if (leadForm) {
        leadForm.addEventListener('submit', handleLeadSubmit);
    }
    
    // Search and filter
    if (searchInput) {
        searchInput.addEventListener('input', filterLeads);
    }
    
    if (filterStatus) {
        filterStatus.addEventListener('change', filterLeads);
    }
}

// Add event listeners to lead action buttons
function addLeadActionListeners() {
    // Edit buttons
    document.querySelectorAll('.edit-lead').forEach(button => {
        button.addEventListener('click', (e) => {
            const leadId = e.target.closest('tr').dataset.leadId;
            editLead(leadId);
        });
    });
    
    // Delete buttons
    document.querySelectorAll('.delete-lead').forEach(button => {
        button.addEventListener('click', (e) => {
            const leadId = e.target.closest('tr').dataset.leadId;
            showDeleteModal(leadId);
        });
    });
}

// Open lead modal for adding new lead
function openLeadModal(lead = null) {
    modalTitle.textContent = lead ? 'Edit Lead' : 'Add New Lead';
    
    if (lead) {
        // Fill form with lead data
        document.getElementById('leadName').value = lead.name || '';
        document.getElementById('leadEmail').value = lead.email || '';
        document.getElementById('leadPhone').value = lead.phone || '';
        document.getElementById('leadCompany').value = lead.company || '';
        document.getElementById('leadStatus').value = lead.status || 'New';
        document.getElementById('leadSource').value = lead.source || '';
        document.getElementById('leadNotes').value = lead.notes || '';
        document.getElementById('leadTags').value = lead.tags ? lead.tags.join(', ') : '';
        
        currentLeadId = lead.id;
    } else {
        // Reset form
        leadForm.reset();
        document.getElementById('leadStatus').value = 'New';
        currentLeadId = null;
    }
    
    leadModal.classList.add('active');
}

// Close lead modal
function closeLeadModal() {
    leadModal.classList.remove('active');
    leadForm.reset();
    currentLeadId = null;
}

// Handle lead form submission
async function handleLeadSubmit(e) {
    e.preventDefault();
    
    const user = getCurrentUser();
    if (!user) return;
    
    // Get form data
    const leadData = {
        userId: user.uid,
        name: document.getElementById('leadName').value.trim(),
        email: document.getElementById('leadEmail').value.trim(),
        phone: document.getElementById('leadPhone').value.trim(),
        company: document.getElementById('leadCompany').value.trim(),
        status: document.getElementById('leadStatus').value,
        source: document.getElementById('leadSource').value,
        notes: document.getElementById('leadNotes').value.trim(),
        lastContacted: serverTimestamp(),
        createdAt: currentLeadId ? undefined : serverTimestamp(),
        updatedAt: serverTimestamp()
    };
    
    // Parse tags
    const tagsInput = document.getElementById('leadTags').value.trim();
    if (tagsInput) {
        leadData.tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag);
    }
    
    try {
        if (currentLeadId) {
            // Update existing lead
            const leadRef = doc(db, 'leads', currentLeadId);
            await updateDoc(leadRef, leadData);
            showMessage('Lead updated successfully!', 'success');
        } else {
            // Add new lead
            await addDoc(collection(db, 'leads'), leadData);
            showMessage('Lead added successfully!', 'success');
        }
        
        // Close modal and refresh leads
        closeLeadModal();
        loadLeads(user.uid);
        
    } catch (error) {
        console.error('Error saving lead:', error);
        showMessage('Failed to save lead', 'error');
    }
}

// Edit lead
function editLead(leadId) {
    const lead = currentLeads.find(l => l.id === leadId);
    if (lead) {
        openLeadModal(lead);
    }
}

// Show delete confirmation modal
function showDeleteModal(leadId) {
    leadToDelete = leadId;
    deleteModal.classList.add('active');
}

// Close delete modal
function closeDeleteModal() {
    deleteModal.classList.remove('active');
    leadToDelete = null;
}

// Confirm and delete lead
async function confirmDeleteLead() {
    if (!leadToDelete) return;
    
    const user = getCurrentUser();
    if (!user) return;
    
    try {
        const leadRef = doc(db, 'leads', leadToDelete);
        await deleteDoc(leadRef);
        
        showMessage('Lead deleted successfully', 'success');
        closeDeleteModal();
        loadLeads(user.uid);
        
    } catch (error) {
        console.error('Error deleting lead:', error);
        showMessage('Failed to delete lead', 'error');
    }
}

// Filter leads based on search and status
function filterLeads() {
    const searchTerm = searchInput.value.toLowerCase();
    const statusFilter = filterStatus.value;
    
    let filteredLeads = currentLeads;
    
    // Apply search filter
    if (searchTerm) {
        filteredLeads = filteredLeads.filter(lead => 
            (lead.name && lead.name.toLowerCase().includes(searchTerm)) ||
            (lead.email && lead.email.toLowerCase().includes(searchTerm)) ||
            (lead.company && lead.company.toLowerCase().includes(searchTerm)) ||
            (lead.notes && lead.notes.toLowerCase().includes(searchTerm))
        );
    }
    
    // Apply status filter
    if (statusFilter) {
        filteredLeads = filteredLeads.filter(lead => lead.status === statusFilter);
    }
    
    displayLeads(filteredLeads);
    updateLeadCount(filteredLeads.length);
}

// Update lead count display
function updateLeadCount(count) {
    if (leadCountElement) {
        leadCountElement.textContent = count;
    }
}

// Show/hide loading state
function showLoading(isLoading) {
    if (loadingLeadsElement) {
        loadingLeadsElement.style.display = isLoading ? 'block' : 'none';
    }
    if (leadsTableBody) {
        leadsTableBody.style.display = isLoading ? 'none' : 'table-row-group';
    }
}

// Show message
function showMessage(text, type) {
    // Create or get message element
    let messageDiv = document.getElementById('leadsMessage');
    if (!messageDiv) {
        messageDiv = document.createElement('div');
        messageDiv.id = 'leadsMessage';
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

// Export functions for other modules
export { loadLeads, displayLeads, showMessage };
