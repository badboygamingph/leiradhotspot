import { VercelRequest, VercelResponse } from '@vercel/node';
import app from './_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // @ts-ignore
  app(req, res);
}
