const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../data/releases.json');

async function getIOSRelease() {
    try {
        // Apple Index API discovered via research
        const url = 'https://developer.apple.com/tutorials/data/index/ios-ipados-release-notes';
        const { data } = await axios.get(url);

        // Find the latest release in the index
        // The structure has "interfaceLanguages" -> "id" -> "children"
        // Structure is data.interfaceLanguages.swift[0].children
        const children = data.interfaceLanguages.swift[0].children;
        // Filter out group markers
        const latestArticle = children.find(child => child.type === 'article');

        if (!latestArticle) return null;

        const title = latestArticle.title;
        const status = title.includes('Beta') ? 'Beta' : (title.includes('RC') ? 'RC' : 'Official');

        return {
            platform: 'iOS',
            version: title.replace(' Release Notes', ''),
            status: status,
            date: new Date().toISOString().split('T')[0], // API doesn't have exact release date in index
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

async function getWhaleRelease() {
    try {
        // Whale Notice API discovered via research
        const url = 'https://notice.naver.com/api/v1/services/whalehomepage/notices?sectionId=199&page=1&pageSize=10';
        const { data } = await axios.get(url);

        // Correct path is data.item[0]
        const latest = data.item[0];
        const titleText = latest.title;
        const dateText = latest.regDate.split('T')[0];

        return {
            platform: 'Whale',
            version: titleText.split(' ')[0], // Extracts 'v4.35.351.13'
            status: 'Official',
            date: dateText,
            link: `https://notice.naver.com/notices/whalehomepage/${latest.id}`
        };
    } catch (error) {
        console.error('Error fetching Whale release:', error.message);
        return null;
    }
}

async function main() {
    console.log('Starting release monitor scraping...');

    const results = [];

    const ios = await getIOSRelease();
    if (ios) results.push(ios);

    const chrome = await getChromeRelease();
    if (chrome) {
        if (Array.isArray(chrome)) {
            results.push(...chrome);
        } else {
            results.push(chrome);
        }
    }

    const whale = await getWhaleRelease();
    if (whale) results.push(whale);

    const output = {
        lastUpdate: new Date().toISOString(),
        releases: results
    };

    fs.writeFileSync(DATA_PATH, JSON.stringify(output, null, 2));
    console.log('Scraping completed. Data saved to:', DATA_PATH);
}

main();
