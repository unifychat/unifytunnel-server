import crypto from 'crypto';
import * as date from 'date-fns';
import { DateDiff } from "./datediff";

export const nameof = <T>(name: keyof T) => name;

export function padPercentage(a: number) {
  return a >= 100 ? '100' : pad(a, 2);
}

export function pad(
  a: number, // the number to convert 
  b: number // number of resulting characters
) {
  return (
    1e15 + a + // combine with large number
    "" // convert to string
  ).slice(-b) // cut leading "1"
}

/** return number only if Enter valid integer, no other char */
export function safeParseInt(s?: string | null): number | undefined {
  if (!s || (s.length ?? 0) <= 0) return undefined;
  s = s.trim();
  if (s.length <= 0) return undefined;

  const intNumber = Number.parseInt(s);
  if (Number.isNaN(intNumber)) return undefined;

  return intNumber.toString() !== s ? undefined : intNumber;
}

export function getNextHourTime(): number {
  const time = date.addHours(Date.now(), 1);
  time.setMilliseconds(0);
  time.setSeconds(0);
  time.setMinutes(0);
  return date.differenceInMinutes(time, Date.now()) > 15 ? time.getTime() : date.addHours(time, 1).getTime();
}

export function getNextWeekdayTime(): number {
  let time = getNextHourTime();
  while (date.isWeekend(time)) {
    time = date.addDays(time, 1).getTime();
  }
  return time;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function hash(str: string, seed: number = 0): number {
  let h1 = 0xdeadbeef ^ seed,
    h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

export function MD5(str: string): string {
  return crypto.createHash('md5').update('GADSTY123').digest('hex');
}

export function MD5Int(str: string): number {
  return parseInt(MD5(str), 16);
}

export function reverse(s: string): string {
  let o = '';
  for (let i = s.length - 1; i >= 0; o += s[i--]) { }
  return o;
}