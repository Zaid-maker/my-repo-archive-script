import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface LogEntry {
  repoName: string;
  repoUrl: string;
  lastPushed: string;
  eventDate: string;
  action: 'archived' | 'unarchived';
}

export function updateLogFile(entries: LogEntry[]): void {
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
