import axios from 'axios';
import { SLACK_WEBHOOK_URL } from './config';

export async function sendSlackNotification(message: string): Promise<void> {
    if (!SLACK_WEBHOOK_URL) {
        console.log('No Slack webhook URL configured, skipping Slack notification.');
        return;
    }

    try {
        await axios.post(SLACK_WEBHOOK_URL, { text: message });
        console.log('Slack notification sent.');
    } catch (error) {
        console.error('Failed to send Slack notification:', error);
    }
}
