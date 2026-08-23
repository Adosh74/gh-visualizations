import { beforeEach, describe, expect, it, vi } from 'vitest';

import { addRepository, ApiError, deleteRepository, listRepositories } from './client';

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

describe('api client', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('unwraps the success envelope', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ status: 'success', data: { repositories: [], total: 0 } }),
    );

    await expect(listRepositories()).resolves.toEqual({ repositories: [], total: 0 });
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/repositories', expect.anything());
  });

  it('raises the server message and status from an error body', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ errors: [{ message: 'already tracked', field: 'name' }] }, 400),
    );

    await expect(addRepository({ owner: 'a', name: 'b' })).rejects.toMatchObject({
      message: 'already tracked',
      status: 400,
      field: 'name',
    });
  });

  it('falls back to a status message when the body carries no errors', async () => {
    fetchMock.mockResolvedValue(jsonResponse(null, 500));

    await expect(listRepositories()).rejects.toMatchObject({ status: 500 });
  });

  it('reports an unreachable server rather than throwing a raw fetch error', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const error = await listRepositories().catch((err: ApiError) => err);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toContain('Could not reach');
    expect((error as ApiError).status).toBe(0);
  });

  it('handles a 204 with no body', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 204 } as Response);

    await expect(deleteRepository('repo-1')).resolves.toBeUndefined();
  });

  it('posts the body it was given', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status: 'success', data: { repository: {} } }, 201));

    await addRepository({ url: 'https://github.com/o/r' });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/repositories',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ url: 'https://github.com/o/r' }),
      }),
    );
  });
});
