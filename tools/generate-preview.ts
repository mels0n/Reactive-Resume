
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
// import { findChrome } from './utils/find-chrome'; // We might need to implement this or just hardcode common paths

// Common Chrome paths on Windows/Mac/Linux
const CHROME_PATHS = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser'
];

const getExecutablePath = () => {
    for (const p of CHROME_PATHS) {
        if (fs.existsSync(p)) return p;
    }
    throw new Error('Could not find Google Chrome installation. Please install Chrome or specify path.');
};

const main = async () => {
    const templateName = process.argv[2] || 'arceus';
    const artboardUrl = 'http://localhost:6173/artboard/preview';
    const samplePath = path.resolve(process.cwd(), 'sample_arceus.json');
    const outputPath = path.resolve(process.cwd(), `apps/client/public/templates/jpg/${templateName}.jpg`);

    if (!fs.existsSync(samplePath)) {
        console.error(`Sample data not found at ${samplePath}`);
        process.exit(1);
    }

    const sampleData = JSON.parse(fs.readFileSync(samplePath, 'utf-8'));

    // Override template name in metadata if needed
    if (sampleData.metadata) {
        sampleData.metadata.template = templateName;
    }

    console.log(`Generating preview for ${templateName}...`);

    let browser;
    try {
        browser = await puppeteer.launch({
            executablePath: getExecutablePath(),
            headless: true,
            defaultViewport: {
                width: 1200, // Reasonable width for preview
                height: 1600,
            }
        });

        const page = await browser.newPage();

        // 1. Navigate to the page
        console.log(`Navigating to ${artboardUrl}...`);
        await page.goto(artboardUrl, { waitUntil: 'networkidle0' });

        // 2. Inject data into localStorage
        console.log('Injecting sample data...');
        await page.evaluate((data) => {
            localStorage.setItem('resume', JSON.stringify(data));
        }, sampleData);

        // 3. Reload to apply data
        await page.reload({ waitUntil: 'networkidle0' });

        // 4. Wait for a moment to ensure rendering is settled (fonts, images)
        await new Promise(r => setTimeout(r, 2000));

        // 5. Take screenshot
        console.log(`Saving screenshot to ${outputPath}...`);

        // Ensure directory exists
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // We can capture the specific element if we want, or the viewport.
        // The artboard usually centers the resume. 
        // Let's try to find the resume container or just screenshot the viewport.
        // Adjusting viewport to match typical resume aspect ratio or just full page.

        await page.setViewport({ width: 800, height: 1131 }); // A4 ish ratio

        // Fix for TS2769: Capture buffer and write manually
        const buffer = await page.screenshot({
            type: 'jpeg',
            quality: 90,
            fullPage: true
        });

        fs.writeFileSync(outputPath, buffer);

        console.log('Done!');

    } catch (error) {
        console.error('Error generating preview:', error);
    } finally {
        if (browser) await browser.close();
    }
};

main();
