// DOM Elements
const triggerBtn = document.getElementById('trigger-btn');
const modal = document.getElementById('token-modal');
const closeBtn = document.getElementById('close-modal-btn');
const saveBtn = document.getElementById('save-token-btn');
const tokenInput = document.getElementById('gh-token');

// Event Listeners
triggerBtn.addEventListener('click', () => {
    const storedToken = localStorage.getItem('gh_token');
    if (storedToken) {
        triggerWorkflow(storedToken);
    } else {
        modal.classList.remove('hidden');
    }
});

closeBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
});

saveBtn.addEventListener('click', () => {
    const token = tokenInput.value.trim();
    if (token) {
        localStorage.setItem('gh_token', token);
        modal.classList.add('hidden');
        triggerWorkflow(token);
    }
});

async function triggerWorkflow(token) {
    const REPO_OWNER = 'pm430';
    const REPO_NAME = 'release-monitor';
    const WORKFLOW_ID = 'monitor.yml';

    triggerBtn.disabled = true;
    triggerBtn.innerHTML = '<span class="icon spinner" style="width:1rem;height:1rem;border-width:2px;margin:0;"></span> Triggering...';

    try {
        const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/${WORKFLOW_ID}/dispatches`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ref: 'main'
            })
        });

        if (response.ok) {
            alert('Update started! The dashboard will reflect changes in about 1-2 minutes.');
        } else {
            const err = await response.json();
            console.error(err);
            alert(`Failed to trigger update: ${response.status} ${response.statusText}\nCheck your token permissions (need repo/workflow scope).`);
            localStorage.removeItem('gh_token'); // Clear invalid token
        }
    } catch (error) {
        console.error(error);
        alert('Network error occurred.');
    } finally {
        triggerBtn.disabled = false;
        triggerBtn.innerHTML = '<span class="icon">↻</span> Trigger Update';
    }
}

async function fetchData() {
    try {
        const response = await fetch('data/releases.json');
        const data = await response.json();
        renderDashboard(data);
    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('dashboard').innerHTML = `
            <div class="error-state">
                <p>Failed to load release data. Please check back later.</p>
            </div>
        `;
    }
}

function renderDashboard(data) {
    const dashboard = document.getElementById('dashboard');
    const lastUpdateEl = document.getElementById('last-update');

    const updateDate = new Date(data.lastUpdate);
    lastUpdateEl.textContent = `Last synced: ${updateDate.toLocaleString('ko-KR')}`;

    dashboard.innerHTML = '';

    // Group releases by platform
    const groups = data.releases.reduce((acc, release) => {
        if (!acc[release.platform]) acc[release.platform] = [];
        acc[release.platform].push(release);
        return acc;
    }, {});

    Object.values(groups).forEach(platformReleases => {
        const card = createCard(platformReleases);
        dashboard.appendChild(card);
    });
}

function createCard(releases) {
    const first = releases[0];
    const card = document.createElement('div');
    card.className = `card ${first.platform.toLowerCase()}`;

    let contentHtml = '';

    releases.forEach(release => {
        const isBeta = release.status.toLowerCase() === 'beta' || release.status.toLowerCase() === 'rc' || release.status.toLowerCase() === 'dev';
        const statusClass = isBeta ? 'status-badge beta' : 'status-badge';

        contentHtml += `
            <div class="version-row">
                <div class="version-info">${release.version}</div>
                <div class="version-meta">
                    <span class="${statusClass}">${release.status}</span>
                    <span class="release-date">Released: ${release.date}</span>
                </div>
            </div>
        `;
    });

    card.innerHTML = `
        <div class="card-header">
            <span class="platform">${first.platform}</span>
            <h2>Status Monitor</h2>
        </div>
        <div class="card-content">
            ${contentHtml}
        </div>
        <div class="card-footer">
            <a href="${first.link}" target="_blank" class="btn-link">
                View Release Notes ↗
            </a>
        </div>
    `;

    return card;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchData();
});
