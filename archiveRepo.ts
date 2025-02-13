import axios from 'axios';
import dotenv from 'dotenv';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Load .env file when running locally (GitHub Actions will set env vars externally)
if (!process.env.MY_GITHUB_USERNAME || !process.env.MY_GITHUB_TOKEN) {
    dotenv.config();
}

// Use custom variable names for credentials
const USERNAME = process.env.MY_GITHUB_USERNAME;
const TOKEN = process.env.MY_GITHUB_TOKEN;

// Use a configurable stale period (in months) with default of 2 months.
const STALE_MONTHS = process.env.STALE_MONTHS ? parseInt(process.env.STALE_MONTHS, 10) : 2;

if (!USERNAME || !TOKEN) {
    console.error('Please set MY_GITHUB_USERNAME and MY_GITHUB_TOKEN in the environment or in a .env file.');
    process.exit(1);
}

const GITHUB_API_URL = 'https://api.github.com';

const axiosInstance = axios.create({
    baseURL: GITHUB_API_URL,
    headers: {
        'Authorization': `token ${TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
    },
});

interface RepoInfo {
    name: string;
    pushed_at: string;
    archived: boolean;
    html_url: string;
}

interface LogEntry {
    repoName: string;
    repoUrl: string;
    lastPushed: string;
    eventDate: string;
    action: 'archived' | 'unarchived';
}

const logEntries: LogEntry[] = [];

/**
 * Fetches all repositories for the specified user.
 */
async function getRepositories(): Promise<RepoInfo[]> {
    try {
        const response = await axiosInstance.get(`/users/${USERNAME}/repos?per_page=100`);
        return response.data;
    } catch (error) {
        console.error('Failed to fetch repositories:', error);
        return [];
    }
}

/**
 * Archives a repository.
 */
async function archiveRepository(repoName: string): Promise<boolean> {
    try {
        await axiosInstance.patch(`/repos/${USERNAME}/${repoName}`, {
            archived: true,
        });
        console.log(`Archived repository: ${repoName}`);
        return true;
    } catch (error) {
        console.error(`Failed to archive ${repoName}:`, error);
        return false;
    }
}

/**
 * Unarchives a repository.
 */
async function unarchiveRepository(repoName: string): Promise<boolean> {
    try {
        await axiosInstance.patch(`/repos/${USERNAME}/${repoName}`, {
            archived: false,
        });
        console.log(`Unarchived repository: ${repoName}`);
        return true;
    } catch (error) {
        console.error(`Failed to unarchive ${repoName}:`, error);
        return false;
    }
}

/**
 * Determines if a repository is stale based on the pushed_at date.
 * A repo is considered stale if it hasn't been updated in the last STALE_MONTHS.
 */
function isStale(pushedAt: string): boolean {
    const pushedDate = new Date(pushedAt);
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - STALE_MONTHS);
    return pushedDate < cutoffDate;
}

/**
 * Updates (or creates) a Markdown log file with archive/unarchive events.
 * The log is appended to, preserving previous entries.
 */
function updateLogFile(entries: LogEntry[]) {
    const logFilePath = join(process.cwd(), 'ARCHIVED_REPOS.md');
    let header = '';
    let existingContent = '';

    if (!existsSync(logFilePath)) {
        header =
            `# Repository Archive/Unarchive Log\n\n` +
            `This log records repositories that were archived due to inactivity or unarchived because they received recent updates.\n\n` +
            `| Repository | Last Pushed | Event Date | Action |\n` +
            `|------------|-------------|------------|--------|\n`;
    } else {
        existingContent = readFileSync(logFilePath, 'utf8');
    }

    const newEntriesMarkdown = entries
        .map(
            entry =>
                `| [${entry.repoName}](${entry.repoUrl}) | ${new Date(entry.lastPushed).toLocaleDateString()} | ${entry.eventDate} | ${entry.action} |`
        )
        .join('\n');

    const content = header + existingContent + newEntriesMarkdown + '\n';
    writeFileSync(logFilePath, content, 'utf8');
    console.log('Updated ARCHIVED_REPOS.md with the latest log entries.');
}

/**
 * Main function to process repositories:
 * - Archive stale (inactive) repositories.
 * - Unarchive repositories that are active (updated recently).
 */
async function main() {
    const repos = await getRepositories();
    const nowDate = new Date().toLocaleDateString();

    let archivedCount = 0;
    let unarchivedCount = 0;

    for (const repo of repos) {
        // Archive repos that are active (not archived) and stale.
        if (!repo.archived && isStale(repo.pushed_at)) {
            console.log(`Archiving inactive repository: ${repo.name}`);
            const success = await archiveRepository(repo.name);
            if (success) {
                archivedCount++;
                logEntries.push({
                    repoName: repo.name,
                    repoUrl: repo.html_url,
                    lastPushed: repo.pushed_at,
                    eventDate: nowDate,
                    action: 'archived',
                });
            }
        }
        // Unarchive repos that are archived but have received recent updates.
        else if (repo.archived && !isStale(repo.pushed_at)) {
            console.log(`Unarchiving repository (recent updates detected): ${repo.name}`);
            const success = await unarchiveRepository(repo.name);
            if (success) {
                unarchivedCount++;
                logEntries.push({
                    repoName: repo.name,
                    repoUrl: repo.html_url,
                    lastPushed: repo.pushed_at,
                    eventDate: nowDate,
                    action: 'unarchived',
                });
            }
        }
    }

    if (logEntries.length > 0) {
        updateLogFile(logEntries);
    } else {
        console.log('No archive/unarchive actions were performed.');
    }

    console.log('----------------------------------------');
    console.log(`Total repositories processed: ${repos.length}`);
    console.log(`Repositories archived: ${archivedCount}`);
    console.log(`Repositories unarchived: ${unarchivedCount}`);
    console.log('Repository monitoring process completed.');
}

main();
