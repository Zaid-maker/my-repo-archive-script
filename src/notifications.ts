import axios from 'axios';
import { DISCORD_WEBHOOK_URL } from './config';

export async function sendDiscordNotification(message: string): Promise<void> {
  if (!DISCORD_WEBHOOK_URL) {
    console.log('No Discord webhook URL configured, skipping Discord notification.');
    return;
  }
  
  try {
    await axios.post(DISCORD_WEBHOOK_URL, { content: message });
    console.log('Discord notification sent.');
  } catch (error) {
    console.error('Failed to send Discord notification:', error);
  }
}
