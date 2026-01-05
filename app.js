// Blog Planner App - Main JavaScript

// ============================================
// State & Storage Management
// ============================================

let posts = [];
let events = []; // Events and deadlines storage
let settings = {
    authorBio: '',
    jsonbinKey: '',
    imgbbKey: '',
    exportTemplates: {},
    hashtagPresets: ['#3DArt', '#Blogger', '#EnvTuber', '#Fashion', '#FashionBlog', '#Furry', '#FurryArt', '#GravesGhostly', '#Metaverse', '#Photography', '#RareBeings', '#SecondLife', '#SecondLifeBlog', '#SecondLifeBlogger', '#SecondLifePhoto', '#SL', '#SLBlog', '#SLBlogger', '#VirtualPhotography'],
    exportPresets: {}
};
let postSearchTerm = '';
let postSortOption = 'newest';
let postFilters = { sponsors: false, credits: false };
let selectedTags = new Set();
let selectedPostIds = new Set();
let currentBatchPosts = [];
const exportLimits = { bluesky: 300 };
let currentPost = null;
let currentPlatform = 'flickr';
let currentWizardStep = 1;
const totalWizardSteps = 3;
let savedLibrary = { stores: [] }; // Saved creators/stores library
let libraryFilter = '';
let libraryEditTarget = null;
const draftKey = 'blogplanner-draft';
let autosaveTimer = null;
let currentEventId = null; // For editing events
const MAX_INLINE_IMAGE_SIZE = 280000; // ~280 KB cap per inline data URL
const sectionTitles = {
    'dashboard': '📊 Dashboard',
    'new-post': '➕ New Post',
    'my-posts': '📋 My Posts',
    'creator-library': '📚 Creator Directory',
    'settings': '⚙️ Settings'
};

// ============================================
// Image Helpers
// ============================================

function isQuotaExceededError(error) {
    return error && (error.name === 'QuotaExceededError' || error.code === 22 || error.code === 1014);
}

function compactInlineImage(dataUrl, stripAll = false) {
    if (stripAll) return '';
    if (!dataUrl) return '';
    return dataUrl.length > MAX_INLINE_IMAGE_SIZE ? '' : dataUrl;
}

function compactPostForStorage(post, stripAllInlineImages = false) {
    const compacted = { ...post };
    compacted.imageData = compactInlineImage(compacted.imageData, stripAllInlineImages);
    return compacted;
}

function getStorageReadyPosts(stripAllInlineImages = false, mutateInMemory = true) {
    const compacted = posts.map(post => compactPostForStorage(post, stripAllInlineImages));
    if (mutateInMemory) {
        posts = compacted;
    }
    return compacted;
}

async function compressImageFile(file, options = {}) {
    const { maxDimension = 1000, quality = 0.72 } = options;
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Image read failed'));
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;
                if (width > maxDimension || height > maxDimension) {
                    const scale = Math.min(maxDimension / width, maxDimension / height);
                    width = Math.round(width * scale);
                    height = Math.round(height * scale);
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const mimeType = file.type && file.type.startsWith('image/') ? file.type : 'image/jpeg';
                const dataUrl = canvas.toDataURL(mimeType, quality);
                resolve(dataUrl);
            };
            img.onerror = () => reject(new Error('Image load failed'));
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadDataInit();
    setupEventListeners();
    setupAutosaveListeners();
    setupKeyboardShortcuts();
    setupImageUploadHandlers();
    loadDraft();
    updateDashboard();
    updatePostsList();
    displayAuthorBio();
    updateHashtagButtons();
    updateExportPresetDropdown();
    startSidebarClock();
    updateUpcomingEvents();
    showToast('Blog Planner loaded!', 'success');
    switchSection('dashboard'); // Start on dashboard
});

// ============================================
// Event Listeners Setup
// ============================================

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const section = e.target.dataset.section;
            switchSection(section);
        });
    });

    const libraryList = document.getElementById('library-list');
    if (libraryList) {
        libraryList.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (!action) return;
            if (action === 'edit') {
                startLibraryEdit(e.target.dataset.name);
            } else if (action === 'copy-link') {
                copyStoreLink(e.target.dataset.link || '');
            } else if (action === 'save-edit') {
                saveLibraryEdit(e.target.dataset.name);
            } else if (action === 'cancel-edit') {
                cancelLibraryEdit();
            }
        });
    }

    // Export Tab Switching
    document.querySelectorAll('.export-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            switchExportTab(e.target.dataset.platform);
        });
    });

    // BlueSky export inputs update the active export preview
    ['bluesky-link', 'sponsor-mentions'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                if (!currentPost) return;
                currentPost.blueskyLink = document.getElementById('bluesky-link').value;
                currentPost.sponsorMentions = document.getElementById('sponsor-mentions').value;

                if (currentPlatform === 'bluesky') {
                    const exportText = currentBatchPosts.length > 0
                        ? generateBatchExport(currentPlatform)
                        : generateExport(currentPlatform, currentPost);
                    document.getElementById('export-text').value = exportText;
                    updateExportCounter(exportText, currentPlatform);
                }
            });
        }
    });

}

function updateUpcomingEvents() {
    const list = document.getElementById('upcoming-events-list');
    if (!list) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get events from next 30 days
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const upcoming = events.filter(event => {
        const startStr = event.eventStartDate || event.eventDate || event.date;
        const start = parseDateInput(startStr);
        return start && start >= today && start <= thirtyDaysFromNow;
    }).sort((a, b) => {
        const getDate = (ev) => {
            const dateStr = ev.eventStartDate || ev.eventDate || ev.date;
            return parseDateInput(dateStr);
        };
        const dateA = getDate(a);
        const dateB = getDate(b);
        return dateA - dateB;
    });

    if (upcoming.length === 0) {
        list.innerHTML = '<p class="empty-state">No upcoming events in the next 30 days.</p>';
        return;
    }

    list.innerHTML = upcoming.map(event => {
        const dateStr = event.eventStartDate || event.eventDate || event.date;
        const startDate = parseDateInput(dateStr);
        const daysAway = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24));
        const dateLabel = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(startDate);
        const typeIcon = '🎉';
        const daysLabel = daysAway === 0 ? '🔥 Today!' : daysAway === 1 ? 'Tomorrow' : `In ${daysAway} days`;
        
        return `
            <div class="upcoming-event-item" onclick="openEventPreview(${event.id})" style="cursor:pointer;">
                <div class="upcoming-event-left">
                    <span class="upcoming-icon">${typeIcon}</span>
                    <div class="upcoming-info">
                        <div class="upcoming-title">${escapeHtml(event.name || 'Untitled')}</div>
                        <div class="upcoming-date">${dateLabel} • ${daysLabel}</div>
                    </div>
                </div>
                <div class="upcoming-right">
                    <div class="upcoming-actions">
                        <button class="upcoming-action-btn" title="Edit" onclick="event.stopPropagation(); editUpcomingEvent(${event.id});">✏️</button>
                        <button class="upcoming-action-btn danger" title="Delete" onclick="event.stopPropagation(); deleteUpcomingEvent(${event.id});">🗑️</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function editUpcomingEvent(eventId) {
    openEventModal(eventId);
}

function deleteUpcomingEvent(eventId) {
    if (confirm('Delete this event?')) {
        deleteEvent(eventId);
    }
}

function startSidebarClock() {
    const clockEl = document.getElementById('sidebar-datetime');
    if (!clockEl) return;

    const update = () => {
        const now = new Date();
        clockEl.textContent = now.toLocaleString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    update();
    setInterval(update, 30000);
}

// ============================================
// Image Upload Handlers (click, drag/drop, paste)
// ============================================

function handleDragOver(e, zoneId) {
    e.preventDefault();
    e.stopPropagation();
    const zone = document.getElementById(zoneId);
    if (zone) zone.classList.add('drag-over');
}

function handleDragLeave(e, zoneId) {
    e.preventDefault();
    const zone = document.getElementById(zoneId);
    if (zone && e.target === zone) {
        zone.classList.remove('drag-over');
    }
}

function handleDrop(e, inputId) {
    e.preventDefault();
    e.stopPropagation();
    const zoneId = inputId === 'blog-image' ? 'image-upload-zone' : 'event-image-upload-zone';
    const zone = document.getElementById(zoneId);
    if (zone) zone.classList.remove('drag-over');
    
    const files = Array.from(e.dataTransfer?.files || []).filter(f => f.type.startsWith('image/'));
    if (files.length) {
        assignFilesToInput(inputId, files);
    }
}

function assignFilesToInput(inputId, files) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const dt = new DataTransfer();
    files.forEach(f => dt.items.add(f));
    input.files = dt.files;
    const event = new Event('change', { bubbles: true });
    input.dispatchEvent(event);
}

function setupImageUploadHandlers() {
    const blogImageInput = document.getElementById('blog-image');
    const blogUploadZone = document.getElementById('image-upload-zone');
    const eventImageInput = document.getElementById('deadline-event-image');
    const eventUploadZone = document.getElementById('event-image-upload-zone');

    if (blogUploadZone && blogImageInput) {
        blogUploadZone.addEventListener('click', () => blogImageInput.click());
    }
    if (eventUploadZone && eventImageInput) {
        eventUploadZone.addEventListener('click', () => eventImageInput.click());
    }

    // Paste support scoped to upload zones
    [
        { input: blogImageInput, zone: blogUploadZone, zoneId: 'image-upload-zone', inputId: 'blog-image' }
    ].forEach(({ input, zone, inputId }) => {
        if (!zone || !input) return;
        zone.addEventListener('paste', (e) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            const images = [];
            for (let item of items) {
                if (item.type.startsWith('image/')) {
                    const blob = item.getAsFile();
                    if (blob) images.push(new File([blob], `pasted-image.${blob.type.split('/')[1]}`, { type: blob.type }));
                }
            }
            if (images.length) {
                e.preventDefault();
                assignFilesToInput(inputId, images);
            }
        });
    });
}

function toggleBlueskySettings(button) {
    const card = document.getElementById('bluesky-export-settings');
    if (!card) return;

    const isCollapsed = card.classList.toggle('collapsed');
    button.textContent = isCollapsed ? 'Show' : 'Hide';
    button.setAttribute('aria-expanded', (!isCollapsed).toString());
}

function setupAutosaveListeners() {
    const inputs = document.querySelectorAll('#new-post input, #new-post textarea');
    inputs.forEach(el => {
        el.addEventListener('input', scheduleDraftSave);
    });
}

// ============================================
// Section Navigation
// ============================================

function switchSection(sectionId) {
    // Get current section before switching
    const currentSection = document.querySelector('section.active');
    const currentSectionId = currentSection?.id;
    
    // Hide all sections
    document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
    
    // Remove active class from all nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    // Show selected section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Mark button as active
    const activeNav = document.querySelector(`[data-section="${sectionId}"]`);
    if (activeNav) {
        activeNav.classList.add('active');
    }

    // Update top nav title to match section
    const titleEl = document.getElementById('section-title');
    if (titleEl) {
        titleEl.textContent = sectionTitles[sectionId] || 'Blog Planner';
    }
    
    // Save draft before leaving new-post section (unless editing)
    if (currentSectionId === 'new-post' && sectionId !== 'new-post' && !currentPost?.id) {
        saveDraft();
        clearForm();
    }
    
    // Initialize settings sections when showing settings page
    if (sectionId === 'settings') {
        initializeSettingsSections();
    }
    
    // Reset wizard to step 1 when returning to new post
    if (sectionId === 'new-post') {
        goToStep(1);
        // Check if there's a saved draft and offer to restore
        const hasDraft = localStorage.getItem(draftKey);
        if (hasDraft) {
            showDraftRestorePrompt();
        }
    }
    
    // Refresh data if needed
    if (sectionId === 'my-posts') {
        updatePostsList();
    }
}

// ============================================
// Wizard Navigation
// ============================================

function nextStep() {
    if (currentWizardStep < totalWizardSteps) {
        goToStep(currentWizardStep + 1);
    }
}

function previousStep() {
    if (currentWizardStep > 1) {
        goToStep(currentWizardStep - 1);
    }
}

function goToStep(stepNumber) {
    // Clamp and normalize
    const targetStep = Math.min(Math.max(stepNumber, 1), totalWizardSteps);

    // Reset all step content visibility
    document.querySelectorAll('.wizard-content').forEach(content => content.classList.remove('active'));

    // Reset indicators and mark completed/active
    document.querySelectorAll('.wizard-step').forEach(step => {
        step.classList.remove('active', 'completed');
        const stepNum = parseInt(step.dataset.step, 10);
        if (stepNum < targetStep) step.classList.add('completed');
        if (stepNum === targetStep) step.classList.add('active');
    });

    // Show target content
    const newContent = document.querySelector(`.wizard-content[data-step="${targetStep}"]`);
    if (newContent) newContent.classList.add('active');
    
    // Refresh export view when entering final step
    if (targetStep === totalWizardSteps) {
        prepareExportView(currentPost);
    }

    // Update current step
    currentWizardStep = targetStep;
    
    // Update navigation buttons
    const prevBtn = document.querySelector('.wizard-btn-prev');
    const nextBtn = document.querySelector('.wizard-btn-next');
    
    if (prevBtn) {
        prevBtn.disabled = currentWizardStep === 1;
    }
    
    if (nextBtn) {
        if (currentWizardStep === totalWizardSteps) {
            nextBtn.textContent = 'Done ✓';
            nextBtn.onclick = () => switchSection('my-posts');
        } else {
            nextBtn.textContent = 'Next →';
            nextBtn.onclick = nextStep;
        }
    }
    
    // Scroll to top
    document.querySelector('.main-content').scrollTop = 0;
}

// Review summary removed (flow now ends at Export)

function switchPlatformTab(platform) {
    // Hide all platform tabs
    document.querySelectorAll('.platform-tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.platform-tab-btn').forEach(btn => btn.classList.remove('active'));
    
    // Show selected tab
    document.getElementById(`${platform}-tab`).classList.add('active');
    document.querySelector(`[data-platform="${platform}"]`).classList.add('active');
}

// ============================================
// Form Management
// ============================================

function saveToLibrary(storeName, storeLink, type = 'creator') {
    if (!storeName) return;
    
    // Check if store already exists
    const existing = savedLibrary.stores.find(s => s.name.toLowerCase() === storeName.toLowerCase());
    
    if (!existing) {
        savedLibrary.stores.push({
            name: storeName,
            link: storeLink || '',
            type: type,  // 'sponsor' or 'creator'
            tags: []
        });
        localStorage.setItem('blogplanner-library', JSON.stringify(savedLibrary));
        updateStoreDatalist();
    } else if (storeLink && !existing.link) {
        // Update existing store with link if it didn't have one
        existing.link = storeLink;
        localStorage.setItem('blogplanner-library', JSON.stringify(savedLibrary));
        updateStoreDatalist();
    }
}

function updateStoreDatalist() {
    const datalist = document.getElementById('saved-stores');
    if (datalist) {
        datalist.innerHTML = savedLibrary.stores
            .map(store => `<option value="${store.name}">`)
            .join('');
    }

    // Also refresh visible library list
    updateLibraryList();
}

function normalizeLibraryTypes() {
    if (!savedLibrary || !Array.isArray(savedLibrary.stores)) return;
    savedLibrary.stores = savedLibrary.stores.map(store => {
        const normalized = { ...store };
        if (!normalized.type) normalized.type = 'creator';
        if (!Array.isArray(normalized.tags)) normalized.tags = [];
        if ((normalized.name || '').toLowerCase() === 'bad unicorn') {
            normalized.type = 'sponsor';
        }
        return normalized;
    });
    localStorage.setItem('blogplanner-library', JSON.stringify(savedLibrary));
}

function setLibraryFilter(term = '') {
    libraryFilter = term.toLowerCase();
    updateLibraryList();
}

function normalizeLibraryType(type) {
    if (type === 'credit') return 'creator';
    if (!type) return 'creator';
    return type;
}

function addLibraryEntry() {
    const nameInput = document.getElementById('library-add-name');
    const linkInput = document.getElementById('library-add-link');
    const typeSelect = document.getElementById('library-add-type');
    const tagsInput = document.getElementById('library-add-tags');

    const name = nameInput?.value?.trim();
    const link = linkInput?.value?.trim() || '';
    const type = normalizeLibraryType(typeSelect?.value || 'sponsor');
    const tags = (tagsInput?.value || '')
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

    if (!name) {
        showStatus('Please enter a creator/store name.', 'error');
        return;
    }

    const existing = savedLibrary.stores.find(s => (s.name || '').toLowerCase() === name.toLowerCase());
    if (existing) {
        existing.type = type || existing.type || 'creator';
        if (link) existing.link = link;
        const mergedTags = new Set([...(existing.tags || []), ...tags]);
        existing.tags = Array.from(mergedTags).filter(Boolean);
        showStatus('Updated existing creator entry.', 'success');
    } else {
        savedLibrary.stores.push({
            name,
            link,
            type,
            tags
        });
        showStatus('Added creator to library.', 'success');
    }

    localStorage.setItem('blogplanner-library', JSON.stringify(savedLibrary));
    updateStoreDatalist();

    if (nameInput) nameInput.value = '';
    if (linkInput) linkInput.value = '';
    if (typeSelect) typeSelect.value = 'sponsor';
    if (tagsInput) tagsInput.value = '';
}

function startLibraryEdit(name) {
    libraryEditTarget = name;
    updateLibraryList();
}

function cancelLibraryEdit() {
    libraryEditTarget = null;
    updateLibraryList();
}

function saveLibraryEdit(name) {
    const store = savedLibrary.stores.find(s => s.name === name);
    if (!store) return;
    const typeInput = document.getElementById(`edit-type-${cssEscapeId(name)}`);
    const linkInput = document.getElementById(`edit-link-${cssEscapeId(name)}`);
    const tagsInput = document.getElementById(`edit-tags-${cssEscapeId(name)}`);
    const newType = typeInput?.value || store.type || 'creator';
    const newLink = linkInput?.value?.trim() || '';
    const rawTags = tagsInput?.value || '';
    const tags = rawTags.split(',').map(t => t.trim()).filter(Boolean);
    store.type = newType;
    store.link = newLink;
    store.tags = tags;
    libraryEditTarget = null;
    localStorage.setItem('blogplanner-library', JSON.stringify(savedLibrary));
    updateStoreDatalist();
}

function cssEscapeId(str = '') {
    return str.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function escapeHtml(str = '') {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeForAttr(str = '') {
    return String(str)
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"');
}

function updateLibraryList() {
    const list = document.getElementById('library-list');
    if (!list) return;

    if (!savedLibrary.stores || savedLibrary.stores.length === 0) {
        list.innerHTML = '<p class="empty-state">No saved sponsors or creators yet. Save a post to populate your directory.</p>';
        return;
    }

    const term = (libraryFilter || '').trim().toLowerCase();
    const filtered = savedLibrary.stores.filter(store => {
        if (!term) return true;
        const nameMatch = (store.name || '').toLowerCase().includes(term);
        const tagMatch = Array.isArray(store.tags) && store.tags.some(tag => tag.toLowerCase().includes(term));
        return nameMatch || tagMatch;
    });

    // Separate sponsors and credits
    const sponsors = filtered.filter(s => normalizeLibraryType(s.type) === 'sponsor');
    const credits = filtered.filter(s => normalizeLibraryType(s.type) !== 'sponsor');  // creators

    const searchInput = document.getElementById('library-search');
    if (searchInput && searchInput.value !== libraryFilter) {
        searchInput.value = libraryFilter;
    }

    let html = '';

    const renderTags = (tags = []) => {
        if (!tags.length) return '<span class="library-no-link">No tags yet</span>';
        return `<div class="library-tags">${tags.map(tag => `<span class="library-tag">${escapeHtml(tag)}</span>`).join('')}</div>`;
    };

    if (sponsors.length > 0) {
        html += '<div class="library-section"><h4 class="library-section-title">🎁 Sponsors</h4><div class="library-items">';
        html += sponsors.map(store => {
            const displayName = escapeHtml(store.name || 'Untitled');
            const displayLink = escapeHtml(store.link || '');
            const linkArg = escapeForAttr(store.link || '');
            const nameArg = escapeForAttr(store.name || '');
            const isEditing = libraryEditTarget === store.name;
            const tagsCsv = escapeForAttr((store.tags || []).join(', '));
            const tagsRow = renderTags(store.tags || []);
            
            if (isEditing) {
                const safeId = cssEscapeId(store.name || '');
                return `
                    <div class="library-item library-item-edit">
                        <div class="library-item-main">
                            <span class="library-name">${displayName}</span>
                            <div class="library-actions">
                                <label class="sr-only" for="edit-type-${safeId}">Store type</label>
                                <select id="edit-type-${safeId}" class="library-edit-select">
                                    <option value="sponsor" ${store.type === 'sponsor' ? 'selected' : ''}>Sponsor</option>
                                    <option value="creator" ${store.type !== 'sponsor' ? 'selected' : ''}>Creator</option>
                                </select>
                            </div>
                        </div>
                        <div class="library-edit-tags">
                            <label class="sr-only" for="edit-link-${safeId}">Store link</label>
                            <input type="url" id="edit-link-${safeId}" class="library-edit-input" value="${displayLink}" placeholder="https://...">
                        </div>
                        <div class="library-edit-tags">
                            <label class="sr-only" for="edit-tags-${safeId}">Tags</label>
                            <input type="text" id="edit-tags-${safeId}" class="library-edit-input" value="${tagsCsv}" placeholder="e.g. fashion, hair, decor">
                        </div>
                        <div class="library-link-row edit-actions">
                            <div class="library-actions">
                                <button type="button" class="library-link-btn" data-action="save-edit" data-name="${nameArg}">Save</button>
                                <button type="button" class="library-link-btn" data-action="cancel-edit">Cancel</button>
                            </div>
                        </div>
                    </div>
                `;
            }

            return `
                <div class="library-item">
                    <div class="library-item-main">
                        <span class="library-name">${displayName}</span>
                        <div class="library-actions">
                            <button type="button" class="library-link-btn" data-action="edit" data-name="${nameArg}">Edit</button>
                            ${store.link ? `<a class="library-open" href="${displayLink}" target="_blank" rel="noopener" title="Open store link">Open ↗</a>
                            <button type="button" class="library-link-btn" data-action="copy-link" data-link="${linkArg}" title="Copy store link">Copy link</button>` : ''}
                        </div>
                    </div>
                    <div class="library-tag-row">${tagsRow}</div>
                </div>
            `;
        }).join('');
        html += '</div></div>';
    }

    if (credits.length > 0) {
        html += '<div class="library-section"><h4 class="library-section-title">👤 Creators</h4><div class="library-items">';
        html += credits.map(store => {
            const displayName = escapeHtml(store.name || 'Untitled');
            const displayLink = escapeHtml(store.link || '');
            const linkArg = escapeForAttr(store.link || '');
            const nameArg = escapeForAttr(store.name || '');
            const isEditing = libraryEditTarget === store.name;
            const tagsCsv = escapeForAttr((store.tags || []).join(', '));
            const tagsRow = renderTags(store.tags || []);
            
            if (isEditing) {
                const safeId = cssEscapeId(store.name || '');
                return `
                    <div class="library-item library-item-edit">
                        <div class="library-item-main">
                            <span class="library-name">${displayName}</span>
                            <div class="library-actions">
                                <label class="sr-only" for="edit-type-${safeId}">Store type</label>
                                <select id="edit-type-${safeId}" class="library-edit-select">
                                    <option value="sponsor" ${store.type === 'sponsor' ? 'selected' : ''}>Sponsor</option>
                                    <option value="creator" ${store.type !== 'sponsor' ? 'selected' : ''}>Creator</option>
                                </select>
                            </div>
                        </div>
                        <div class="library-edit-tags">
                            <label class="sr-only" for="edit-link-${safeId}">Store link</label>
                            <input type="url" id="edit-link-${safeId}" class="library-edit-input" value="${displayLink}" placeholder="https://...">
                        </div>
                        <div class="library-edit-tags">
                            <label class="sr-only" for="edit-tags-${safeId}">Tags</label>
                            <input type="text" id="edit-tags-${safeId}" class="library-edit-input" value="${tagsCsv}" placeholder="e.g. furniture, poses, decor">
                        </div>
                        <div class="library-link-row edit-actions">
                            <div class="library-actions">
                                <button type="button" class="library-link-btn" data-action="save-edit" data-name="${nameArg}">Save</button>
                                <button type="button" class="library-link-btn" data-action="cancel-edit">Cancel</button>
                            </div>
                        </div>
                    </div>
                `;
            }

            return `
                <div class="library-item">
                    <div class="library-item-main">
                        <span class="library-name">${displayName}</span>
                        <div class="library-actions">
                            <button type="button" class="library-link-btn" data-action="edit" data-name="${nameArg}">Edit</button>
                            ${store.link ? `<a class="library-open" href="${displayLink}" target="_blank" rel="noopener" title="Open store link">Open ↗</a>
                            <button type="button" class="library-link-btn" data-action="copy-link" data-link="${linkArg}" title="Copy store link">Copy link</button>` : ''}
                        </div>
                    </div>
                    <div class="library-tag-row">${tagsRow}</div>
                </div>
            `;
        }).join('');
        html += '</div></div>';
    }

    list.innerHTML = html;
}

function copyStoreName(name) {
    navigator.clipboard.writeText(name).then(() => {
        showStatus(`📋 Copied "${name}"`);
    });
}

function copyStoreLink(link) {
    navigator.clipboard.writeText(link).then(() => {
        showStatus('🔗 Link copied');
    });
}

function attachStoreAutofill(input) {
    ['change', 'input', 'blur'].forEach(evt => {
        input.addEventListener(evt, () => autofillStore(input));
    });
}

function autofillStore(input) {
    const storeName = input.value;
    const store = savedLibrary.stores.find(s => s.name.toLowerCase() === storeName.toLowerCase());
    
    if (store && store.link) {
        // Find the store link input in the same row
        const row = input.closest('.credit-item');
        const linkInput = row.querySelector('.sponsor-link, .credit-link');
        if (linkInput && !linkInput.value) {
            linkInput.value = store.link;
        }
    }
}

function toggleEventFields(checkbox) {
    const row = checkbox.closest('.sponsor-row, .credit-row');
    const eventFields = row.querySelector('.event-fields');
    if (eventFields) {
        eventFields.style.display = checkbox.checked ? 'grid' : 'none';
    }
}

function addSponsor() {
    const sponsorsList = document.getElementById('sponsors-list');
    const item = document.createElement('div');
    item.className = 'sponsor-row';
    item.innerHTML = `
        <input type="text" name="sponsor-store" aria-label="Sponsor store" placeholder="Creator/Store" class="sponsor-store" list="saved-stores">
        <input type="text" name="sponsor-item" aria-label="Sponsor item" placeholder="Item Name" class="sponsor-item">
        <input type="url" name="sponsor-link" aria-label="Sponsor store link" placeholder="Store Link (SL/MP)" class="sponsor-link" title="In-world landmark or Marketplace URL">
        <div class="event-fields" style="display: none;">
            <input type="text" name="sponsor-event" aria-label="Sponsor event" placeholder="Event Name" class="sponsor-event">
            <input type="url" name="sponsor-event-link" aria-label="Sponsor event landmark" placeholder="Event Landmark" class="sponsor-event-link" title="Event in-world landmark">
        </div>
        <label class="event-toggle">
            <input type="checkbox" class="event-checkbox" onchange="toggleEventFields(this)">
            <span title="Show/hide event details">📅</span>
        </label>
        <button type="button" class="btn-remove" onclick="removeCredit(this)">✕</button>
    `;
    
    // Add event listener for store autocomplete
    const storeInput = item.querySelector('.sponsor-store');
    attachStoreAutofill(storeInput);
    
    sponsorsList.appendChild(item);
}

function addCredit() {
    const creditsList = document.getElementById('credits-list');
    const item = document.createElement('div');
    item.className = 'credit-row';
    item.innerHTML = `
        <input type="text" name="credit-store" aria-label="Credit store" placeholder="Creator/Store" class="credit-store" list="saved-stores">
        <input type="text" name="credit-item" aria-label="Credit item" placeholder="Item Name" class="credit-item-name">
        <input type="url" name="credit-link" aria-label="Credit store link" placeholder="Store Link (SL/MP)" class="credit-link" title="In-world landmark or Marketplace URL">
        <div class="event-fields" style="display: none;">
            <input type="text" name="credit-event" aria-label="Credit event" placeholder="Event Name" class="credit-event">
            <input type="url" name="credit-event-link" aria-label="Credit event landmark" placeholder="Event Landmark" class="credit-event-link" title="Event in-world landmark">
        </div>
        <label class="event-toggle">
            <input type="checkbox" class="event-checkbox" onchange="toggleEventFields(this)">
            <span title="Show/hide event details">📅</span>
        </label>
        <button type="button" class="btn-remove" onclick="removeCredit(this)">✕</button>
    `;
    
    // Add event listener for store autocomplete
    const storeInput = item.querySelector('.credit-store');
    attachStoreAutofill(storeInput);
    
    creditsList.appendChild(item);
}

function removeCredit(btn) {
    btn.parentElement.remove();
}

function restoreDraft(draft) {
    if (!draft) return;

    const setElementValue = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value || '';
    };

    setElementValue('post-title', draft.title);
    setElementValue('post-tags', (draft.tags || []).join(', '));
    setElementValue('post-caption', draft.caption);
    setElementValue('bluesky-link', draft.blueskyLink);
    setElementValue('sponsor-mentions', draft.sponsorMentions);

    if (draft.imageData) {
        document.getElementById('image-preview').innerHTML = `<img src="${draft.imageData}" alt="Blog image preview">`;
    }
    if (draft.hostedImageUrl) {
        document.getElementById('hosted-image-url').value = draft.hostedImageUrl;
        document.getElementById('image-url-container').classList.remove('hidden');
    }

    const sponsorsList = document.getElementById('sponsors-list');
    sponsorsList.innerHTML = '';
    (draft.sponsors || []).forEach(s => {
        const row = document.createElement('div');
        row.className = 'sponsor-row';
        row.innerHTML = `
            <input type="text" name="sponsor-store" aria-label="Sponsor store" placeholder="Creator/Store" class="sponsor-store" list="saved-stores" value="${s.store || ''}">
            <input type="text" name="sponsor-item" aria-label="Sponsor item" placeholder="Item Name" class="sponsor-item" value="${s.itemName || ''}">
            <input type="url" name="sponsor-link" aria-label="Sponsor store link" placeholder="Store Link (SL/MP)" class="sponsor-link" value="${s.storeLink || ''}" title="In-world landmark or Marketplace URL">
            <input type="text" name="sponsor-event" aria-label="Sponsor event" placeholder="Event Name" class="sponsor-event" value="${s.event || ''}">
            <input type="url" name="sponsor-event-link" aria-label="Sponsor event landmark" placeholder="Event Landmark" class="sponsor-event-link" value="${s.eventLink || ''}" title="Event in-world landmark">
            <button type="button" class="btn-remove" onclick="removeCredit(this)">✕</button>
        `;
        const storeInput = row.querySelector('.sponsor-store');
        storeInput.addEventListener('change', () => autofillStore(storeInput));
        sponsorsList.appendChild(row);
    });

    const creditsList = document.getElementById('credits-list');
    creditsList.innerHTML = '';
    (draft.credits || []).forEach(c => {
        const row = document.createElement('div');
        row.className = 'credit-row';
        row.innerHTML = `
            <input type="text" name="credit-store" aria-label="Credit store" placeholder="Creator/Store" class="credit-store" list="saved-stores" value="${c.store || ''}">
            <input type="text" name="credit-item" aria-label="Credit item" placeholder="Item Name" class="credit-item-name" value="${c.itemName || ''}">
            <input type="url" name="credit-link" aria-label="Credit store link" placeholder="Store Link (SL/MP)" class="credit-link" value="${c.storeLink || ''}" title="In-world landmark or Marketplace URL">
            <input type="text" name="credit-event" aria-label="Credit event" placeholder="Event Name" class="credit-event" value="${c.event || ''}">
            <input type="url" name="credit-event-link" aria-label="Credit event landmark" placeholder="Event Landmark" class="credit-event-link" value="${c.eventLink || ''}" title="Event in-world landmark">
            <button type="button" class="btn-remove" onclick="removeCredit(this)">✕</button>
        `;
        const storeInput = row.querySelector('.credit-store');
        storeInput.addEventListener('change', () => autofillStore(storeInput));
        creditsList.appendChild(row);
    });

}

// ============================================
// Formatting Functions
// ============================================

function formatCaption(format) {
    const textarea = document.getElementById('post-caption');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    
    if (!selected) return;
    
    let formatted = '';
    switch (format) {
        case 'bold':
            formatted = `**${selected}**`;
            break;
        case 'italic':
            formatted = `*${selected}*`;
            break;
        case 'underline':
            formatted = `__${selected}__`;
            break;
        case 'link':
            const url = prompt('Enter URL:');
            if (url) formatted = `[${selected}](${url})`;
            break;
    }
    
    if (formatted) {
        textarea.value = text.substring(0, start) + formatted + text.substring(end);
        showStatus(`${format} formatting applied!`);
    }
}

function insertHashtag(tag) {
    const tagsInput = document.getElementById('post-tags');
    const caption = document.getElementById('post-caption');
    const active = document.activeElement;

    // If tags input exists and the caption isn't focused, append to tags as comma-separated values
    if (tagsInput && active !== caption) {
        const current = tagsInput.value
            .split(',')
            .map(t => t.trim())
            .filter(Boolean);
        if (!current.includes(tag)) {
            current.push(tag);
            tagsInput.value = current.join(', ');
        }
        scheduleDraftSave();
        return;
    }

    if (!caption) return;

    const start = caption.selectionStart;
    const text = caption.value;
    const before = text.substring(0, start);
    const after = text.substring(start);
    
    // Add space before tag if needed
    const prefix = (before.length > 0 && !before.endsWith(' ') && !before.endsWith('\n')) ? ' ' : '';
    const suffix = ' ';
    
    caption.value = before + prefix + tag + suffix + after;
    caption.selectionStart = caption.selectionEnd = start + prefix.length + tag.length + suffix.length;
    caption.focus();
    scheduleDraftSave();
}

function updateHashtagButtons() {
    const container = document.querySelector('.hashtag-presets');
    if (!container) return;
    
    const tags = settings.hashtagPresets || ['#SecondLife', '#SLFurry', '#VirtualPhotography', '#SLFashion', '#SLBlogger'];
    
    // Keep the label, regenerate buttons
    container.innerHTML = '<small>Quick hashtags:</small>';
    tags.forEach(tag => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chip hashtag-chip';
        btn.onclick = () => insertHashtag(tag);
        btn.textContent = tag.replace('#', '');
        container.appendChild(btn);
    });
}

// ============================================
// Post Management
// ============================================

function getFormData() {
    // Get sponsors
    const sponsors = Array.from(document.querySelectorAll('#sponsors-list .sponsor-row')).map(item => {
        const store = item.querySelector('.sponsor-store').value;
        const itemName = item.querySelector('.sponsor-item').value;
        const storeLink = item.querySelector('.sponsor-link')?.value || '';
        const event = item.querySelector('.sponsor-event')?.value || '';
        const eventLink = item.querySelector('.sponsor-event-link')?.value || '';
        
        if (store && itemName) {
            // Save to library
            saveToLibrary(store, storeLink, 'sponsor');
            return { store, itemName, storeLink, event, eventLink };
        }
        return null;
    }).filter(Boolean);

    // Get credits
    const credits = Array.from(document.querySelectorAll('#credits-list .credit-row')).map(item => {
        const store = item.querySelector('.credit-store').value;
        const itemName = item.querySelector('.credit-item-name').value;
        const storeLink = item.querySelector('.credit-link')?.value || '';
        const event = item.querySelector('.credit-event')?.value || '';
        const eventLink = item.querySelector('.credit-event-link')?.value || '';
        
        if (store && itemName) {
            // Save to library
            saveToLibrary(store, storeLink);
            return { store, itemName, storeLink, event, eventLink };
        }
        return null;
    }).filter(Boolean);

    // Get avatars
    const avatars = Array.from(document.querySelectorAll('#avatars-list .avatar-card')).map(item => {
        const name = item.querySelector('[name="avatar-name"]').value;
        const modCreator = item.querySelector('[name="avatar-mod-creator"]').value;
        const modLink = item.querySelector('[name="avatar-mod-link"]').value;
        const bodyCreator = item.querySelector('[name="avatar-body-creator"]').value;
        const bodyLink = item.querySelector('[name="avatar-body-link"]').value;
        const headCreator = item.querySelector('[name="avatar-head-creator"]').value;
        const headLink = item.querySelector('[name="avatar-head-link"]').value;
        const handsCreator = item.querySelector('[name="avatar-hands-creator"]').value;
        const handsLink = item.querySelector('[name="avatar-hands-link"]').value;
        const feetCreator = item.querySelector('[name="avatar-feet-creator"]').value;
        const feetLink = item.querySelector('[name="avatar-feet-link"]').value;
        const tailCreator = item.querySelector('[name="avatar-tail-creator"]').value;
        const tailLink = item.querySelector('[name="avatar-tail-link"]').value;
        const earsCreator = item.querySelector('[name="avatar-ears-creator"]').value;
        const earsLink = item.querySelector('[name="avatar-ears-link"]').value;
        const eyesCreator = item.querySelector('[name="avatar-eyes-creator"]').value;
        const eyesLink = item.querySelector('[name="avatar-eyes-link"]').value;
        const hairCreator = item.querySelector('[name="avatar-hair-creator"]').value;
        const hairLink = item.querySelector('[name="avatar-hair-link"]').value;
        const nailsCreator = item.querySelector('[name="avatar-nails-creator"]').value;
        const nailsLink = item.querySelector('[name="avatar-nails-link"]').value;
        const cosmetics = item.querySelector('[name="avatar-cosmetics"]').value.split('\n').map(c => c.trim()).filter(c => c);
        
        if (name) {
            return { name, modCreator, modLink, bodyCreator, bodyLink, headCreator, headLink, handsCreator, handsLink, feetCreator, feetLink, tailCreator, tailLink, earsCreator, earsLink, eyesCreator, eyesLink, hairCreator, hairLink, nailsCreator, nailsLink, cosmetics };
        }
        return null;
    }).filter(Boolean);

    return {
        id: Date.now(),
        title: document.getElementById('post-title').value,
        tags: document.getElementById('post-tags').value.split(',').map(t => t.trim()).filter(t => t),
        image: document.getElementById('blog-image').value,
        imageData: document.getElementById('image-preview').querySelector('img')?.src,
        hostedImageUrl: document.getElementById('hosted-image-url')?.value || '',
        sponsors: sponsors,
        caption: document.getElementById('post-caption').value,
        blueskyLink: document.getElementById('bluesky-link').value,
        sponsorMentions: document.getElementById('sponsor-mentions').value,
        credits: credits,
        avatars: avatars,
        createdAt: new Date().toLocaleString()
    };
}

function savePost() {
    const postData = getFormData();

    const missing = [];
    if (!postData.title) missing.push('Title');
    if (!postData.caption) missing.push('Caption');

    if (missing.length) {
        showStatus(`❌ ${missing.join(' & ')} required`, 'error');
        return;
    }

    const warnings = [];
    if (postData.sponsors.length === 0) warnings.push('no sponsors');
    if (postData.credits.length === 0) warnings.push('no credits');

    posts.push(postData);
    saveData();
    updatePostsList();
    clearDraft();

    // Keep currentPost so export step can use the saved data without the form clearing
    currentPost = postData;

    const warningMsg = warnings.length ? ` Saved without ${warnings.join(' & ')}.` : '';
    showSaveConfirmation(warningMsg);
}

function showSaveConfirmation(extraMessage = '') {
    // Flash the save button
    const saveBtn = document.querySelector('[onclick="savePost()"]');
    if (saveBtn) {
        saveBtn.classList.add('btn-save-flash');
        setTimeout(() => saveBtn.classList.remove('btn-save-flash'), 600);
    }
    
    // Show toast notification
    const toast = document.createElement('div');
    toast.className = 'save-toast';
    toast.textContent = 'Post saved successfully!';
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
    
    // Also show status message
    showStatus(`✅ Post saved successfully!${extraMessage ? ' ' + extraMessage : ''}`);
}

function showUndoToast(message, onUndo) {
    const toast = document.createElement('div');
    toast.className = 'save-toast undo-toast';
    toast.textContent = message;

    const undoBtn = document.createElement('button');
    undoBtn.className = 'btn-secondary tiny';
    undoBtn.textContent = 'Undo';
    undoBtn.onclick = () => {
        onUndo();
        toast.remove();
    };

    toast.appendChild(undoBtn);
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 4000);
}

function clearForm() {
    // Helper function for safe element access
    const safeSet = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value;
    };
    
    safeSet('post-title', '');
    safeSet('post-tags', '');
    safeSet('blog-image', '');
    safeSet('post-caption', '');
    safeSet('bluesky-link', '');
    safeSet('sponsor-mentions', '');
    
    currentPost = {};
    
    // Reset sponsors (leave empty until user adds)
    const sponsorsList = document.getElementById('sponsors-list');
    if (sponsorsList) {
        sponsorsList.innerHTML = '';
    }
    
    // Reset credits (leave empty until user adds)
    const creditsList = document.getElementById('credits-list');
    if (creditsList) {
        creditsList.innerHTML = '';
    }
    
    const imagePreview = document.getElementById('image-preview');
    if (imagePreview) imagePreview.innerHTML = '';
    
    const imageUrlContainer = document.getElementById('image-url-container');
    if (imageUrlContainer) imageUrlContainer.classList.add('hidden');
    
    const hostedImageUrl = document.getElementById('hosted-image-url');
    if (hostedImageUrl) hostedImageUrl.value = '';
    
    clearDraft();
}

// ============================================
// Image Upload
// ============================================

async function uploadToImgBB(file) {
    const apiKey = settings.imgbbKey;
    if (!apiKey) {
        return null;
    }

    try {
        const formData = new FormData();
        formData.append('image', file);
        
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        if (result.success) {
            return result.data.url;
        } else {
            console.error('ImgBB upload failed:', result);
            return null;
        }
    } catch (error) {
        console.error('ImgBB upload error:', error);
        showStatus('❌ Image upload failed', 'error');
        return null;
    }
}

function copyImageUrl() {
    const url = document.getElementById('hosted-image-url').value;
    navigator.clipboard.writeText(url).then(() => {
        showStatus('📋 Image URL copied!');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const imageInput = document.getElementById('blog-image');
    if (imageInput) {
        imageInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                // Show preview with compression to keep storage small
                try {
                    const compressed = await compressImageFile(file, { maxDimension: 1000, quality: 0.72 });
                    const preview = document.getElementById('image-preview');
                    preview.innerHTML = `<img src="${compressed}" alt="Blog image preview">`;
                } catch (err) {
                    console.error('Image preview failed', err);
                }

                // Upload to ImgBB if API key is available
                if (settings.imgbbKey) {
                    showStatus('📤 Uploading image to ImgBB...');
                    const imageUrl = await uploadToImgBB(file);
                    
                    if (imageUrl) {
                        document.getElementById('hosted-image-url').value = imageUrl;
                        document.getElementById('image-url-container').classList.remove('hidden');
                        showStatus('✅ Image uploaded successfully!');
                    }
                } else {
                    document.getElementById('image-url-container').classList.add('hidden');
                }
            }
        });
    }

    // Event image handler (in event modal)
    const eventImageInput = document.getElementById('deadline-event-image');
    if (eventImageInput) {
        eventImageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const preview = document.getElementById('event-image-preview');
                    preview.innerHTML = `<img src="${event.target.result}" alt="Event image">`;
                };
                reader.readAsDataURL(file);
            }
        });
    }
});

// ============================================
// Export Functions
// ============================================

function copySponsorMentions() {
    const mentions = document.getElementById('sponsor-mentions').value.trim();
    if (!mentions) {
        showStatus('❌ No @ handles to copy', 'error');
        return;
    }
    navigator.clipboard.writeText(mentions).then(() => {
        showStatus('📋 @ Mentions copied!');
    });
}

function previewExports() {
    const postData = getFormData();
    
    if (!postData.title || !postData.caption) {
        showStatus('❌ Fill in at least Title and Caption to preview', 'error');
        return;
    }
    
    currentPost = postData;
    currentBatchPosts = [];
    switchExportTab('flickr');
    // Jump to export step inline
    switchSection('new-post');
    goToStep(totalWizardSteps);
}

function switchExportTab(platform) {
    currentPlatform = platform;
    
    // Update active tab
    document.querySelectorAll('.export-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-platform="${platform}"]`).classList.add('active');

    // Toggle BlueSky-only settings
    const blueskyPanel = document.getElementById('bluesky-export-settings');
    if (blueskyPanel) {
        blueskyPanel.classList.toggle('hidden', platform !== 'bluesky');
    }
    
    // Generate export text
    const exportText = currentBatchPosts.length > 0
        ? generateBatchExport(platform)
        : generateExport(platform, currentPost);
    document.getElementById('export-text').value = exportText;
    updateExportCounter(exportText, platform);

    // Load template UI
    const tplLabel = document.getElementById('template-platform-label');
    const tplTextarea = document.getElementById('template-text');
    if (tplLabel) tplLabel.textContent = platform.charAt(0).toUpperCase() + platform.slice(1);
    if (tplTextarea) tplTextarea.value = settings.exportTemplates?.[platform] || '';
}

function prepareExportView(postOverride = null) {
    const hasBatch = currentBatchPosts.length > 0;
    const sourcePost = hasBatch
        ? (postOverride || currentPost)
        : (postOverride || currentPost || getFormData());

    if (!hasBatch) {
        if (!sourcePost?.title || !sourcePost?.caption) {
            showStatus('ℹ️ Add a title and caption to see export text');
        }
        if (sourcePost) {
            currentPost = sourcePost;
        }
    } else {
        currentPost = postOverride || currentPost || null;
    }

    switchExportTab(currentPlatform || 'flickr');
    const exportText = hasBatch
        ? generateBatchExport(currentPlatform)
        : generateExport(currentPlatform, currentPost || sourcePost);
    document.getElementById('export-text').value = exportText;
    updateExportCounter(exportText, currentPlatform);
}

// ============================================
// Draft Autosave
// ============================================

function scheduleDraftSave() {
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(saveDraft, 600);
}

function saveDraft() {
    const draft = getFormData();
    draft.id = null;
    draft.createdAt = null;
    draft.imageData = compactInlineImage(draft.imageData);
    localStorage.setItem(draftKey, JSON.stringify(draft));
    console.log('Draft saved');
}

function loadDraft() {
    const raw = localStorage.getItem(draftKey);
    if (!raw) return;

    try {
        const draft = JSON.parse(raw);
        restoreDraft(draft);
        showStatus('↩️ Draft restored');
    } catch (e) {
        console.error('Draft restore failed', e);
        localStorage.removeItem(draftKey);
    }
}

function showDraftRestorePrompt() {
    const draftToast = document.createElement('div');
    draftToast.className = 'toast toast-info draft-restore-toast';
    draftToast.innerHTML = `
        <div class="toast-content">
            <div class="toast-message">💾 You have a saved draft. Restore it?</div>
            <div class="toast-actions">
                <button class="btn-sm btn-primary" onclick="loadDraft(); this.closest('.draft-restore-toast').remove();">Restore</button>
                <button class="btn-sm btn-secondary" onclick="clearDraft(); this.closest('.draft-restore-toast').remove();">Discard</button>
            </div>
        </div>
    `;
    document.getElementById('toast-container').appendChild(draftToast);
    
    setTimeout(() => {
        if (draftToast.parentElement) {
            draftToast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => draftToast.remove(), 300);
        }
    }, 8000);
}

function clearDraft() {
    localStorage.removeItem(draftKey);
}

function generateExport(platform, post) {
    if (!post) return '';
    
    const sponsors = formatCreditsForExport(post.sponsors);
    const credits = formatCreditsForExport(post.credits);
    const bio = settings.authorBio || '[Your Bio - set in Settings]';

    const template = settings.exportTemplates?.[platform];
    if (template && template.trim().length > 0) {
        return applyTemplate(template, { post, sponsors, credits, bio });
    }
    
    switch (platform) {
        case 'flickr':
            return generateFlickrExport(post, sponsors, credits, bio);
        case 'bluesky':
            return generateBlueskyExport(post, sponsors, credits);
        case 'youtube':
            return generateYoutubeExport(post, sponsors, credits, bio);
        case 'primfeed':
            return generatePrimfeedExport(post, sponsors, credits, bio);
        case 'blog':
            return generateBlogExport(post, sponsors, credits, bio);
        default:
            return '';
    }
}

function applyTemplate(template, { post, sponsors, credits, bio }) {
    const tokens = {
        '{title}': post.title || '',
        '{caption}': post.caption || '',
        '{sponsors}': sponsors || '',
        '{credits}': credits || '',
        '{bio}': bio || '',
        '{blueskyLink}': post.blueskyLink || ''
    };
    return Object.entries(tokens).reduce((acc, [key, value]) => acc.split(key).join(value), template);
}

function formatCreditsForExport(credits) {
    return credits.map(c => {
        let line = `✦ ${c.store} - ${c.itemName}`;
        if (c.event) {
            line += ` (${c.event}`;
            if (c.details) line += ` - ${c.details}`;
            line += ')';
        }
        return line;
    }).join('\n');
}

function generateFlickrExport(post, sponsors, credits, bio) {
    const title = post.title || '';
    const sponsorBlock = sponsors || '✦ (creator) - (item name)';
    const creditBlock = credits || '✦ (creator) - (item name)';
    const caption = post.caption || '';
    return `Post Title: ${title}

| Sponsors 💚
${sponsorBlock}
|

${caption}

| Credits 📝
${creditBlock}
|

-- ✦ --

🐺 𝒈𝒓𝒂𝒗𝒆𝒔 𝒈𝒉𝒐𝒔𝒕𝒍𝒚 💫 <a href="https://gravesghostly.blog">𝑏𝑙𝑜𝑔</a> ✦ <a href="https://bsky.app/profile/gravesghostly.blog">𝑏𝑙𝑢𝑒𝑠𝑘𝑦</a> ✦ <a href="https://www.flickr.com/photos/192472980@N03">𝑓𝑙𝑖𝑐𝑘𝑟</a> ✦ <a href="https://www.youtube.com/@gravesghostly">𝑦𝑜𝑢𝑡𝑢𝑏𝑒</a> 💚`;
}

function generateBlueskyExport(post, sponsors, credits) {
    // 300 char limit - keep tight
    const title = (post.title || '').substring(0, 50);
    const caption = (post.caption || '').substring(0, 120);
    const sponsorBlock = sponsors || '✦ (creator) - (item name)';
    const link = post.blueskyLink ? ` - ${post.blueskyLink}` : '';
    return `${title}${link}

${caption}

| Sponsors 💚
${sponsorBlock}
| #SecondLife #SLFurry`;
}

function generateYoutubeExport(post, sponsors, credits, bio) {
    const title = post.title || '';
    const sponsorBlock = sponsors || '✦ (creator) - (item name)';
    const creditBlock = credits || '✦ (creator) - (item name)';
    const caption = post.caption || '';
    const tags = post.tags?.map(t => `#${t}`).join(' ') || '';
    return `Post Title: ${title}

| Sponsors 💚
${sponsorBlock}
|

${caption}

| Credits 📝
${creditBlock}
|

-- ✦ --

🐺 𝒈𝒓𝒂𝒗𝒆𝒔 𝒈𝒉𝒐𝒔𝒕𝒍𝒚 💫
✦ 𝑏𝑙𝑜𝑔 - https://gravesghostly.blog/
✦ 𝑏𝑙𝑢𝑒𝑠𝑘𝑦 - https://bsky.app/profile/gravesghostly.blog/
✦ 𝑓𝑙𝑖𝑐𝑘𝑟 - https://www.flickr.com/photos/192472980@N03/
✦ 𝑦𝑜𝑢𝑡𝑢𝑏𝑒 - https://www.youtube.com/@gravesghostly/
| ${tags}`;
}

function generatePrimfeedExport(post, sponsors, credits, bio) {
    return generateYoutubeExport(post, sponsors, credits, bio);
}

function generateBlogExport(post, sponsors, credits, bio) {
    // Same as Flickr/Blog template
    return generateFlickrExport(post, sponsors, credits, bio);
}

function generateBatchExport(platform) {
    if (!currentBatchPosts || currentBatchPosts.length === 0) return '';
    const exports = currentBatchPosts.map(p => generateExport(platform, p));
    return exports.join('\n\n---\n\n');
}

function copyExport() {
    const text = document.getElementById('export-text').value;
    navigator.clipboard.writeText(text).then(() => {
        showStatus('📋 Copied to clipboard!');
    });
}

function copyTagsForFlickrTumblr() {
    if (!currentPost) {
        showToast('No post loaded', 'warning');
        return;
    }
    
    const tags = (currentPost.tags || []);
    if (tags.length === 0) {
        showToast('No tags to copy', 'warning');
        return;
    }
    
    const tagsString = tags.join(', ');
    navigator.clipboard.writeText(tagsString).then(() => {
        showToast(`Copied ${tags.length} tags for Flickr/Tumblr!`, 'success');
    }).catch(() => {
        showToast('Failed to copy tags', 'error');
    });
}

function copySection(section) {
    const post = currentBatchPosts.length > 0 ? currentBatchPosts[0] : currentPost;
    if (!post) return;

    const sponsors = formatCreditsForExport(post.sponsors || []);
    const credits = formatCreditsForExport(post.credits || []);
    
    let text = '';
    switch (section) {
        case 'sponsors':
            text = sponsors;
            break;
        case 'credits':
            text = credits;
            break;
        case 'caption':
            text = post.caption || '';
            break;
    }
    
    if (text) {
        navigator.clipboard.writeText(text).then(() => {
            showStatus(`📋 ${section.charAt(0).toUpperCase() + section.slice(1)} copied!`);
        });
    } else {
        showStatus(`❌ No ${section} to copy`, 'error');
    }
}

function updateExportCounter(text, platform) {
    const counter = document.getElementById('export-counter');
    const limitLabel = document.getElementById('export-limit-label');
    if (!counter || !limitLabel) return;

    const len = text.length;
    const limit = exportLimits[platform];
    counter.textContent = `${len} chars`;

    if (!limit) {
        counter.className = 'counter-ok';
        limitLabel.textContent = '';
        return;
    }

    limitLabel.textContent = `Limit: ${limit}`;
    if (len <= limit) {
        counter.className = 'counter-ok';
    } else if (len <= limit + 50) {
        counter.className = 'counter-warn';
    } else {
        counter.className = 'counter-error';
    }
}

function saveTemplate() {
    const textarea = document.getElementById('template-text');
    if (!textarea) return;
    if (!settings.exportTemplates) settings.exportTemplates = {};
    settings.exportTemplates[currentPlatform] = textarea.value;
    saveData();
    const exportText = currentBatchPosts.length > 0
        ? generateBatchExport(currentPlatform)
        : generateExport(currentPlatform, currentPost);
    document.getElementById('export-text').value = exportText;
    updateExportCounter(exportText, currentPlatform);
    showStatus('💾 Template saved');
}

function resetTemplate() {
    if (settings.exportTemplates && settings.exportTemplates[currentPlatform]) {
        delete settings.exportTemplates[currentPlatform];
        saveData();
    }
    const textarea = document.getElementById('template-text');
    if (textarea) textarea.value = '';
    const exportText = currentBatchPosts.length > 0
        ? generateBatchExport(currentPlatform)
        : generateExport(currentPlatform, currentPost);
    document.getElementById('export-text').value = exportText;
    updateExportCounter(exportText, currentPlatform);
    showStatus('↩️ Template reset to default');
}

function downloadExport() {
    const text = document.getElementById('export-text').value;
    const filename = currentBatchPosts.length > 0
        ? `batch-export-${currentPlatform}-${Date.now()}.txt`
        : `export-${currentPost.title}-${currentPlatform}.txt`;
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showStatus('⬇️ File downloaded!');
}

// ============================================
// Export Presets Management
// ============================================

function saveExportPreset() {
    const presetName = prompt('Save this export preset as:', `${currentPlatform}-preset-${Object.keys(settings.exportPresets).length + 1}`);
    if (!presetName) return;

    if (settings.exportPresets[presetName]) {
        if (!confirm(`Preset "${presetName}" already exists. Overwrite?`)) return;
    }

    settings.exportPresets[presetName] = {
        platform: currentPlatform,
        template: settings.exportTemplates?.[currentPlatform] || '',
        hashtags: settings.hashtagPresets || []
    };

    saveData();
    updateExportPresetDropdown();
    showStatus(`💾 Preset "${presetName}" saved`);
}

function loadExportPreset(presetName) {
    const preset = settings.exportPresets[presetName];
    if (!preset) return;

    currentPlatform = preset.platform;
    settings.exportTemplates[preset.platform] = preset.template;
    settings.hashtagPresets = preset.hashtags;

    switchExportTab(preset.platform);
    updateExportPresetDropdown();
    showStatus(`📂 Preset "${presetName}" loaded`);
}

function deleteExportPreset(presetName) {
    if (!confirm(`Delete preset "${presetName}"?`)) return;

    delete settings.exportPresets[presetName];
    saveData();
    updateExportPresetDropdown();
    showStatus(`🗑️ Preset deleted`);
}

function updateExportPresetDropdown() {
    const dropdown = document.getElementById('export-preset-select');
    if (!dropdown) return;

    const presets = Object.keys(settings.exportPresets || {});
    dropdown.innerHTML = '<option value="">Load a preset...</option>';
    presets.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        dropdown.appendChild(opt);
    });

    // Re-attach change listener
    dropdown.onchange = (e) => {
        if (e.target.value) {
            loadExportPreset(e.target.value);
            e.target.value = '';
        }
    };
}

// ============================================
// Posts List Management
// ============================================

function setPostsSearch(term) {
    postSearchTerm = term.toLowerCase();
    updatePostsList();
}

function setPostsSort(option) {
    postSortOption = option;
    updatePostsList();
}

function togglePostFilter(filterType, tagName) {
    if (tagName) {
        // Tag filter toggle
        if (selectedTags.has(tagName)) {
            selectedTags.delete(tagName);
        } else {
            selectedTags.add(tagName);
        }
        // Update chip active state
        document.querySelectorAll(`.tag-chip[data-tag="${tagName}"]`).forEach(chip => {
            chip.classList.toggle('active', selectedTags.has(tagName));
        });
    } else {
        // Regular filter toggle (sponsors, credits)
        postFilters[filterType] = !postFilters[filterType];
        // toggle chip active state
        document.querySelectorAll(`.chip[data-filter="${filterType}"]`).forEach(chip => {
            chip.classList.toggle('active', postFilters[filterType]);
        });
    }
    updatePostsList();
}

function updateTagFilterChips() {
    // Collect all unique tags from all posts
    const allTags = new Set();
    posts.forEach(post => {
        (post.tags || []).forEach(tag => allTags.add(tag));
    });

    const tagsContainer = document.getElementById('tag-filter-chips');
    if (!tagsContainer) return; // If no tag filter container, skip

    if (allTags.size === 0) {
        tagsContainer.classList.add('hidden');
        return;
    }

    tagsContainer.classList.remove('hidden');
    const chips = Array.from(allTags).sort().map(tag => `
        <button type="button" class="tag-chip ${selectedTags.has(tag) ? 'active' : ''}" data-tag="${tag}" onclick="togglePostFilter(null, '${tag}')" title="Filter by tag">
            ${tag}
        </button>
    `).join('');

    tagsContainer.innerHTML = chips;
}


function applyPostFilters(list) {
    let result = [...list];

    // search by title
    if (postSearchTerm) {
        result = result.filter(p => (p.title || '').toLowerCase().includes(postSearchTerm));
    }

    // filter flags
    if (postFilters.sponsors) {
        result = result.filter(p => (p.sponsors || []).length > 0);
    }
    if (postFilters.credits) {
        result = result.filter(p => (p.credits || []).length > 0);
    }

    // filter by selected tags (if any tag is selected, include posts that have ANY of those tags)
    if (selectedTags.size > 0) {
        result = result.filter(p => {
            const postTags = new Set(p.tags || []);
            return Array.from(selectedTags).some(tag => postTags.has(tag));
        });
    }

    // sort
    result.sort((a, b) => {
        switch (postSortOption) {
            case 'oldest':
                return (a.id || 0) - (b.id || 0);
            case 'title':
                return (a.title || '').localeCompare(b.title || '');
            case 'sponsors':
                return (b.sponsors?.length || 0) - (a.sponsors?.length || 0);
            case 'credits':
                return (b.credits?.length || 0) - (a.credits?.length || 0);
            case 'newest':
            default:
                return (b.id || 0) - (a.id || 0);
        }
    });

    return result;
}

function togglePostSelection(id) {
    if (selectedPostIds.has(id)) {
        selectedPostIds.delete(id);
    } else {
        selectedPostIds.add(id);
    }
    updatePostsList();
}

function toggleSelectAllPosts() {
    if (selectedPostIds.size === posts.length) {
        selectedPostIds.clear();
    } else {
        selectedPostIds = new Set(posts.map(p => p.id));
    }
    updatePostsList();
}

function batchExport() {
    const selected = posts.filter(p => selectedPostIds.has(p.id));
    if (selected.length === 0) {
        showStatus('❌ Select at least one post for batch export', 'error');
        return;
    }
    currentBatchPosts = selected;
    currentPost = null;
    switchExportTab(currentPlatform || 'flickr');
    switchSection('new-post');
    goToStep(totalWizardSteps);
    showStatus(`📤 Batch exporting ${selected.length} posts`);
}

function updatePostsList() {
    const postsList = document.getElementById('posts-list');
    
    const displayPosts = applyPostFilters(posts);

    // Update tag filter chips
    updateTagFilterChips();

    if (displayPosts.length === 0) {
        postsList.innerHTML = '<p class="empty-state">No posts yet. Create your first one!</p>';
        return;
    }
    
    postsList.innerHTML = displayPosts.map(post => {
        const tagsHtml = (post.tags && post.tags.length > 0) ? `
            <div class="post-card-tags">
                ${post.tags.map(tag => `<span class="post-tag">${tag}</span>`).join('')}
            </div>
        ` : '';
        
        return `
        <div class="post-card ${selectedPostIds.has(post.id) ? 'selected' : ''}">
            <div class="post-select">
                <input type="checkbox" ${selectedPostIds.has(post.id) ? 'checked' : ''} onchange="togglePostSelection(${post.id})">
            </div>
            ${post.imageData ? `<img src="${post.imageData}" class="post-card-image" alt="${post.title}">` : '<div class="post-card-placeholder">No Image</div>'}
            <div class="post-card-content">
                <div class="post-card-title">${post.title}</div>
                <div class="post-card-meta">${post.createdAt}</div>
                ${tagsHtml}
                <div class="post-card-actions">
                    <button onclick="editPost(${post.id})">✏️ Edit</button>
                    <button onclick="deletePost(${post.id})">🗑️ Delete</button>
                    <button onclick="sharePost(${post.id})">📤 Export</button>
                </div>
            </div>
        </div>
    `}).join('');
}

function editPost(id) {
    const post = posts.find(p => p.id === id);
    if (!post) return;
    
    currentPost = {};
    
    // Switch to new-post section first
    switchSection('new-post');
    goToStep(1);
    
    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
        const safeSet = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value;
        };
        
        // Load post data into form
        safeSet('post-title', post.title || '');
        safeSet('post-tags', (post.tags || []).join(', '));
        safeSet('post-caption', post.caption || '');
        safeSet('bluesky-link', post.blueskyLink || '');
        safeSet('sponsor-mentions', post.sponsorMentions || '');
        
        if (post.imageData) {
            const preview = document.getElementById('image-preview');
            if (preview) preview.innerHTML = `<img src="${post.imageData}" alt="Blog image">`;
        }

        // Load hosted image URL if available
        if (post.hostedImageUrl) {
            const urlEl = document.getElementById('hosted-image-url');
            const containerEl = document.getElementById('image-url-container');
            if (urlEl) urlEl.value = post.hostedImageUrl;
            if (containerEl) containerEl.classList.remove('hidden');
        }
        
        // Sponsors
        const sponsorsList = document.getElementById('sponsors-list');
        if (sponsorsList && post.sponsors && post.sponsors.length > 0) {
            sponsorsList.innerHTML = post.sponsors.map(s => `
                <div class="sponsor-row">
                    <input type="text" name="sponsor-store" aria-label="Sponsor store" placeholder="Creator/store" class="sponsor-store" list="saved-stores" value="${s.store || ''}">
                    <input type="text" name="sponsor-item" aria-label="Sponsor item" placeholder="Item name" class="sponsor-item" value="${s.itemName || ''}">
                    <input type="url" name="sponsor-link" aria-label="Sponsor store link" placeholder="Store link (SL/MP)" class="sponsor-link" value="${s.storeLink || ''}" title="In-world landmark or Marketplace URL">
                    <input type="text" name="sponsor-event" aria-label="Sponsor event" placeholder="Event name" class="sponsor-event" value="${s.event || ''}">
                    <input type="url" name="sponsor-event-link" aria-label="Sponsor event landmark" placeholder="Event landmark" class="sponsor-event-link" value="${s.eventLink || ''}" title="Event in-world landmark">
                    <button type="button" class="btn-remove" onclick="removeCredit(this)">✕</button>
                </div>
            `).join('');
        }
        
        // Credits
        const creditsList = document.getElementById('credits-list');
        if (creditsList && post.credits && post.credits.length > 0) {
            creditsList.innerHTML = post.credits.map(c => `
                <div class="credit-row">
                    <input type="text" name="credit-store" aria-label="Credit store" placeholder="Creator/store" class="credit-store" list="saved-stores" value="${c.store || ''}">
                    <input type="text" name="credit-item" aria-label="Credit item" placeholder="Item name" class="credit-item-name" value="${c.itemName || ''}">
                    <input type="url" name="credit-link" aria-label="Credit store link" placeholder="Store link (SL/MP)" class="credit-link" value="${c.storeLink || ''}" title="In-world landmark or Marketplace URL">
                    <input type="text" name="credit-event" aria-label="Credit event" placeholder="Event name" class="credit-event" value="${c.event || ''}">
                    <input type="url" name="credit-event-link" aria-label="Credit event landmark" placeholder="Event landmark" class="credit-event-link" value="${c.eventLink || ''}" title="Event in-world landmark">
                    <button type="button" class="btn-remove" onclick="removeCredit(this)">✕</button>
                </div>
            `).join('');
        }
        
        // Avatars (removed - avatars no longer part of workflow)

        // Remove old post from array
        posts = posts.filter(p => p.id !== id);
        showStatus('📝 Post loaded for editing');
    }, 50);
}

function deletePost(id) {
    const post = posts.find(p => p.id === id);
    if (!post) return;

    const confirmed = confirm(`Delete "${post.title}"? This can be undone immediately.`);
    if (!confirmed) return;

    const previousPosts = [...posts];
    posts = posts.filter(p => p.id !== id);
    saveData();
    updatePostsList();
    showUndoToast('🗑️ Post deleted', () => {
        posts = previousPosts;
        saveData();
        updatePostsList();
        showStatus('✅ Post restored');
    });
}

function sharePost(id) {
    const post = posts.find(p => p.id === id);
    if (!post) return;
    
    currentPost = post;
    currentBatchPosts = [];
    switchExportTab('flickr');
    switchSection('new-post');
    goToStep(totalWizardSteps);
}

// ============================================
// Settings Management
// ============================================

function displayAuthorBio() {
    const bioDisplay = document.getElementById('bio-display');
    if (!bioDisplay) return;
    if (settings.authorBio) {
        bioDisplay.innerHTML = settings.authorBio;
    } else {
        bioDisplay.innerHTML = '<em style="color: var(--text-secondary);">No bio set yet. Add one in Settings.</em>';
    }
}

function saveSettings() {
    settings.authorBio = document.getElementById('author-bio').value;
    settings.jsonbinKey = document.getElementById('jsonbin-key').value;
    settings.imgbbKey = document.getElementById('imgbb-key').value;
    
    // Parse hashtag presets
    const hashtagText = document.getElementById('hashtag-presets').value;
    settings.hashtagPresets = hashtagText
        .split('\n')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
    
    localStorage.setItem('blogplanner-settings', JSON.stringify(settings));
    displayAuthorBio();
    updateApiKeyStatus();
    updateHashtagButtons();
    
    // Show save confirmation
    const statusEl = document.getElementById('settings-save-status');
    statusEl.textContent = '✅ Settings saved successfully!';
    statusEl.style.color = '#22c55e';
    
    setTimeout(() => {
        statusEl.textContent = '';
    }, 3000);
    
    showStatus('✅ Settings saved!');
}

function updateApiKeyStatus() {
    // JSONbin status
    const jsonbinStatus = document.getElementById('jsonbin-status');
    if (settings.jsonbinKey && settings.jsonbinKey.length > 0) {
        jsonbinStatus.textContent = '✓ Saved';
        jsonbinStatus.className = 'api-status saved';
    } else {
        jsonbinStatus.textContent = '✗ Not Set';
        jsonbinStatus.className = 'api-status empty';
    }
    
    // ImgBB status
    const imgbbStatus = document.getElementById('imgbb-status');
    if (settings.imgbbKey && settings.imgbbKey.length > 0) {
        imgbbStatus.textContent = '✓ Saved';
        imgbbStatus.className = 'api-status saved';
    } else {
        imgbbStatus.textContent = '✗ Not Set';
        imgbbStatus.className = 'api-status empty';
    }
}

// Toggle Settings Sections (collapse/expand)
function toggleSettingsSection(headerElement) {
    const fieldset = headerElement.closest('fieldset');
    if (!fieldset) return;
    
    fieldset.classList.toggle('collapsed');
}

// Initialize Settings Sections (collapse by default, except Data Management)
function initializeSettingsSections() {
    const settingsSections = document.querySelectorAll('.settings-section-collapsible');
    settingsSections.forEach(section => {
        section.classList.add('collapsed');
    });
}

function exportAllData() {
    const data = {
        posts: posts,
        settings: settings,
        exportDate: new Date().toLocaleString()
    };
    
    const element = document.createElement('a');
    element.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2)));
    element.setAttribute('download', `blogplanner-backup-${Date.now()}.json`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showStatus('⬇️ Data exported!');
}

async function syncToCloud() {
    if (!settings.jsonbinKey) {
        showStatus('❌ Please set your JSONbin API key in Settings first', 'error');
        return;
    }

    const data = {
        posts: posts,
        settings: { authorBio: settings.authorBio }, // Don't sync API keys
        lastSync: new Date().toISOString()
    };

    try {
        showStatus('☁️ Syncing to cloud...');
        
        // Get or create bin ID
        let binId = localStorage.getItem('blogplanner-bin-id');
        
        if (binId) {
            // Update existing bin
            const response = await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': settings.jsonbinKey
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Sync failed');
        } else {
            // Create new bin
            const response = await fetch('https://api.jsonbin.io/v3/b', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': settings.jsonbinKey,
                    'X-Bin-Name': 'SL Blog Planner Data'
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Sync failed');

            const result = await response.json();
            binId = result.metadata.id;
            localStorage.setItem('blogplanner-bin-id', binId);
        }
        
        showStatus('✅ Synced to cloud successfully!');
        
        updateCloudSyncStatus(data.lastSync);
    } catch (error) {
        console.error('Cloud sync error:', error);
        showStatus('❌ Cloud sync failed - check your API key', 'error');
    }
}

async function loadFromCloud() {
    if (!settings.jsonbinKey) {
        showStatus('❌ Please set your JSONbin API key first', 'error');
        return;
    }

    const binId = localStorage.getItem('blogplanner-bin-id');
    if (!binId) {
        showStatus('❌ No cloud backup found. Sync first!', 'error');
        return;
    }

    try {
        showStatus('⬇️ Loading from cloud...');
        
        const response = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
            headers: {
                'X-Master-Key': settings.jsonbinKey
            }
        });
        
        if (!response.ok) throw new Error('Load failed');
        
        const result = await response.json();
        const data = result.record;
        
        // Restore data
        posts = data.posts || [];
        if (data.settings?.authorBio) {
            settings.authorBio = data.settings.authorBio;
            document.getElementById('author-bio').value = settings.authorBio;
        }
        
        saveData();
        updatePostsList();
        displayAuthorBio();
        updateCloudSyncStatus(data.lastSync);
        
        showStatus('✅ Loaded from cloud successfully!');
    } catch (error) {
        console.error('Cloud load error:', error);
        showStatus('❌ Failed to load from cloud', 'error');
    }
}

function updateCloudSyncStatus(lastSync) {
    const statusEl = document.getElementById('cloud-sync-status');
    if (lastSync) {
        const date = new Date(lastSync);
        statusEl.textContent = `Last synced: ${date.toLocaleString()}`;
        statusEl.style.color = 'var(--text-secondary)';
    }
}

function clearAllData() {
    if (confirm('⚠️ This will delete ALL posts and settings. Are you sure?')) {
        posts = [];
        settings = { authorBio: '', jsonbinKey: '', imgbbKey: '', exportTemplates: {} };
        selectedPostIds = new Set();
        currentBatchPosts = [];
        savedLibrary = { stores: [] };
        saveData();
        localStorage.removeItem('blogplanner-library');
        document.getElementById('posts-list').innerHTML = '<p class="empty-state">No posts yet.</p>';
        updateStoreDatalist();
        showStatus('🗑️ All data cleared');
    }
}

// ============================================
// Data Persistence
// ============================================
// Note: saveData() and loadData() functions are defined at the end of this file
// with enhanced functionality for events and better error handling

function loadDataInit() {
    const savedPosts = localStorage.getItem('blogplanner-posts');
    const savedSettings = localStorage.getItem('blogplanner-settings');
    const savedLib = localStorage.getItem('blogplanner-library');
    const savedEvents = localStorage.getItem('blogplanner-events');
    
    if (savedPosts) {
        posts = JSON.parse(savedPosts).map(p => {
            const compacted = compactPostForStorage(p);
            return compacted;
        });
        console.log('Loaded posts:', posts.length);
    }
    
    if (savedSettings) {
        settings = JSON.parse(savedSettings);
        if (!settings.exportTemplates) settings.exportTemplates = {};
        if (!settings.hashtagPresets) settings.hashtagPresets = ['#3DArt', '#Blogger', '#EnvTuber', '#Fashion', '#FashionBlog', '#Furry', '#FurryArt', '#GravesGhostly', '#Metaverse', '#Photography', '#RareBeings', '#SecondLife', '#SecondLifeBlog', '#SecondLifeBlogger', '#SecondLifePhoto', '#SL', '#SLBlog', '#SLBlogger', '#VirtualPhotography'];
        if (!settings.exportPresets) settings.exportPresets = {};
        document.getElementById('author-bio').value = settings.authorBio || '';
        document.getElementById('jsonbin-key').value = settings.jsonbinKey || '';
        document.getElementById('imgbb-key').value = settings.imgbbKey || '';
        document.getElementById('hashtag-presets').value = (settings.hashtagPresets || []).join('\n');
        console.log('Settings loaded:', {
            hasBio: !!settings.authorBio,
            hasJsonbin: !!settings.jsonbinKey,
            hasImgbb: !!settings.imgbbKey
        });
    }
    
    if (savedLib) {
        savedLibrary = JSON.parse(savedLib);
        console.log('Loaded library:', savedLibrary.stores.length, 'stores');
        normalizeLibraryTypes();
    }
    
    if (savedEvents) {
        events = JSON.parse(savedEvents);
        console.log('Loaded events:', events.length);
    }
    
    // Update API status indicators
    updateApiKeyStatus();
    updateStoreDatalist();
    
    // Add autocomplete event listeners to initial rows
    document.querySelectorAll('.sponsor-store, .credit-store').forEach(input => {
        attachStoreAutofill(input);
    });
}

// ============================================
// UI Utilities
// ============================================

function showStatus(message, type = 'info') {
    const statusEl = document.getElementById('status-message');
    statusEl.textContent = message;
    statusEl.style.color = type === 'error' ? '#ef4444' : '#6366f1';
    
    setTimeout(() => {
        statusEl.textContent = '';
    }, 4000);
}

// ============================================
// Toast Notifications
// ============================================

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️'
    };
    
    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || icons.info}</div>
        <div class="toast-content">
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ============================================
// Dashboard Functions
// ============================================

function updateDashboard() {
    updateDashboardStats();
    updateRecentPosts();
    updateEventsList();
}

function updateDashboardStats() {
    // Total posts
    document.getElementById('stat-total-posts').textContent = posts.length;
    
    // Unique sponsors
    const uniqueSponsors = new Set();
    posts.forEach(post => {
        (post.sponsors || []).forEach(s => uniqueSponsors.add(s.store));
    });
    document.getElementById('stat-total-sponsors').textContent = uniqueSponsors.size;
    
    // Unique credits
    const uniqueCredits = new Set();
    posts.forEach(post => {
        (post.credits || []).forEach(c => uniqueCredits.add(c.store));
    });
    document.getElementById('stat-total-credits').textContent = uniqueCredits.size;
    
    // Unique tags
    const uniqueTags = new Set();
    posts.forEach(post => {
        (post.tags || []).forEach(tag => uniqueTags.add(tag));
    });
    document.getElementById('stat-total-tags').textContent = uniqueTags.size;
}

function updateRecentPosts() {
    const container = document.getElementById('recent-posts-list');
    const recentPosts = [...posts].sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, 5);
    
    if (recentPosts.length === 0) {
        container.innerHTML = '<p class="empty-state">No recent posts yet.</p>';
        return;
    }
    
    container.innerHTML = recentPosts.map(post => `
        <div class="recent-post-item" onclick="editPost(${post.id})">
            <div class="recent-post-info">
                <h4>${post.title}</h4>
                <p>${post.createdAt || 'No date'}</p>
            </div>
            <div class="recent-post-actions">
                <button onclick="event.stopPropagation(); sharePost(${post.id})">Export</button>
            </div>
        </div>
    `).join('');
}

// ============================================
// Events & Deadlines Functions
// ============================================

function parseDateInput(value) {
    if (!value) return null;
    const parts = value.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return null;
    const [year, month, day] = parts;
    return new Date(year, month - 1, day); // local midnight
}



function openEventModal(eventId = null, defaultStart = null, defaultEnd = null) {
    // Ensure preview is closed when opening the full modal
    closeEventPreview();
    currentEventId = eventId;
    const modal = document.getElementById('event-modal');
    const title = document.getElementById('event-modal-title');
    
    // Reset form
    document.getElementById('deadline-name').value = '';
    document.getElementById('deadline-event-start-date').value = defaultStart || '';
    document.getElementById('deadline-event-end-date').value = defaultEnd || '';
    document.getElementById('deadline-event-theme').value = '';
    document.getElementById('deadline-notes').value = '';
    document.getElementById('event-image-preview').innerHTML = '';
    
    if (eventId) {
        const event = events.find(e => e.id === eventId);
        if (event) {
            title.textContent = 'Edit Event';
            document.getElementById('deadline-name').value = event.name || '';
            document.getElementById('deadline-event-start-date').value = event.eventStartDate || event.eventDate || event.date || '';
            document.getElementById('deadline-event-end-date').value = event.eventEndDate || '';
            document.getElementById('deadline-event-theme').value = event.theme || '';
            document.getElementById('deadline-notes').value = event.notes || '';
            
            if (event.eventImage) {
                document.getElementById('event-image-preview').innerHTML = `<img src="${event.eventImage}" alt="Event image">`;
            }
        }
    } else {
        title.textContent = 'Add Event';
    }
    
    modal.classList.add('active');
}

function closeEventModal() {
    document.getElementById('event-modal').classList.remove('active');
    currentEventId = null;
}

function openEventPreview(eventId) {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    // Hide modal if open
    const modal = document.getElementById('event-modal');
    if (modal) modal.classList.remove('active');

    const card = document.getElementById('event-preview-card');
    const startStr = event.eventStartDate || event.eventDate || event.date;
    const endStr = event.eventEndDate || '';
    const start = parseDateInput(startStr);
    const end = endStr ? parseDateInput(endStr) : null;
    
    const dateLabel = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(start);
    const rangeLabel = end && end.getTime() !== start.getTime()
        ? ` - ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(end)}`
        : '';

    document.getElementById('preview-title').textContent = event.name || 'Untitled';
    
    const typeIcon = '🎉';
    const typeLabel = 'Scheduled Event';
    
    document.getElementById('preview-type-badge').innerHTML = `${typeIcon} ${typeLabel}`;

    // Date
    document.getElementById('preview-date-text').textContent = dateLabel + rangeLabel;

    // Type-specific fields
    const themeRow = document.getElementById('preview-theme-row');
    const notesRow = document.getElementById('preview-notes-row');

    if (event.theme) {
        themeRow.style.display = '';
        document.getElementById('preview-theme-text').textContent = event.theme;
    } else {
        themeRow.style.display = 'none';
    }

    if (event.notes) {
        notesRow.style.display = '';
        document.getElementById('preview-notes-text').textContent = event.notes;
    } else {
        notesRow.style.display = 'none';
    }

    // Image
    const imageEl = document.getElementById('preview-image');
    if (event.eventImage) {
        imageEl.innerHTML = `<img src="${event.eventImage}" alt="Event">`;
        imageEl.style.display = '';
    } else {
        imageEl.style.display = 'none';
    }

    currentEventId = eventId;
    card.classList.add('active');
}

function closeEventPreview() {
    document.getElementById('event-preview-card').classList.remove('active');
}

function editEventFromPreview() {
    closeEventPreview();
    if (currentEventId) {
        openEventModal(currentEventId);
    }
}

function deleteEventFromPreview() {
    if (confirm('Delete this event?')) {
        closeEventPreview();
        deleteEvent(currentEventId);
    }
}

function saveDeadline() {
    const name = document.getElementById('deadline-name').value.trim();
    const eventStartDate = document.getElementById('deadline-event-start-date').value;
    const eventEndDate = document.getElementById('deadline-event-end-date').value;
    const theme = document.getElementById('deadline-event-theme').value.trim();
    const notes = document.getElementById('deadline-notes').value.trim();
    
    if (!name) {
        showToast('Please enter event name', 'error');
        return;
    }
    
    if (!eventStartDate) {
        showToast('Please enter event start date', 'error');
        return;
    }
    
    const eventStartObj = parseDateInput(eventStartDate);
    const eventEndObj = parseDateInput(eventEndDate);
    if (eventEndObj && eventEndObj < eventStartObj) {
        showToast('End date cannot be before start date', 'error');
        return;
    }
    
    // Get event image if uploaded
    let eventImage = '';
    const imagePreview = document.getElementById('event-image-preview');
    if (imagePreview && imagePreview.querySelector('img')) {
        eventImage = imagePreview.querySelector('img').src;
    }
    
    if (currentEventId) {
        // Edit existing event
        const index = events.findIndex(e => e.id === currentEventId);
        if (index !== -1) {
            events[index] = {
                ...events[index],
                type: 'event',
                name,
                notes,
                eventStartDate,
                eventEndDate,
                eventDate: eventStartDate,
                date: eventStartDate,
                theme,
                eventImage
            };
            showToast('Event updated!', 'success');
        }
    } else {
        // Create new event
        const newEvent = {
            id: Date.now(),
            type: 'event',
            name,
            notes,
            eventStartDate,
            eventEndDate,
            eventDate: eventStartDate,
            date: eventStartDate,
            theme,
            eventImage,
            createdAt: new Date().toLocaleString()
        };
        events.push(newEvent);
        showToast('Event added!', 'success');
    }
    
    saveData();
    updateEventsList();
    closeEventModal();
}



function deleteEvent(eventId) {
    if (confirm('Delete this event?')) {
        events = events.filter(e => e.id !== eventId);
        saveData();
        updateEventsList();
        showToast('Event deleted', 'info');
    }
}

function updateEventsList() {
    updateUpcomingEvents();
}


// ============================================
// Keyboard Shortcuts
// ============================================

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + S: Save/Next step
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            const activeSection = document.querySelector('section.active');
            if (activeSection && activeSection.id === 'new-post') {
                if (currentWizardStep < totalWizardSteps) {
                    goToStep(currentWizardStep + 1);
                } else {
                    savePost();
                }
                showToast('Progress saved', 'success');
            }
        }
        
        // Ctrl/Cmd + E: Quick export
        if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
            e.preventDefault();
            if (currentPost) {
                sharePost(currentPost.id);
            }
        }
        
        // Escape: Close modals
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(modal => {
                modal.classList.remove('active');
            });
        }
        
        // Arrow keys for wizard navigation (when in wizard)
        const activeSection = document.querySelector('section.active');
        if (activeSection && activeSection.id === 'new-post') {
            if (e.key === 'ArrowRight' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                if (currentWizardStep < totalWizardSteps) {
                    goToStep(currentWizardStep + 1);
                }
            }
            if (e.key === 'ArrowLeft' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                if (currentWizardStep > 1) {
                    goToStep(currentWizardStep - 1);
                }
            }
        }
    });
}

// ============================================
// Data Management (Enhanced)
// ============================================

function saveData() {
    try {
        const compactedPosts = getStorageReadyPosts();
        localStorage.setItem('blogplanner-posts', JSON.stringify(compactedPosts));
        localStorage.setItem('blogplanner-settings', JSON.stringify(settings));
        localStorage.setItem('blogplanner-events', JSON.stringify(events));
        localStorage.setItem('blogplanner-library', JSON.stringify(savedLibrary));
    } catch (e) {
        if (isQuotaExceededError(e)) {
            try {
                const strippedPosts = getStorageReadyPosts(true);
                localStorage.setItem('blogplanner-posts', JSON.stringify(strippedPosts));
                localStorage.setItem('blogplanner-settings', JSON.stringify(settings));
                localStorage.setItem('blogplanner-events', JSON.stringify(events));
                localStorage.setItem('blogplanner-library', JSON.stringify(savedLibrary));
                showToast('Storage nearly full: saved without inline image previews.', 'error');
            } catch (inner) {
                console.error('Quota fallback failed', inner);
                showToast('Error saving data: storage is full. Consider deleting older posts.', 'error');
            }
        } else {
            showToast('Error saving data: ' + e.message, 'error');
        }
    }
}

// ============================================
// Auto-Backup Functionality
// ============================================

// ============================================
// Auto-Backup Functionality (Removed)
// ============================================

// Auto-backup removed - localStorage autosave via draft functionality is sufficient

// ============================================
// Dashboard Navigation
// ============================================

function goToDashboard() {
    switchSection('dashboard');
}


