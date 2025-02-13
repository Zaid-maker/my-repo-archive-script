import { processRepositories } from './archiveManager';
import { updateLogFile } from './logger';

async function main(): Promise<void> {
  const result = await processRepositories();

  if (result.logEntries.length > 0) {
    updateLogFile(result.logEntries);
  } else {
    console.log('No archive/unarchive actions were performed.');
  }

  console.log('----------------------------------------');
  console.log(`Total repositories processed: ${result.total}`);
  console.log(`Repositories archived: ${result.archivedCount}`);
  console.log(`Repositories unarchived: ${result.unarchivedCount}`);
  console.log('Repository monitoring process completed.');
}

main().catch((error) => {
  console.error('An error occurred during repository processing:', error);
  process.exit(1);
});
