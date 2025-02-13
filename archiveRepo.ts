import axios from 'axios';
import dotenv from 'dotenv';
import { writeFileSync } from 'fs';

dotenv.config();

const GITHUB_USERNAME = process.env.GITHUB_USERNAME;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_API_URL = 'https://api.github.com';

if (!GITHUB_USERNAME || !GITHUB_TOKEN) {
    console.error('Please set GITHUB_USERNAME and GITHUB_TOKEN in the .env file.');
    process.exit(1);
}

const axiosInstance = axios.create({
    baseURL: GITHUB_API_URL,
    headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
    },
});

interface RepoInfo {
    name: string;
    pushed_at: string;
    archived: boolean;
}

interface LogEntry {
    repoName: string;
    lastPushed: string;
    eventDate: string;
    action: 'archived' | 'unarchived';
}

const logEntries: LogEntry[] = [];

async function getRepositories(): Promise<RepoInfo[]> {
    try {
        const response = await axiosInstance.get(`/users/${GITHUB_USERNAME}/repos?per_page=100`);
        return response.data;
    } catch (error) {
        console.error('Failed to fetch repositories:', error);
        return [];
    }
}

async function archiveRepository(repoName: string): Promise<boolean> {
    try {
        await axiosInstance.patch(`/repos/${GITHUB_USERNAME}/${repoName}`, {
            archived: true
        });
        console.log(`Archived repository: ${repoName}`);
        return true;
    } catch (error) {
        console.error(`Failed to archive ${repoName}:`, error);
        return false;
    }
}

async function unarchiveRepository(repoName: string): Promise<boolean> {
    try {
        await axiosInstance.patch(`/repos/${GITHUB_USERNAME}/${repoName}`, {
            archived: false
        });
        console.log(`Unarchived repository: ${repoName}`);
        return true;
    } catch (error) {
        console.error(`Failed to unarchive ${repoName}:`, error);
        return false;
    }
}

/**
 * Determines if a repository is considered "stale" (i.e. inactive for 2 months).
 * If the last push is older than 2 months, returns true.
 */
function isStale(pushedAt: string): boolean {
    const pushedDate = new Date(pushedAt);
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 2);
    return pushedDate < cutoffDate;
}

/**
 * Updates a markdown file (ARCHIVED_REPOS.md) with the log of archive/unarchive events.
 */
function updateReadme(entries: LogEntry[]) {
    const header = `# Repository Archive/Unarchive Log\n\n`;
    const description = `This log records repositories that were archived due to inactivity or unarchived because they received recent updates.\n\n`;
    const tableHeader = `| Repository | Last Pushed | Event Date | Action |\n|------------|-------------|------------|--------|\n`;
    const tableRows = entries
        .map(entry => `| ${entry.repoName} | ${new Date(entry.lastPushed).toLocaleDateString()} | ${entry.eventDate} | ${entry.action} |`)
        .join('\n');
    const content = header + description + tableHeader + tableRows + '\n';

    try {
        writeFileSync('ARCHIVED_REPOS.md', content, 'utf8');
        console.log('Updated ARCHIVED_REPOS.md with the latest repository status log.');
    } catch (error) {
        console.error('Failed to update ARCHIVED_REPOS.md:', error);
    }
}

async function main() {
    const repos = await getRepositories();
    const nowDate = new Date().toLocaleDateString();

    for (const repo of repos) {
        // For non-archived repositories, check if they are stale and need to be archived.
        if (!repo.archived && isStale(repo.pushed_at)) {
            console.log(`Archiving inactive repository: ${repo.name}`);
            const success = await archiveRepository(repo.name);
            if (success) {
                logEntries.push({
                    repoName: repo.name,
                    lastPushed: repo.pushed_at,
                    eventDate: nowDate,
                    action: 'archived'
                });
            }
        }
        // For archived repositories, check if they have received updates.
        else if (repo.archived && !isStale(repo.pushed_at)) {
            console.log(`Unarchiving repository (recent updates detected): ${repo.name}`);
            const success = await unarchiveRepository(repo.name);
            if (success) {
                logEntries.push({
                    repoName: repo.name,
                    lastPushed: repo.pushed_at,
                    eventDate: nowDate,
                    action: 'unarchived'
                });
            }
        }
    }

    if (logEntries.length > 0) {
        updateReadme(logEntries);
    } else {
        console.log('No archive/unarchive actions were performed.');
    }

    console.log('Repository monitoring process completed.');
}

main();
