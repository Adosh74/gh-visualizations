import type { Request, Response } from 'express';

import cors from 'cors';
import express from 'express';

import { serverEnv } from './config';
import { NotFound } from './errors/not-found-error';
import { errorHandler } from './middlewares/error-handler';
import { APIs } from './routes/index-route';

const app = express();

// The design runs the client as a separate origin, so CORS is not optional.
app.use(cors({ origin: serverEnv.corsOrigin }));

app.use(express.json());

app.get('/healthz', (_req: Request, res: Response) => {
  res.sendStatus(200);
});

app.use('/api/v1', APIs);

app.use((_req: Request, _res: Response, next) => {
  const error = new NotFound();
  next(error);
});

app.use(errorHandler);

export { app };
