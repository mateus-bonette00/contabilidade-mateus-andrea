import { Pool } from 'pg';
import { env } from '../config/env';

export const pool = new Pool({
  host: env.database.host,
  port: env.database.port,
  user: env.database.user,
  password: env.database.password,
  database: env.database.name,
});
