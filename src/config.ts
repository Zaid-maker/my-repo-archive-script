import dotenv from 'dotenv';

// Load .env file only if credentials are not already provided (e.g. via GitHub Actions)
if (!process.env.MY_GITHUB_USERNAME || !process.env.MY_GITHUB_TOKEN) {
  dotenv.config();
}

export const GITHUB_USERNAME = process.env.MY_GITHUB_USERNAME;
export const GITHUB_TOKEN = process.env.MY_GITHUB_TOKEN;
export const STALE_MONTHS = process.env.STALE_MONTHS ? parseInt(process.env.STALE_MONTHS, 10) : 2;

if (!GITHUB_USERNAME || !GITHUB_TOKEN) {
  console.error('Please set MY_GITHUB_USERNAME and MY_GITHUB_TOKEN in the environment or in a .env file.');
  process.exit(1);
}
