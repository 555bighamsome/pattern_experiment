import { renderPattern } from './modules/patterns.js';
import { showToast } from './modules/toast.js';

function getGalleryFromStorage() {
    const stored = localStorage.getItem('patternGallery');
    return stored ? JSON.parse(stored) : [];
}

function saveGalleryToStorage(gallery) {
    localStorage.setItem('patternGallery', JSON.stringify(gallery));
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

function downloadPattern(item) {
    // Render pattern to a high-quality canvas
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    
    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 400, 400);
    
    // Draw pattern (10x10 grid)
    const cellSize = 40;
    ctx.fillStyle = '#000000';
    
    const pattern = item.pattern;
    if (pattern && Array.isArray(pattern)) {
        for (let i = 0; i < pattern.length; i++) {
            for (let j = 0; j < pattern[i].length; j++) {
                if (pattern[i][j] === 1) {
                    ctx.fillRect(j * cellSize, i * cellSize, cellSize, cellSize);
                }
            }
        }
    }
    
    // Convert to PNG and download
    canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `pattern_${item.id}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        showToast('Pattern downloaded!', 'success', 1500);
    });
}

function deletePattern(id) {
    if (!confirm('Delete this pattern from your gallery?')) {
        return;
    }
    
    const gallery = getGalleryFromStorage();
    const filtered = gallery.filter(item => item.id !== id);
    saveGalleryToStorage(filtered);
    
    showToast('Pattern deleted', 'info', 1500);
    loadGallery();
}

function clearAllGallery() {
    const gallery = getGalleryFromStorage();
    if (gallery.length === 0) {
        showToast('Gallery is already empty', 'info');
        return;
    }
    
    if (!confirm(`Delete all ${gallery.length} patterns from your gallery? This cannot be undone.`)) {
        return;
    }
    
    localStorage.removeItem('patternGallery');
    showToast('Gallery cleared', 'info', 1500);
    loadGallery();
}

function renderGalleryItem(item) {
    const card = document.createElement('div');
    card.className = 'gallery-item';
    
    // Canvas wrapper with unique ID for renderPattern
    const canvasWrap = document.createElement('div');
    canvasWrap.className = 'gallery-canvas-wrap';
    const patternId = `pattern_${item.id}`;
    canvasWrap.id = patternId;
    
    card.appendChild(canvasWrap);
    
    // Render pattern using the shared renderPattern function
    setTimeout(() => {
        renderPattern(item.pattern, patternId);
    }, 0);
    
    // Info section
    const info = document.createElement('div');
    info.className = 'gallery-info';
    
    const dateRow = document.createElement('div');
    dateRow.className = 'gallery-info-row';
    dateRow.innerHTML = `<span class="gallery-info-label">Created</span><span>${formatDate(item.createdAt)}</span>`;
    info.appendChild(dateRow);
    
    const opsRow = document.createElement('div');
    opsRow.className = 'gallery-info-row';
    opsRow.innerHTML = `<span class="gallery-info-label">Operations</span><span>${item.totalOperations}</span>`;
    info.appendChild(opsRow);
    
    card.appendChild(info);
    
    // Actions row
    const actions = document.createElement('div');
    actions.className = 'gallery-actions-row';
    
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'btn btn-secondary';
    downloadBtn.textContent = '↓ Download';
    downloadBtn.onclick = () => downloadPattern(item);
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-danger';
    deleteBtn.textContent = '× Delete';
    deleteBtn.onclick = () => deletePattern(item.id);
    
    actions.appendChild(downloadBtn);
    actions.appendChild(deleteBtn);
    card.appendChild(actions);
    
    return card;
}

function loadGallery() {
    const gallery = getGalleryFromStorage();
    const container = document.getElementById('gallery-container');
    const emptyState = document.getElementById('gallery-empty');
    const countEl = document.getElementById('gallery-count');
    const clearAllBtn = document.getElementById('clearAllBtn');
    
    if (!container) return;
    
    container.innerHTML = '';
    
    if (gallery.length === 0) {
        container.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        if (countEl) countEl.textContent = '0 patterns saved';
        if (clearAllBtn) clearAllBtn.disabled = true;
    } else {
        container.style.display = 'grid';
        if (emptyState) emptyState.style.display = 'none';
        if (countEl) countEl.textContent = `${gallery.length} pattern${gallery.length === 1 ? '' : 's'} saved`;
        if (clearAllBtn) clearAllBtn.disabled = false;
        
        // Sort by newest first
        const sorted = gallery.slice().sort((a, b) => b.createdAt - a.createdAt);
        
        sorted.forEach(item => {
            const card = renderGalleryItem(item);
            container.appendChild(card);
        });
    }
}

// Make functions globally available
window.clearAllGallery = clearAllGallery;

// Load gallery on page load
document.addEventListener('DOMContentLoaded', () => {
    loadGallery();
});
