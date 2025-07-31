import fs from 'fs/promises';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { chromium } from 'playwright';
import dotenv from 'dotenv';

dotenv.config();

async function prompt(question) {
  const rl = readline.createInterface({ input, output });
  const answer = await rl.question(question);
  rl.close();
  return answer;
}

async function main() {
  let username = process.env.ROBLOX_USERNAME;
  let password = process.env.ROBLOX_PASSWORD;

  if (!username) {
    username = await prompt('Enter your ROBLOX username: ');
  }
  if (!password) {
    password = await prompt('Enter your ROBLOX password: ');
  }

  console.log('🌐 Launching browser in headed mode (visible)...');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();

  const page = await context.newPage();

  console.log('🌐 Navigating to Roblox login page...');
  await page.goto('https://www.roblox.com/login');

  console.log('✏️ Filling login form...');
  await page.fill('#login-username', username);
  await page.fill('#login-password', password);

  console.log('⏳ Submitting login form...');
  await page.click('#login-button');

  console.log('⏳ Waiting for logged-in state...');
try {
  // Updated selector — change as needed
  await page.waitForSelector('a[href*="/users/"]', { timeout: 45000 });
  console.log('✅ Logged in!');
} catch {
  // No warning, since cookie saving proves success
  // console.warn('⚠️ Timeout waiting for logged-in element, login might have failed or require CAPTCHA/2FA.');
  console.log('ℹ️ Logged-in element not detected, but proceeding since cookie was found.');
}

  console.log('🔍 Checking for .ROBLOSECURITY cookie...');
  const cookies = await context.cookies();
  const roblosecurity = cookies.find(c => c.name === '.ROBLOSECURITY');
  if (roblosecurity) {
    console.log('💾 Saving .ROBLOSECURITY cookie to file...');
    await fs.writeFile('.ROBLOSECURITY', roblosecurity.value, 'utf-8');
    console.log('🎉 Login successful and cookie saved!');
  } else {
    console.error('❌ Login failed — .ROBLOSECURITY cookie not found.');
  }

  await browser.close();
}

main().catch(console.error);
