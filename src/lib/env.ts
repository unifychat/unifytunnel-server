// for details see https://github.com/motdotla/dotenv/
// ./blob/master/examples/typescript/
import { resolve } from 'path';
import { config } from 'dotenv';
import * as os from 'os';

export const VERSION = '1.0.0';
if (!process.env.VERSION) {
  process.env.VERSION = VERSION;
}

export const HOSTNAME = os.hostname();

config({ path: resolve(__dirname, '../../.env') });

export enum Environment {
  production = 'production',
  development = 'development',
  migrations = 'migrations',
  test = 'test',
}

export enum Hosting {
  local = 'local',
  dev = 'dev',
  prd = 'prd',
}

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = Environment.development;
}

if (!process.env.HOSTING) {
  process.env.HOSTING = Hosting.local;
}