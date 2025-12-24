# release-monitor 🚀

A premium client environment release monitoring dashboard for senior developers.

![Dashboard Preview](/Users/jsoh/.gemini/antigravity/brain/35a056f4-cbba-4e2f-9959-70ce23b55642/chrome_multi_version_check_1766589805877.png)

## Features
- **Automated Tracking**: Monitors iOS, Chrome (Stable/Beta/Dev), and Whale Browser updates.
- **Internal API Integration**: Uses official/internal APIs for 100% data reliability.
- **Glassmorphism UI**: High-end, modern design with smooth animations.
- **Zero Maintenance**: GitHub Actions automatically updates the data every 6 hours.

## Local Setup
1. Clone the repository.
2. Run the scraper (optional):
   ```bash
   cd scraper
   npm install
   node index.js
   ```
3. Start a local server:
   ```bash
   # From root directory
   npx serve .
   ```

## Deployment
This project is designed for **GitHub Pages**.
1. Push to your repository named `release-monitor`.
2. Ensure `.github/workflows/monitor.yml` has write permissions enabled in GitHub Actions settings.
3. GitHub Pages will serve the `index.html` and the dynamic `data/releases.json`.

---
*Created with ❤️ for Senior Web Developers.*
