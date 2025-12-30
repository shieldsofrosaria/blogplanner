// Blog Planner App - Main JavaScript

// ============================================
// State & Storage Management
// ============================================

let posts = [];
let settings = {
    authorBio: '',
    jsonbinKey: '',
    imgbbKey: ''
};
let currentPost = null;
let currentPlatform = 'flickr';
let inspirationImages = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupEventListeners();
    updatePostsList();
    displayAuthorBio();
    showStatus('Blog Planner loaded!');
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

    // Export Tab Switching
    document.querySelectorAll('.export-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            switchExportTab(e.target.dataset.platform);
        });
    });

    // Update sponsor mentions when sponsors list changes
    const sponsorsList = document.getElementById('sponsors-list');
    if (sponsorsList) {
        sponsorsList.addEventListener('change', updateSponsorMentions);
        sponsorsList.addEventListener('input', updateSponsorMentions);
    }
}

// ============================================
// Section Navigation
// ============================================

function switchSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
    
    // Remove active class from all nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    // Show selected section
    document.getElementById(sectionId).classList.add('active');
    
    // Mark button as active
    document.querySelector(`[data-section="${sectionId}"]`).classList.add('active');
    
    // Refresh data if needed
    if (sectionId === 'my-posts') {
        updatePostsList();
    }
}

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

function addSponsor() {
    const sponsorsList = document.getElementById('sponsors-list');
    const item = document.createElement('div');
    item.className = 'credit-item';
    item.innerHTML = `
        <input type="text" placeholder="Creator/Store" class="sponsor-store">
        <input type="text" placeholder="Item Name" class="sponsor-item">
        <input type="text" placeholder="Event Name (optional)" class="sponsor-event">
        <input type="text" placeholder="Event Details (link, dates)" class="sponsor-details">
        <input type="text" placeholder="@handle (optional)" class="sponsor-handle" style="font-size: 12px;">
        <button type="button" class="btn-remove" onclick="removeCredit(this)">✕</button>
    `;
    sponsorsList.appendChild(item);
    updateSponsorMentions();
}

function addCredit() {
    const creditsList = document.getElementById('credits-list');
    const item = document.createElement('div');
    item.className = 'credit-item';
    item.innerHTML = `
        <input type="text" placeholder="Creator/Store" class="credit-store">
        <input type="text" placeholder="Item Name" class="credit-item">
        <input type="text" placeholder="Event Name (optional)" class="credit-event">
        <input type="text" placeholder="Event Details (link, dates)" class="credit-details">
        <button type="button" class="btn-remove" onclick="removeCredit(this)">✕</button>
    `;
    creditsList.appendChild(item);
}

function removeCredit(btn) {
    btn.parentElement.remove();
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

// ============================================
// Post Management
// ============================================

function getFormData() {
    // Get sponsors
    const sponsors = Array.from(document.querySelectorAll('#sponsors-list .credit-item')).map(item => {
        const store = item.querySelector('.sponsor-store').value;
        const itemName = item.querySelector('.sponsor-item').value;
        const event = item.querySelector('.sponsor-event').value;
        const details = item.querySelector('.sponsor-details').value;
        const handle = item.querySelector('.sponsor-handle').value;
        return store && itemName ? { store, itemName, event, details, handle } : null;
    }).filter(Boolean);

    // Get credits
    const credits = Array.from(document.querySelectorAll('#credits-list .credit-item')).map(item => {
        const store = item.querySelector('.credit-store').value;
        const itemName = item.querySelector('.credit-item').value;
        const event = item.querySelector('.credit-event').value;
        const details = item.querySelector('.credit-details').value;
        return store && itemName ? { store, itemName, event, details } : null;
    }).filter(Boolean);

    return {
        id: Date.now(),
        title: document.getElementById('post-title').value,
        avatar: document.getElementById('post-avatar').value,
        scene: document.getElementById('post-scene').value,
        concept: document.getElementById('post-concept').value,
        inspirationImages: inspirationImages,
        image: document.getElementById('blog-image').value,
        imageData: document.getElementById('image-preview').querySelector('img')?.src,
        sponsors: sponsors,
        caption: document.getElementById('post-caption').value,
        blueskyLink: document.getElementById('bluesky-link').value,
        credits: credits,
        createdAt: new Date().toLocaleString()
    };
}

function savePost() {
    const postData = getFormData();
    
    if (!postData.title || !postData.caption || postData.sponsors.length === 0 || postData.credits.length === 0) {
        showStatus('❌ Please fill in all required fields', 'error');
        return;
    }
    
    posts.push(postData);
    saveData();
    showStatus('✅ Post saved successfully!');
    clearForm();
}

function clearForm() {
    document.getElementById('post-title').value = '';
    document.getElementById('post-avatar').value = '';
    document.getElementById('post-scene').value = '';
    document.getElementById('post-concept').value = '';
    document.getElementById('blog-image').value = '';
    document.getElementById('inspiration-images').value = '';
    document.getElementById('post-caption').value = '';
    document.getElementById('bluesky-link').value = '';
    inspirationImages = [];
    
    // Reset sponsors
    document.getElementById('sponsors-list').innerHTML = `
        <div class="credit-item">
            <input type="text" placeholder="Creator/Store" class="sponsor-store">
            <input type="text" placeholder="Item Name" class="sponsor-item">
            <input type="text" placeholder="Event Name (optional)" class="sponsor-event">
            <input type="text" placeholder="Event Details (link, dates)" class="sponsor-details">
            <input type="text" placeholder="@handle (optional)" class="sponsor-handle" style="font-size: 12px;">
            <button type="button" class="btn-remove" onclick="removeCredit(this)">✕</button>
        </div>
    `;
    
    // Reset credits
    document.getElementById('credits-list').innerHTML = `
        <div class="credit-item">
            <input type="text" placeholder="Creator/Store" class="credit-store">
            <input type="text" placeholder="Item Name" class="credit-item">
            <input type="text" placeholder="Event Name (optional)" class="credit-event">
            <input type="text" placeholder="Event Details (link, dates)" class="credit-details">
            <button type="button" class="btn-remove" onclick="removeCredit(this)">✕</button>
        </div>
    `;
    
    document.getElementById('image-preview').innerHTML = '';
    document.getElementById('inspiration-gallery').innerHTML = '';
    document.getElementById('sponsor-mentions').value = '';
    updateSponsorMentions();
}

// ============================================
// Image Upload
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const imageInput = document.getElementById('blog-image');
    if (imageInput) {
        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const preview = document.getElementById('image-preview');
                    preview.innerHTML = `<img src="${event.target.result}" alt="Blog image preview">`;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Inspiration images handler
    const inspirationInput = document.getElementById('inspiration-images');
    if (inspirationInput) {
        inspirationInput.addEventListener('change', (e) => {
            const files = e.target.files;
            inspirationImages = [];
            const gallery = document.getElementById('inspiration-gallery');
            gallery.innerHTML = '';
            
            Array.from(files).forEach((file, index) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    inspirationImages.push(event.target.result);
                    const item = document.createElement('div');
                    item.className = 'inspiration-item';
                    item.innerHTML = `
                        <img src="${event.target.result}" alt="Inspiration ${index + 1}">
                        <button type="button" class="remove-inspiration" onclick="removeInspirationImage(${index})">✕</button>
                    `;
                    gallery.appendChild(item);
                };
                reader.readAsDataURL(file);
            });
        });
    }
});

function removeInspirationImage(index) {
    inspirationImages.splice(index, 1);
    document.getElementById('inspiration-images').value = '';
    document.getElementById('inspiration-gallery').innerHTML = inspirationImages.map((img, i) => `
        <div class="inspiration-item">
            <img src="${img}" alt="Inspiration ${i + 1}">
            <button type="button" class="remove-inspiration" onclick="removeInspirationImage(${i})">✕</button>
        </div>
    `).join('');
}

// ============================================
// Export Functions
// ============================================

function updateSponsorMentions() {
    const sponsors = Array.from(document.querySelectorAll('#sponsors-list .credit-item')).map(item => {
        return item.querySelector('.sponsor-handle').value;
    }).filter(Boolean);
    
    const mentionsText = sponsors.join(' ');
    document.getElementById('sponsor-mentions').value = mentionsText || '(No sponsors with @ handles added yet)';
}

function copySponsorMentions() {
    const mentions = document.getElementById('sponsor-mentions').value;
    if (mentions.includes('No sponsors')) {
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
    switchExportTab('flickr');
    document.getElementById('export-modal').classList.add('active');
}

function switchExportTab(platform) {
    currentPlatform = platform;
    
    // Update active tab
    document.querySelectorAll('.export-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-platform="${platform}"]`).classList.add('active');
    
    // Generate export text
    const exportText = generateExport(platform, currentPost);
    document.getElementById('export-text').value = exportText;
}

function generateExport(platform, post) {
    if (!post) return '';
    
    const sponsors = formatCreditsForExport(post.sponsors);
    const credits = formatCreditsForExport(post.credits);
    const bio = settings.authorBio || '[Your Bio - set in Settings]';
    
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
    return `Subject: 😊 ${post.title} 😊

Caption:
| Sponsors 💚
${sponsors}
|

${post.caption}

| Credits ✨
${credits}
|

${bio}`;
}

function generateBlueskyExport(post, sponsors, credits) {
    // 300 char limit - need to be concise
    const title = post.title.substring(0, 50);
    const caption = post.caption.substring(0, 100);
    const link = post.blueskyLink ? `\n\n| Sponsors 💚 ${post.blueskyLink}` : '';
    
    return `😊 ${title} ✦

✦ ${caption}${link}

#SecondLife #SLFurry`;
}

function generateYoutubeExport(post, sponsors, credits, bio) {
    return `${post.title}

${post.caption}

Sponsors 💚
${sponsors}

Credits ✨
${credits}

${bio}`;
}

function generatePrimfeedExport(post, sponsors, credits, bio) {
    // Same as Flickr but without HTML
    return `Subject: 😊 ${post.title} 😊

Caption:
| Sponsors 💚
${sponsors}
|

${post.caption}

| Credits ✨
${credits}
|

${bio}`;
}

function generateBlogExport(post, sponsors, credits, bio) {
    // Same as Flickr with HTML support
    return `Subject: 😊 ${post.title} 😊

Caption:
| Sponsors 💚
${sponsors}
|

${post.caption}

| Credits ✨
${credits}
|

${bio}`;
}

function copyExport() {
    const text = document.getElementById('export-text').value;
    navigator.clipboard.writeText(text).then(() => {
        showStatus('📋 Copied to clipboard!');
    });
}

function downloadExport() {
    const text = document.getElementById('export-text').value;
    const filename = `export-${currentPost.title}-${currentPlatform}.txt`;
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showStatus('⬇️ File downloaded!');
}

function closeModal() {
    document.getElementById('export-modal').classList.remove('active');
}

// ============================================
// Posts List Management
// ============================================

function updatePostsList() {
    const postsList = document.getElementById('posts-list');
    
    if (posts.length === 0) {
        postsList.innerHTML = '<p class="empty-state">No posts yet. Create your first one!</p>';
        return;
    }
    
    postsList.innerHTML = posts.map(post => `
        <div class="post-card">
            ${post.imageData ? `<img src="${post.imageData}" class="post-card-image" alt="${post.title}">` : '<div class="post-card-image" style="display:flex;align-items:center;justify-content:center;color:var(--text-secondary);">No Image</div>'}
            <div class="post-card-content">
                <div class="post-card-title">${post.title}</div>
                <div class="post-card-meta">${post.createdAt}</div>
                <div class="post-card-actions">
                    <button onclick="editPost(${post.id})">✏️ Edit</button>
                    <button onclick="deletePost(${post.id})">🗑️ Delete</button>
                    <button onclick="sharePost(${post.id})">📤 Export</button>
                </div>
            </div>
        </div>
    `).join('');
}

function editPost(id) {
    const post = posts.find(p => p.id === id);
    if (!post) return;
    
    // Load post data into form
    document.getElementById('post-title').value = post.title;
    document.getElementById('post-avatar').value = post.avatar;
    document.getElementById('post-scene').value = post.scene;
    document.getElementById('post-concept').value = post.concept;
    document.getElementById('post-caption').value = post.caption;
    document.getElementById('bluesky-link').value = post.blueskyLink || '';
    
    if (post.imageData) {
        document.getElementById('image-preview').innerHTML = `<img src="${post.imageData}" alt="Blog image">`;
    }

    // Load inspiration images
    if (post.inspirationImages && post.inspirationImages.length > 0) {
        inspirationImages = post.inspirationImages;
        document.getElementById('inspiration-gallery').innerHTML = post.inspirationImages.map((img, i) => `
            <div class="inspiration-item">
                <img src="${img}" alt="Inspiration ${i + 1}">
                <button type="button" class="remove-inspiration" onclick="removeInspirationImage(${i})">✕</button>
            </div>
        `).join('');
    }
    
    // Sponsors
    const sponsorsList = document.getElementById('sponsors-list');
    sponsorsList.innerHTML = post.sponsors.map(s => `
        <div class="credit-item">
            <input type="text" placeholder="Creator/Store" class="sponsor-store" value="${s.store}">
            <input type="text" placeholder="Item Name" class="sponsor-item" value="${s.itemName}">
            <input type="text" placeholder="Event Name (optional)" class="sponsor-event" value="${s.event || ''}">
            <input type="text" placeholder="Event Details (link, dates)" class="sponsor-details" value="${s.details || ''}">
            <input type="text" placeholder="@handle (optional)" class="sponsor-handle" style="font-size: 12px;" value="${s.handle || ''}">
            <button type="button" class="btn-remove" onclick="removeCredit(this)">✕</button>
        </div>
    `).join('');
    
    updateSponsorMentions();
    
    // Credits
    const creditsList = document.getElementById('credits-list');
    creditsList.innerHTML = post.credits.map(c => `
        <div class="credit-item">
            <input type="text" placeholder="Creator/Store" class="credit-store" value="${c.store}">
            <input type="text" placeholder="Item Name" class="credit-item" value="${c.itemName}">
            <input type="text" placeholder="Event Name (optional)" class="credit-event" value="${c.event || ''}">
            <input type="text" placeholder="Event Details (link, dates)" class="credit-details" value="${c.details || ''}">
            <button type="button" class="btn-remove" onclick="removeCredit(this)">✕</button>
        </div>
    `).join('');
    
    // Remove old post and switch to editor
    posts = posts.filter(p => p.id !== id);
    switchSection('new-post');
    showStatus('📝 Post loaded for editing');
}

function deletePost(id) {
    if (confirm('Are you sure you want to delete this post?')) {
        posts = posts.filter(p => p.id !== id);
        saveData();
        updatePostsList();
        showStatus('🗑️ Post deleted');
    }
}

function sharePost(id) {
    const post = posts.find(p => p.id === id);
    if (!post) return;
    
    currentPost = post;
    switchExportTab('flickr');
    document.getElementById('export-modal').classList.add('active');
}

// ============================================
// Settings Management
// ============================================

function displayAuthorBio() {
    const bioDisplay = document.getElementById('bio-display');
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
    
    localStorage.setItem('blogplanner-settings', JSON.stringify(settings));
    displayAuthorBio();
    showStatus('✅ Settings saved!');
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

function clearAllData() {
    if (confirm('⚠️ This will delete ALL posts and settings. Are you sure?')) {
        posts = [];
        settings = { jsonbinKey: '', imgbbKey: '' };
        saveData();
        document.getElementById('posts-list').innerHTML = '<p class="empty-state">No posts yet.</p>';
        showStatus('🗑️ All data cleared');
    }
}

// ============================================
// Data Persistence
// ============================================

function saveData() {
    localStorage.setItem('blogplanner-posts', JSON.stringify(posts));
    localStorage.setItem('blogplanner-settings', JSON.stringify(settings));
}

function loadData() {
    const savedPosts = localStorage.getItem('blogplanner-posts');
    const savedSettings = localStorage.getItem('blogplanner-settings');
    
    if (savedPosts) {
        posts = JSON.parse(savedPosts);
    }
    
    if (savedSettings) {
        settings = JSON.parse(savedSettings);
        document.getElementById('author-bio').value = settings.authorBio || '';
        document.getElementById('jsonbin-key').value = settings.jsonbinKey || '';
        document.getElementById('imgbb-key').value = settings.imgbbKey || '';
    }
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
