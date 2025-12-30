# SL Blog Planner - Web App

A simple, no-code web application to plan, organize, and export Second Life blog credits.

## 🚀 Quick Start

1. Open `app/index.html` in your web browser
2. Start planning your blog posts!
3. Data is saved automatically to your browser's local storage

## ✨ Features

### Planning Workflow
- **New Post**: Organize your blog from concept to credits
- **My Posts**: View all saved blog posts with quick actions
- **Settings**: Configure your API keys (optional)

### Blog Post Form
- Post title, avatar(s), and scene description
- Concept planning (target 80% complete before building)
- Image upload for your blog photo
- Sponsor tracking
- Caption writing with formatting (Bold, Italic, Underline, Links)
- Credit tracking
- Author bio with social links

### Platform Exports
Generate formatted credits ready to copy-paste for:
- **Flickr**: Full HTML-friendly format with sponsors & credits
- **BlueSky**: 300-character limited, includes required hashtags
- **YouTube**: Description format (customize as needed)
- **Primfeed/Prim Network**: Rich text format without HTML
- **Personal Blog**: Full HTML-friendly format

### Data Management
- ✅ Auto-save to browser (no internet needed)
- 📥 Export all data as JSON backup
- 🗑️ Clear individual posts or all data
- 📋 Copy exports to clipboard
- ⬇️ Download exports as text files

## 🔧 Optional: Connect Your APIs

### JSONbin (Cloud Backup)
1. Visit [jsonbin.io](https://jsonbin.io)
2. Get your API key
3. Add it to Settings (optional - for future cloud sync)

### ImgBB (Image Hosting)
1. Visit [imgbb.com](https://imgbb.com)
2. Get your API key
3. Add it to Settings (optional - for hosting images externally)

> Note: Current version uses local storage. API integration coming soon!

## 📁 File Structure

```
app/
├── index.html    # Main app interface
├── style.css     # Beautiful dark theme styling
└── app.js        # Full app functionality
```

## 🎨 Design

- 2-column layout with left sidebar navigation
- Top navigation bar with status messages
- Dark theme (optimized for long editing sessions)
- Mobile-responsive design
- Smooth transitions and hover effects

## 💡 How to Use

### Create a Blog Post
1. Click "➕ New Post"
2. Fill in your planning details
3. Upload your blog image
4. Add sponsors
5. Write your caption (use formatting buttons)
6. Add credits
7. Fill in your author bio
8. Click "💾 Save Post"

### Export for Social Media
1. Click "👁️ Preview Exports"
2. Switch between platform tabs
3. Copy to clipboard or download
4. Paste into your platform of choice

### Manage Posts
1. Click "📋 My Posts"
2. Hover over a post card
3. Edit, delete, or export individual posts

## 🎯 Next Steps (Phase 7-8)

- [ ] JSONbin cloud backup integration
- [ ] ImgBB image hosting integration
- [ ] Automatic platform-specific character counting
- [ ] Post templates/presets
- [ ] Batch export feature

## 📝 Notes

- All data saved locally in your browser
- No account or login required
- Works offline (except optional cloud features)
- Clear browser data to reset (or use "Clear All Data" in settings)

---

**Happy blogging!** 💚 #SecondLife #SLBlogger
