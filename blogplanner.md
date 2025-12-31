# SL Blog Planner

I want to build another web app for planning and organizing my Second Life blog posts so I can easily export the credits I need to submit them.

---

## Blogging Workflow

- Plan: Think of an idea for a post, including the avatar(s) to be used and the scene.
  - I want to get to the point where planning results in an 80%+ complete concept. It is fine to rearrange decor while shooting, but I do not want to start with a vague idea.
- Build: Put together any sets or builds needed to complete the shot.
  - I tend to get really critical of myself here. I like realistic scenes to feel filled-in and real. I like fun/cartoon/action scenes to feel dynamic and bold. I want this to take less time.
- Shoot: Take the photo or video.
  - I get hung up on taking a good shot. Immersing myself in more real-world examples might help. Open to suggestions.
- Edit: Edit the image.
  - My editing process depends on how I shoot and the result I want. I use GShade or the SL viewer (Firestorm), then color-correct in Darktable. For heavier edits (effects, cleanup) I use Photopea. I save a PSD and export PNG.
- Share: Post blog photo and credits.
  - I want to enter my own credits, but platforms have requirements:
    - Flickr: HTML friendly. No character limit AFAIK.
    - Bluesky: 300 character limit. Required hashtags: #SecondLife #SLFurry.
    - YouTube (vlogs only): Need a good description template.
    - Primfeed/Prim Network: Same as Flickr template but without HTML. No character limit AFAIK.
    - Personal Blog (Tumblr): HTML is ok. No character limit AFAIK.

Notes: If there are ways to optimize this workflow, I am all ears.

---

## Credit Formats

Each platform formats captions differently. These are examples of what I do now. I want to collect the right information so the final export has everything I need to copy and paste.

### Flickr

Subject: 😊 [Relevant Title] 😊

Caption:
| Sponsors 💚
✦ Store Name - Item Name (Event if applicable)
✦ Store Name - Item Name
✦ Store Name - Item Name
|

❣ [Written Caption]

|
Credits ✨
✦ Store Name - Item Name (Event if applicable)
✦ Store Name - Item Name
✦ Store Name - Item Name
|

`html
<b>GRAVES GHOSTLY</b> 🐺💚 <a href="https://gravesghostly.blog/">Blog</a> ✦ <a href="https://bsky.app/profile/gravesghostly.blog">Bluesky</a> ✦ <a href="https://www.youtube.com/@gravesghostly">Youtube</a>
`

### Bluesky

😊 [Short Title] ✦

✦ [Short Caption]

| Sponsors 💚 [Link to Flickr post]
✦ Store Name - Item Name (Event if applicable)
✦ Store Name - Item Name
✦ Store Name - Item Name
| #SecondLife #SLFurry

### YouTube

I need suggestions on a good YouTube description.

### Primfeed/Prim Network

Same as the Flickr template but without HTML formatting.

### Blog

Same as the Flickr template. HTML/embed friendly.

---

## Site Design

- Organized two-column layout with a left sidebar and top navigation.
- Form needs simple formatting options: Bold / Italic / Underline / Hyperlink at minimum so exports keep the formatting.