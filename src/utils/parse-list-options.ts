import type { Request } from 'express';

import type { ListOptions } from '../datastore/DAOs/commit-dao';

import { BadRequest } from '../errors/bad-request-error';

function parsePositiveInt(value: unknown, field: string, min: number): number | undefined {
  if (value === undefined)
    return undefined;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min)
    throw new BadRequest(`${field} must be an integer of at least ${min}`, field);

  return parsed;
}

/** Reads `?limit=` and `?offset=` off a request, rejecting anything nonsensical. */
export function parseListOptions(req: Request): ListOptions {
  return {
    limit: parsePositiveInt(req.query.limit, 'limit', 1),
    offset: parsePositiveInt(req.query.offset, 'offset', 0),
  };
}

export function parseDays(req: Request, fallback: number): number {
  const parsed = parsePositiveInt(req.query.days, 'days', 1);
  if (parsed === undefined)
    return fallback;

  if (parsed > 365)
    throw new BadRequest('days must be 365 or fewer', 'days');

  return parsed;
}
