const axios = require('axios');

// CORS Helper
const allowCors = fn => async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization')
    if (req.method === 'OPTIONS') {
        res.status(200).end()
        return
    }
    return await fn(req, res)
}

// Scraper Functions
async function getIOSRelease() {
    try {
        const url = 'https://developer.apple.com/tutorials/data/index/ios-ipados-release-notes';
        const { data } = await axios.get(url);

        const children = data.interfaceLanguages.swift[0].children;
        const latestArticle = children.find(child => child.type === 'article');

        if (!latestArticle) return null;

        const title = latestArticle.title;
        const status = title.includes('Beta') ? 'Beta' : (title.includes('RC') ? 'RC' : 'Official');

        return {
            platform: 'iOS',
            version: title.replace(' Release Notes', ''),
            status: status,
            date: new Date().toISOString().split('T')[0], // Approximate date as API doesn't provide it directly in this view
            link: `https://developer.apple.com/documentation/ios-ipados-release-notes${latestArticle.path.replace('/documentation/ios-ipados-release-notes', '')}`
        };
    } catch (error) {
        console.error('Error fetching iOS release:', error.message);
        return null;
    }
}

async function getChromeRelease() {
    try {
        const url = 'https://chromestatus.com/api/v0/channels';
        const { data } = await axios.get(url);

        let jsonStr = data;
        if (typeof data === 'string' && data.startsWith(")]}'")) {
            jsonStr = data.substring(data.indexOf('\n'));
        }

        const channels = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;

        const getChannelData = (channel, label) => {
            const info = channels[channel];
            return {
                platform: 'Chrome',
                channel: label,
                version: `v${info.version}`,
                status: label,
                date: info.early_stable ? info.early_stable.split('T')[0] : (info.stable_date ? info.stable_date.split('T')[0] : 'N/A'),
                link: 'https://chromestatus.com/roadmap'
            };
        };

        return [
            getChannelData('stable', 'Stable'),
            getChannelData('beta', 'Beta'),
            getChannelData('dev', 'Dev')
        ];
    } catch (error) {
        console.error('Error fetching Chrome release:', error.message);
        return null;
    }
}

async function getEdgeRelease() {
    try {
        const url = 'https://edgeupdates.microsoft.com/api/products';
        const { data } = await axios.get(url);

        const channels = ['Stable', 'Beta', 'Dev'];
        const results = [];

        channels.forEach(channelName => {
            const product = data.find(p => p.Product === channelName);
            if (product && product.Releases.length > 0) {
                const releases = product.Releases.sort((a, b) => new Date(b.PublishedTime) - new Date(a.PublishedTime));
                const latest = releases[0];

                results.push({
                    platform: 'Edge',
                    version: `v${latest.ProductVersion}`,
                    status: channelName,
                    date: latest.PublishedTime.split('T')[0],
                    link: `https://learn.microsoft.com/en-us/deployedge/microsoft-edge-relnote-${channelName.toLowerCase()}-channel`
                });
            }
        });

        return results;
    } catch (error) {
        console.error('Error fetching Edge release:', error.message);
        return null;
    }
}

async function getWhaleRelease() {
    try {
        const url = 'https://notice.naver.com/api/v1/services/whalehomepage/notices?sectionId=199&page=1&pageSize=10';
        const { data } = await axios.get(url);

        const latest = data.item[0];
        const titleText = latest.title;
        const dateText = latest.regDate.split('T')[0];

        return {
            platform: 'Whale',
            version: titleText.split(' ')[0],
            status: 'Official',
            date: dateText,
            link: `https://notice.naver.com/notices/whalehomepage/${latest.id}`
        };
    } catch (error) {
        console.error('Error fetching Whale release:', error.message);
        return null;
    }
}

// In-Memory Cache (Global variable persists across warm lambda invocations)
let cachedData = null;

// Main Handler
const handler = async (req, res) => {
    // Check if this is a "Force Update" request
    const { authorization } = req.headers;
    const isForceUpdate = authorization === `Bearer ${process.env.UPDATE_SECRET}`;

    // If request attempts to Force Refresh but Token is invalid, return 401.
    if (req.headers.authorization && !isForceUpdate) {
        return res.status(401).json({ error: 'Unauthorized: Invalid Update Token' });
    }

    // VIEW MODE (No Token)
    if (!isForceUpdate) {
        if (cachedData) {
            // Return cached data
            res.setHeader('X-Cache-Status', 'HIT');
            return res.status(200).json(cachedData);
        }
        // If no cache (Cold Start), fall through to Scrape (and cache it)
    }

    // SCRAPE MODE (Force Update OR Cold Start)
    try {
        const results = [];

        const [ios, chrome, edge, whale] = await Promise.all([
            getIOSRelease(),
            getChromeRelease(),
            getEdgeRelease(),
            getWhaleRelease()
        ]);

        if (ios) results.push(ios);
        if (chrome) results.push(...(Array.isArray(chrome) ? chrome : [chrome]));
        if (edge) results.push(...(Array.isArray(edge) ? edge : [edge]));
        if (whale) results.push(whale);

        const responseData = {
            lastUpdate: new Date().toISOString(),
            releases: results
        };

        // Update In-Memory Cache
        cachedData = responseData;

        res.setHeader('X-Cache-Status', isForceUpdate ? 'REFRESHED' : 'MISS');
        res.setHeader('Cache-Control', 'max-age=60, s-maxage=60');

        res.status(200).json(responseData);
    } catch (error) {
        console.error('Scrape failed:', error);
        // If scrape fails but we have old cache, return it with warning
        if (cachedData) {
            res.setHeader('X-Cache-Status', 'STALE');
            return res.status(200).json(cachedData);
        }
        res.status(500).json({ error: 'Failed to fetch release data' });
    }
}

module.exports = allowCors(handler);
