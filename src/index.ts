import { processRepositories, ProcessOptions } from './archiveManager';
import { updateLogFile, updateJsonLogFile } from './logger';
import { sendDiscordNotification } from './notifications';

// Command-line argument parsing...
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const verbose = args.includes('--verbose');
const staleArg = args.find(arg => arg.startsWith('--stale-months='));
const customStaleMonths = staleArg ? parseInt(staleArg.split('=')[1], 10) : undefined;

const options: ProcessOptions = {
    dryRun,
    verbose,
    staleMonths: customStaleMonths,
};

async function main(): Promise<void> {
    const result = await processRepositories(options);

    if (result.logEntries.length > 0) {
        updateLogFile(result.logEntries);
        updateJsonLogFile(result.logEntries);
    } else {
        console.log('No archive/unarchive actions were performed.');
    }

    const summaryMessage = `
Repository Processing Summary:
Total repositories processed: ${result.total}
Repositories archived: ${result.archivedCount}
Repositories unarchived: ${result.unarchivedCount}
Dry-run mode: ${dryRun ? 'Enabled' : 'Disabled'}
`;

    console.log(summaryMessage);

    // Send a Discord notification with the summary
    await sendDiscordNotification(summaryMessage);
}

main().catch((error) => {
    console.error('An error occurred during repository processing:', error);
    process.exit(1);
});
