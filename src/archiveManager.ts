import type { RepoInfo } from './githubApi';
import { getRepositories, archiveRepository, unarchiveRepository } from './githubApi';
import { STALE_MONTHS } from './config';
import type { LogEntry } from './logger';

function isStale(pushedAt: string, staleMonths: number): boolean {
    const pushedDate = new Date(pushedAt);
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - staleMonths);
    return pushedDate < cutoffDate;
}

export interface ProcessResult {
    total: number;
    archivedCount: number;
    unarchivedCount: number;
    logEntries: LogEntry[];
}

export async function processRepositories(): Promise<ProcessResult> {
    const repos: RepoInfo[] = await getRepositories();
    const logEntries: LogEntry[] = [];
    const nowDate = new Date().toLocaleDateString();

    let archivedCount = 0;
    let unarchivedCount = 0;

    for (const repo of repos) {
        // Archive repos that are active (not archived) and stale.
        if (!repo.archived && isStale(repo.pushed_at, STALE_MONTHS)) {
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
        // Unarchive repos that are archived but have recent updates.
        else if (repo.archived && !isStale(repo.pushed_at, STALE_MONTHS)) {
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

    return { total: repos.length, archivedCount, unarchivedCount, logEntries };
}
