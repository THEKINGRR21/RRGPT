const { chromium } = require('c:/Users/RISHI RAMAN/Desktop/RRGpt/node_modules/playwright-core');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Set viewport size
  await page.setViewportSize({ width: 1280, height: 800 });
  
  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000');
  
  // Wait for React to mount and transitions to complete
  await page.waitForTimeout(3000);
  
  const screenshotPath = path.join(
    'C:\\Users\\RISHI RAMAN\\.gemini\\antigravity\\brain\\cae94b82-96a8-49ec-915e-866778a13a3a',
    'phase1_empty_shell.png'
  );
  
  console.log('Capturing screenshot...');
  await page.screenshot({ path: screenshotPath });
  console.log('Screenshot saved to:', screenshotPath);
  
  await browser.close();
})();
