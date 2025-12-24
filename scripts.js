document.addEventListener('DOMContentLoaded', () => {
    fetchData();
});

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
