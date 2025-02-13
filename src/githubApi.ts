import axios from 'axios';
import { GITHUB_USERNAME, GITHUB_TOKEN } from './config';

export interface RepoInfo {
    name: string;
    pushed_at: string;
    archived: boolean;
    html_url: string;
}

const axiosInstance = axios.create({
    baseURL: 'https://api.github.com',
    headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
    },
});

export async function getRepositories(): Promise<RepoInfo[]> {
    try {
        const response = await axiosInstance.get(`/users/${GITHUB_USERNAME}/repos?per_page=100`);
        return response.data;
    } catch (error) {
        console.error('Failed to fetch repositories:', error);
        return [];
    }
}

export async function archiveRepository(repoName: string): Promise<boolean> {
    try {
        await axiosInstance.patch(`/repos/${GITHUB_USERNAME}/${repoName}`, { archived: true });
        console.log(`Archived repository: ${repoName}`);
        return true;
    } catch (error) {
        console.error(`Failed to archive ${repoName}:`, error);
        return false;
    }
}

export async function unarchiveRepository(repoName: string): Promise<boolean> {
    try {
        const response = await axiosInstance.patch(`/repos/${GITHUB_USERNAME}/${repoName}`, {
            archived: false,
        });
        console.log(`Unarchived repository: ${repoName} with status: ${response.status}`);
        return true;
    } catch (error) {
        console.error(`Failed to unarchive ${repoName}:`, error);
        return false;
    }
}
