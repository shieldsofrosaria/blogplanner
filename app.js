// Blog Planner Application

class BlogPlanner {
    constructor() {
        this.posts = this.loadFromStorage('posts') || [];
        this.currentPostId = null;
        this.editingPostId = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderPosts();
        this.setDefaultDate();
    }

    setupEventListeners() {
        // Modal controls
        document.getElementById('addPostBtn').addEventListener('click', () => this.openPostModal());
        document.getElementById('cancelPostBtn').addEventListener('click', () => this.closePostModal());
        document.getElementById('savePostBtn').addEventListener('click', () => this.savePost());
        document.querySelector('.close').addEventListener('click', () => this.closePostModal());
        
        // Close modal on outside click
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('postModal');
            if (e.target === modal) {
                this.closePostModal();
            }
        });

        // Credits management
        document.getElementById('addCreditBtn').addEventListener('click', () => this.addCredit());
        
        // Export buttons
        document.getElementById('exportTextBtn').addEventListener('click', () => this.exportAsText());
        document.getElementById('exportHtmlBtn').addEventListener('click', () => this.exportAsHtml());
        document.getElementById('copyCreditsBtn').addEventListener('click', () => this.copyToClipboard());

        // Enter key in credit form
        ['creditBrand', 'creditItem', 'creditUrl'].forEach(id => {
            document.getElementById(id).addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addCredit();
                }
            });
        });
    }

    // Storage Management
    saveToStorage(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    loadFromStorage(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    }

    // Post Management
    openPostModal(postId = null) {
        const modal = document.getElementById('postModal');
        const modalTitle = document.getElementById('modalTitle');
        
        if (postId) {
            this.editingPostId = postId;
            const post = this.posts.find(p => p.id === postId);
            modalTitle.textContent = 'Edit Post';
            document.getElementById('postTitle').value = post.title;
            document.getElementById('postDate').value = post.date;
            document.getElementById('postNotes').value = post.notes;
        } else {
            this.editingPostId = null;
            modalTitle.textContent = 'Create New Post';
            document.getElementById('postTitle').value = '';
            document.getElementById('postDate').value = new Date().toISOString().split('T')[0];
            document.getElementById('postNotes').value = '';
        }
        
        modal.style.display = 'block';
        document.getElementById('postTitle').focus();
    }

    closePostModal() {
        document.getElementById('postModal').style.display = 'none';
        this.editingPostId = null;
    }

    savePost() {
        const title = document.getElementById('postTitle').value.trim();
        const date = document.getElementById('postDate').value;
        const notes = document.getElementById('postNotes').value.trim();

        if (!title) {
            alert('Please enter a post title');
            return;
        }

        if (this.editingPostId) {
            // Edit existing post
            const post = this.posts.find(p => p.id === this.editingPostId);
            post.title = title;
            post.date = date;
            post.notes = notes;
        } else {
            // Create new post
            const newPost = {
                id: Date.now().toString(),
                title,
                date,
                notes,
                credits: []
            };
            this.posts.unshift(newPost);
        }

        this.saveToStorage('posts', this.posts);
        this.renderPosts();
        this.closePostModal();

        // Select the post if it's new
        if (!this.editingPostId) {
            this.selectPost(this.posts[0].id);
        }
    }

    deletePost(postId) {
        if (confirm('Are you sure you want to delete this post? This will also delete all associated credits.')) {
            this.posts = this.posts.filter(p => p.id !== postId);
            this.saveToStorage('posts', this.posts);
            
            if (this.currentPostId === postId) {
                this.currentPostId = null;
                document.getElementById('creditsArea').style.display = 'none';
                document.getElementById('currentPostTitle').textContent = 'Select a post to manage credits';
            }
            
            this.renderPosts();
        }
    }

    selectPost(postId) {
        this.currentPostId = postId;
        this.renderPosts();
        this.renderCredits();
        document.getElementById('creditsArea').style.display = 'block';
        
        const post = this.posts.find(p => p.id === postId);
        document.getElementById('currentPostTitle').textContent = `📝 ${post.title}`;
        
        // Clear export output
        document.getElementById('exportOutput').value = '';
    }

    renderPosts() {
        const postsList = document.getElementById('postsList');
        
        if (this.posts.length === 0) {
            postsList.innerHTML = `
                <div class="empty-state">
                    <p>No blog posts yet. Click "New Post" to get started!</p>
                </div>
            `;
            return;
        }

        postsList.innerHTML = this.posts.map(post => `
            <div class="post-card ${post.id === this.currentPostId ? 'active' : ''}" data-id="${post.id}">
                <div class="post-card-header">
                    <div>
                        <h3>${this.escapeHtml(post.title)}</h3>
                        <div class="post-card-date">📅 ${this.formatDate(post.date)}</div>
                    </div>
                </div>
                ${post.notes ? `<div class="post-card-notes">${this.escapeHtml(post.notes)}</div>` : ''}
                <div class="post-card-credits">
                    ${post.credits.length} credit${post.credits.length !== 1 ? 's' : ''}
                </div>
                <div class="post-card-actions">
                    <button class="btn btn-secondary" onclick="blogPlanner.openPostModal('${post.id}')">Edit</button>
                    <button class="btn btn-danger" onclick="blogPlanner.deletePost('${post.id}')">Delete</button>
                </div>
            </div>
        `).join('');

        // Add click handlers to post cards
        document.querySelectorAll('.post-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't select if clicking on buttons
                if (e.target.tagName === 'BUTTON') return;
                this.selectPost(card.dataset.id);
            });
        });
    }

    // Credits Management
    addCredit() {
        if (!this.currentPostId) {
            alert('Please select a post first');
            return;
        }

        const type = document.getElementById('creditType').value;
        const brand = document.getElementById('creditBrand').value.trim();
        const item = document.getElementById('creditItem').value.trim();
        const url = document.getElementById('creditUrl').value.trim();

        if (!brand || !item) {
            alert('Please enter both brand/creator and item name');
            return;
        }

        const post = this.posts.find(p => p.id === this.currentPostId);
        const newCredit = {
            id: Date.now().toString(),
            type,
            brand,
            item,
            url
        };

        post.credits.push(newCredit);
        this.saveToStorage('posts', this.posts);
        
        // Clear form
        document.getElementById('creditBrand').value = '';
        document.getElementById('creditItem').value = '';
        document.getElementById('creditUrl').value = '';
        document.getElementById('creditBrand').focus();

        this.renderCredits();
        this.renderPosts();
        
        // Clear export output when credits change
        document.getElementById('exportOutput').value = '';
    }

    deleteCredit(creditId) {
        if (!this.currentPostId) return;

        const post = this.posts.find(p => p.id === this.currentPostId);
        post.credits = post.credits.filter(c => c.id !== creditId);
        
        this.saveToStorage('posts', this.posts);
        this.renderCredits();
        this.renderPosts();
        
        // Clear export output when credits change
        document.getElementById('exportOutput').value = '';
    }

    renderCredits() {
        const creditsList = document.getElementById('creditsList');
        
        if (!this.currentPostId) {
            creditsList.innerHTML = '';
            return;
        }

        const post = this.posts.find(p => p.id === this.currentPostId);
        
        if (post.credits.length === 0) {
            creditsList.innerHTML = `
                <div class="empty-state">
                    <p>No credits added yet. Start adding credits above!</p>
                </div>
            `;
            return;
        }

        creditsList.innerHTML = post.credits.map(credit => `
            <div class="credit-item">
                <div class="credit-info">
                    <div class="credit-type">${this.escapeHtml(credit.type)}</div>
                    <div class="credit-brand">${this.escapeHtml(credit.brand)}</div>
                    <div class="credit-item-name">${this.escapeHtml(credit.item)}</div>
                    ${credit.url ? `<div class="credit-url"><a href="${this.escapeHtml(credit.url)}" target="_blank">🔗 View</a></div>` : ''}
                </div>
                <button class="btn btn-danger" onclick="blogPlanner.deleteCredit('${credit.id}')">Delete</button>
            </div>
        `).join('');
    }

    // Export Functions
    exportAsText() {
        if (!this.currentPostId) {
            alert('Please select a post first');
            return;
        }

        const post = this.posts.find(p => p.id === this.currentPostId);
        
        if (post.credits.length === 0) {
            alert('No credits to export');
            return;
        }

        // Group credits by type
        const groupedCredits = {};
        post.credits.forEach(credit => {
            if (!groupedCredits[credit.type]) {
                groupedCredits[credit.type] = [];
            }
            groupedCredits[credit.type].push(credit);
        });

        let output = `CREDITS FOR: ${post.title}\n`;
        output += `${'='.repeat(50)}\n\n`;

        Object.keys(groupedCredits).sort().forEach(type => {
            output += `${type.toUpperCase()}:\n`;
            groupedCredits[type].forEach(credit => {
                output += `  • ${credit.brand} - ${credit.item}`;
                if (credit.url) {
                    output += ` (${credit.url})`;
                }
                output += '\n';
            });
            output += '\n';
        });

        document.getElementById('exportOutput').value = output;
    }

    exportAsHtml() {
        if (!this.currentPostId) {
            alert('Please select a post first');
            return;
        }

        const post = this.posts.find(p => p.id === this.currentPostId);
        
        if (post.credits.length === 0) {
            alert('No credits to export');
            return;
        }

        // Group credits by type
        const groupedCredits = {};
        post.credits.forEach(credit => {
            if (!groupedCredits[credit.type]) {
                groupedCredits[credit.type] = [];
            }
            groupedCredits[credit.type].push(credit);
        });

        let output = `<h3>Credits for: ${this.escapeHtml(post.title)}</h3>\n\n`;

        Object.keys(groupedCredits).sort().forEach(type => {
            output += `<p><strong>${this.escapeHtml(type)}:</strong></p>\n`;
            output += `<ul>\n`;
            groupedCredits[type].forEach(credit => {
                output += `  <li>`;
                if (credit.url) {
                    output += `<a href="${this.escapeHtml(credit.url)}" target="_blank">${this.escapeHtml(credit.brand)} - ${this.escapeHtml(credit.item)}</a>`;
                } else {
                    output += `${this.escapeHtml(credit.brand)} - ${this.escapeHtml(credit.item)}`;
                }
                output += `</li>\n`;
            });
            output += `</ul>\n\n`;
        });

        document.getElementById('exportOutput').value = output;
    }

    async copyToClipboard() {
        const exportOutput = document.getElementById('exportOutput');
        
        if (!exportOutput.value) {
            alert('Please export credits first (click "Export as Text" or "Export as HTML")');
            return;
        }

        try {
            // Use modern Clipboard API
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(exportOutput.value);
            } else {
                // Fallback for older browsers
                exportOutput.select();
                document.execCommand('copy');
            }
            
            // Visual feedback
            const btn = document.getElementById('copyCreditsBtn');
            const originalText = btn.textContent;
            btn.textContent = '✓ Copied!';
            btn.style.backgroundColor = '#10b981';
            
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.backgroundColor = '';
            }, 2000);
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
            alert('Failed to copy to clipboard. Please try selecting and copying manually.');
        }
    }

    // Utility Functions
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('postDate').value = today;
    }
}

// Initialize the app
const blogPlanner = new BlogPlanner();
