const { test, expect } = require('@playwright/test');
const fs = require('fs');
const { exec } = require('child_process');

const game = 'sweet';
const HISTORY_FILE = 'performance_history.json';
const LCP_THRESHOLD = 2500; 

// --- ADVANCED REVENUE-DRIVEN REPORTER ---
function generateHtmlReport(data, path) {
    let history = [];
    try {
        if (fs.existsSync(HISTORY_FILE)) {
            const fileContent = fs.readFileSync(HISTORY_FILE, 'utf8');
            if (fileContent.trim().length > 0) history = JSON.parse(fileContent);
        }
    } catch (err) { history = []; }

    const lastRun = history.length > 0 ? history[history.length - 1] : null;
    history.push(data);
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));

    const calcDiff = (curr, prev, reverse = false) => {
        if (!prev) return '';
        const diff = (parseFloat(curr) - parseFloat(prev)).toFixed(2);
        const isBetter = reverse ? diff > 0 : diff < 0;
        return `<span style="color: ${isBetter ? '#2ecc71' : '#e74c3c'}; font-size: 11px; font-weight:bold;">(${diff > 0 ? '+' : ''}${diff})</span>`;
    };

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Performance Audit: ${game.toUpperCase()}</title>
        <style>
            body { font-family: 'Inter', system-ui, sans-serif; margin: 0; background: #f1f5f9; color: #1e293b; }
            .sidebar { width: 100%; background: #0f172a; color: white; padding: 20px; text-align: center; box-sizing: border-box; }
            .container { max-width: 1200px; margin: 20px auto; padding: 0 20px; }
            .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-bottom: 25px; }
            .card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
            .metric-box { padding: 15px; border-radius: 8px; background: #f8fafc; border-left: 5px solid #3b82f6; position: relative; }
            .label { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; }
            .val { font-size: 24px; font-weight: 800; display: block; margin: 5px 0; color: #0f172a; }
            .trend-label { font-size: 12px; font-weight: 500; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; background: white; border-radius: 8px; overflow: hidden; }
            th { text-align: left; padding: 12px; background: #f8fafc; font-size: 11px; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; }
            td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
            .tag { padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase; color: white; }
            .tag-script { background: #f59e0b; } .tag-image { background: #10b981; } .tag-media { background: #3b82f6; }
            .leak-warning { background: #fef2f2; border: 1px solid #fee2e2; color: #991b1b; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-weight: 600; }
        </style>
    </head>
    <body>
        <div class="sidebar">
            <h1 style="margin:0">🎰 ${game.toUpperCase()} Performance Optimization Dashboard</h1>
            <p style="opacity:0.7; font-size: 14px;">Real-time Performance Metrics for Dev & QA Teams</p>
        </div>
        <div class="container">
            ${(lastRun && parseFloat(data.gameMetrics.memory.used) > parseFloat(lastRun.gameMetrics.memory.used) + 10) ? 
                `<div class="leak-warning">🚨 REVENUE RISK: Significant Memory Growth detected (+${(data.gameMetrics.memory.used - lastRun.gameMetrics.memory.used).toFixed(2)} MB). Potential crash on mobile.</div>` : ''}

            <div class="grid">
                <div class="card">
                    <span class="label">Retention Score (FPS)</span>
                    <span class="val">${data.gameMetrics.fps} FPS</span>
                    <span class="trend-label">${calcDiff(data.gameMetrics.fps, lastRun?.gameMetrics.fps, true)} vs last run</span>
                </div>
                <div class="card">
                    <span class="label">Conversion Speed (LCP)</span>
                    <span class="val">${data.gameMetrics.lcp} ms</span>
                    <span class="trend-label">${calcDiff(data.gameMetrics.lcp, lastRun?.gameMetrics.lcp)} vs last run</span>
                </div>
                <div class="card">
                    <span class="label">Data Cost (Payload)</span>
                    <span class="val">${data.gameMetrics.payloadMB} MB</span>
                    <span class="trend-label">${calcDiff(data.gameMetrics.payloadMB, lastRun?.gameMetrics.payloadMB)} vs last run</span>
                </div>
                <div class="card">
                    <span class="label">Memory Load</span>
                    <span class="val">${data.gameMetrics.memory.used} MB</span>
                    <span class="trend-label">${calcDiff(data.gameMetrics.memory.used, lastRun?.gameMetrics.memory.used)} vs last run</span>
                </div>
            </div>

            <div class="grid">
                <div class="card" style="grid-column: span 2;">
                    <h3>📦 Asset Payload Distribution</h3>
                    <div style="display: flex; gap: 10px; margin-top: 15px;">
                        <div class="metric-box" style="flex:1; border-color:#f59e0b"><span class="label">Scripts</span><span class="val">${data.payloadBreakdown.js} MB</span></div>
                        <div class="metric-box" style="flex:1; border-color:#10b981"><span class="label">Textures/Images</span><span class="val">${data.payloadBreakdown.img} MB</span></div>
                        <div class="metric-box" style="flex:1; border-color:#3b82f6"><span class="label">Audio Assets</span><span class="val">${data.payloadBreakdown.media} MB</span></div>
                    </div>
                </div>
                <div class="card">
                    <h3>🏗️ UI Complexity</h3>
                    <span class="label">Total DOM Nodes</span>
                    <span class="val">${data.gameMetrics.domNodes}</span>
                </div>
            </div>

            <div class="card">
                <h3>🐢 Conversion Bottlenecks (Top 10 Slowest Assets)</h3>
                <table>
                    <thead><tr><th>Type</th><th>Asset</th><th>Load Time</th><th>Size</th></tr></thead>
                    <tbody>
                        ${data.networkStats.topSlowAssets.map(a => `
                            <tr>
                                <td><span class="tag tag-${a.type}">${a.type}</span></td>
                                <td style="font-weight:600">${a.name}</td>
                                <td style="color:${parseFloat(a.duration) > 500 ? '#e11d48' : 'inherit'}">${a.duration} ms</td>
                                <td>${a.sizeKB} KB</td>
                            </tr>`).join('')}
                    </tbody>
                </table>
            </div>

            <div class="card">
                <h3>⏱️ Historical Revenue Trend</h3>
                <table>
                    <thead><tr><th>Timestamp</th><th>FPS</th><th>LCP</th><th>Memory</th><th>Nodes</th></tr></thead>
                    <tbody>
                        ${history.slice(-8).reverse().map(run => `
                            <tr>
                                <td>${new Date(run.startTime).toLocaleTimeString()}</td>
                                <td><strong>${run.gameMetrics.fps}</strong></td>
                                <td>${run.gameMetrics.lcp} ms</td>
                                <td>${run.gameMetrics.memory.used} MB</td>
                                <td>${run.gameMetrics.domNodes}</td>
                            </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    </body>
    </html>`;
    fs.writeFileSync(path, htmlContent);
}

async function waitForStableGamePage(context) {
    const start = Date.now();
    while (Date.now() - start < 30000) {
        for (const p of context.pages()) {
            if (!p.isClosed() && await p.$('canvas')) return p;
        }
        await new Promise(r => setTimeout(r, 1000));
    }
    throw new Error('❌ Game Canvas Loading Timeout');
}

// --- MAIN TEST ---
test('Unified Casino Performance Audit with Trends', async ({ page, context }) => {
    test.setTimeout(240000);
    const auditResults = { startTime: Date.now(), gameMetrics: {}, networkStats: {}, payloadBreakdown: {} };

    try {
        await page.goto('https://games.pragmaticplaylive.net/authentication/authenticate.jsp', { waitUntil: 'networkidle' });
        await page.locator('input[name="username"]').type('abdulg', { delay: 100 });
        await page.locator('input[name="password"]').type('abdulg123', { delay: 100 });
        await page.getByRole('button', { name: 'Verify me!' }).click();

        const lobbyPromise = context.waitForEvent('page');
        await page.locator('div.buttons h1:text("DESKTOP SOLUTION")').locator('..').locator('button').click({ modifiers: ['Control'] });
        const lobbyPage = await lobbyPromise;
        await lobbyPage.bringToFront(); 
        await lobbyPage.waitForLoadState('domcontentloaded');

        await lobbyPage.getByTestId('lobby-category-search').click();
        await lobbyPage.getByTestId('input-field').click();
        await lobbyPage.getByTestId('input-field').fill(game);
        await lobbyPage.waitForSelector('[data-testid="tile-container"]', { timeout: 60000 });
        const gameTile = lobbyPage.getByTestId('tile-container').first();
        await expect(gameTile).toBeVisible({ timeout: 50000 });
        await expect(gameTile).toContainText(new RegExp(game, 'i'));
        await gameTile.click();

        const gamePage = await waitForStableGamePage(context);
        await gamePage.bringToFront();
        await gamePage.waitForTimeout(15000); 

        const metrics = await gamePage.evaluate(async () => {
            const getFPS = () => new Promise(r => {
                let f = 0; const s = performance.now();
                function c() { f++; if(performance.now()-s < 2000) requestAnimationFrame(c); else r(Math.round(f/2)); }
                c();
            });

            // NEW LCP LOGIC: Performance Observer
            const getLCP = () => new Promise((resolve) => {
                let lcpValue = 0;
                const observer = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    lcpValue = lastEntry.startTime;
                });
                observer.observe({ type: 'largest-contentful-paint', buffered: true });
                // We wait briefly to ensure the buffer is read
                setTimeout(() => {
                    observer.disconnect();
                    resolve(lcpValue.toFixed(2));
                }, 500);
            });

            const resources = performance.getEntriesByType('resource');
            const mem = performance.memory || { usedJSHeapSize: 0 };
            const getSum = (exts) => (resources.filter(r => exts.some(e => r.name.toLowerCase().includes(e))).reduce((a, b) => a + (b.transferSize || 0), 0) / (1024*1024)).toFixed(2);

            return {
                fps: await getFPS(),
                lcp: await getLCP(), // Integrated here
                payloadMB: (resources.reduce((acc, r) => acc + (r.transferSize || 0), 0) / (1024*1024)).toFixed(2),
                memory: { used: (mem.usedJSHeapSize / 1024 / 1024).toFixed(2) },
                domNodes: document.getElementsByTagName('*').length,
                breakdown: {
                    js: getSum(['.js']),
                    img: getSum(['.png', '.jpg', '.webp', '.svg', '.atlas']),
                    media: getSum(['.mp3', '.mp4', '.ogg', '.wav'])
                },
                resourceDetails: resources.map(r => ({
                    name: r.name.split('/').pop().split('?')[0] || 'asset',
                    duration: r.duration.toFixed(2),
                    sizeKB: ((r.transferSize || 0) / 1024).toFixed(2),
                    type: r.name.includes('.js') ? 'script' : (['.png','.jpg','.webp','.atlas'].some(e => r.name.includes(e)) ? 'image' : 'media')
                }))
            };
        });

        auditResults.gameMetrics = metrics;
        auditResults.payloadBreakdown = metrics.breakdown;
        auditResults.networkStats.topSlowAssets = metrics.resourceDetails.sort((a, b) => b.duration - a.duration).slice(0, 10);

        const reportPath = 'revenue_performance_audit.html';
        generateHtmlReport(auditResults, reportPath);

        console.log(`✅ Audit Complete. Insights: ${reportPath}`);
        exec(`${process.platform === 'win32' ? 'start' : 'open'} ${reportPath}`);

    } catch (error) {
        await page.screenshot({ path: `failure-${Date.now()}.png` });
        throw error;
    }
});