import { Octokit } from '@octokit/rest';

import { LOGGER } from '../logging';

const octokit = new Octokit();

export async function getUserRepos(username: string): Promise<any[]> {
  try {
    const response = await octokit.repos.listForUser({
      username,
      per_page: 100,
    });
    return response.data;
  }
  catch (error) {
    LOGGER.error(`Failed to fetch repositories for user ${username}:`, error);
    throw error;
  }
}
