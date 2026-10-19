import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: '**/*.spec.js', fullyParallel: false, workers: 1,
  use: {baseURL: 'http://127.0.0.1:8102/kb-wod/', launchOptions: {executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox']}},
  webServer: {command: 'python3 -m http.server 8102 --bind 127.0.0.1 --directory ..', url: 'http://127.0.0.1:8102/kb-wod/', reuseExistingServer: false},
  projects: [{name:'mobile',use:{viewport:{width:390,height:844}}},{name:'desktop',use:{viewport:{width:1280,height:800}}}],
});
