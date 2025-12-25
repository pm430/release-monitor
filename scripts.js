// DOM Elements
const triggerBtn = document.getElementById('trigger-btn');
const modal = document.getElementById('token-modal');
const closeBtn = document.getElementById('close-modal-btn');
const saveBtn = document.getElementById('save-token-btn');
const tokenInput = document.getElementById('gh-token');

// Event Listeners
triggerBtn.addEventListener('click', () => {
    console.log('Trigger button clicked');
    // Check if we have a stored token
    const storedToken = localStorage.getItem('update_secret');
    if (storedToken) {
        console.log('Found stored token, fetching...');
        fetchData(true, storedToken);
    } else {
        console.log('No token found, showing modal...');
        modal.classList.remove('hidden');
    }
});

closeBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
});

saveBtn.addEventListener('click', () => {
    const token = tokenInput.value.trim();
    if (token) {
        localStorage.setItem('update_secret', token);
        modal.classList.add('hidden');
        fetchData(true, token);
    }
});

async function fetchData(forceRefresh = false, token = null) {
    try {
        if (forceRefresh) {
            triggerBtn.disabled = true;
            triggerBtn.innerHTML = '<span class="icon spinner" style="width:1rem;height:1rem;border-width:2px;margin:0;"></span> Updating...';
        }

        const url = forceRefresh ? `/api/release?t=${Date.now()}` : '/api/release';
        const headers = {};

        if (forceRefresh && token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, { headers });

        if (!response.ok) {
            if (response.status === 401) {
                // Invalid token
                localStorage.removeItem('update_secret'); // Clear bad token
                alert('Invalid Token. Please try again.');
                if (forceRefresh) modal.classList.remove('hidden'); // Re-open modal
            }
            throw new Error(`Server returned ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        renderDashboard(data);

        if (forceRefresh) {
            triggerBtn.disabled = false;
            triggerBtn.innerHTML = '<span class="icon">↻</span> Trigger Update';
        }
    } catch (error) {
        console.error('Error loading data:', error);
        // Only show error state if initial load fails
        if (!forceRefresh) {
            document.getElementById('dashboard').innerHTML = `
                <div class="error-state">
                    <p>Failed to load release data. Please check back later.</p>
                    <p class="subtitle">${error.message}</p>
                </div>
            `;
        } else {
            alert(`Update Failed: ${error.message}`);
            triggerBtn.disabled = false;
            triggerBtn.innerHTML = '<span class="icon">↻</span> Check Update';
        }
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
