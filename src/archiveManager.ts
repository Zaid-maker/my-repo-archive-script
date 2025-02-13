import type { RepoInfo } from './githubApi';
import { getRepositories, archiveRepository, unarchiveRepository } from './githubApi';
import { STALE_MONTHS } from './config';
import type { LogEntry } from './logger';

export interface ProcessOptions {
    dryRun?: boolean;
    staleMonths?: number;
    verbose?: boolean;
}

export interface ProcessResult {
    total: number;
    archivedCount: number;
    unarchivedCount: number;
    logEntries: LogEntry[];
}

function isStale(pushedAt: string, staleMonths: number): boolean {
    const pushedDate = new Date(pushedAt);
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - staleMonths);
    return pushedDate < cutoffDate;
}

export async function processRepositories(options?: ProcessOptions): Promise<ProcessResult> {
    const { dryRun = false, staleMonths = STALE_MONTHS, verbose = false } = options || {};
    const repos: RepoInfo[] = await getRepositories();
    const logEntries: LogEntry[] = [];
    const nowDate = new Date().toLocaleDateString();

    let archivedCount = 0;
    let unarchivedCount = 0;

    for (const repo of repos) {
        if (verbose) {
            console.log(`Processing repository: ${repo.name}`);
        }
        if (!repo.archived && isStale(repo.pushed_at, staleMonths)) {
            if (dryRun) {
                console.log(`[Dry Run] Would archive repository: ${repo.name}`);
                logEntries.push({
                    repoName: repo.name,
                    repoUrl: repo.html_url,
                    lastPushed: repo.pushed_at,
                    eventDate: nowDate,
                    action: 'archived',
                });
                archivedCount++;
            } else {
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
        } else if (repo.archived && !isStale(repo.pushed_at, staleMonths)) {
            if (dryRun) {
                console.log(`[Dry Run] Would unarchive repository: ${repo.name}`);
                logEntries.push({
                    repoName: repo.name,
                    repoUrl: repo.html_url,
                    lastPushed: repo.pushed_at,
                    eventDate: nowDate,
                    action: 'unarchived',
                });
                unarchivedCount++;
            } else {
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
    }

    return { total: repos.length, archivedCount, unarchivedCount, logEntries };
}
