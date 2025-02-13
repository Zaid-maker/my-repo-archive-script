import axios from 'axios';
import { DISCORD_WEBHOOK_URL } from './config';

export async function sendDiscordNotification(message: string): Promise<void> {
  if (!DISCORD_WEBHOOK_URL) {
    console.log('No Discord webhook URL configured, skipping Discord notification.');
    return;
  }
  
  const embed = {
    title: "Repository Processing Summary",
    description: message,
    color: 3447003, // Blue color in decimal (0x3498DB)
    timestamp: new Date().toISOString(),
  };

  const payload = {
    embeds: [embed],
  };

  try {
    await axios.post(DISCORD_WEBHOOK_URL, payload);
    console.log('Discord notification sent with embed.');
  } catch (error) {
    console.error('Failed to send Discord notification:', error);
  }
}
