import { config } from 'dotenv';
import { z } from 'zod';

config();

const NodeEnvEnum = z.enum(['development', 'test', 'production']);
type NodeEnvType = z.infer<typeof NodeEnvEnum>;

const envSchema = z.object({
  NODE_ENV: NodeEnvEnum.default('development'),
  PORT: z.string().transform(Number).pipe(
    z.number().int().positive(),
  ).default('3000'),
  /** Optional, but unauthenticated GitHub API calls are capped at 60 requests/hour. */
  GITHUB_TOKEN: z.string().min(1).optional(),
  /** Branch the sync prefers; falls back to the repository default when absent. */
  SYNC_BRANCH: z.string().min(1).default('develop'),
  /** How far back a full (first-time) sync reaches. */
  SYNC_LOOKBACK_DAYS: z.string().transform(Number).pipe(
    z.number().int().positive(),
  ).default('90'),
});

// eslint-disable-next-line node/no-process-env
const env = envSchema.safeParse(process.env);

if (!env.success) {
  console.error('❌ Invalid environment variables:', env.error.format());
  throw new Error('Invalid environment variables');
}

const serverEnv = {
  nodeEnv: env.data.NODE_ENV,
  port: env.data.PORT,
  githubToken: env.data.GITHUB_TOKEN,
  syncBranch: env.data.SYNC_BRANCH,
  syncLookbackDays: env.data.SYNC_LOOKBACK_DAYS,
};

export { NodeEnvType, serverEnv };
