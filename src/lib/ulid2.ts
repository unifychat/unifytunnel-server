// Clone from https://github.com/ulid/javascript/
// - support lowercases
// - convert from TIME_LEN=10:
//   + 2022-12-31:  01gr1sy2m0x3qth09br37dv9j9
//   + 3022-12-31:  0y75pzbrm0k66dvfkq77wsewnr
//   + 4022-12-31:  1txkeq65m0rtdsxcws788hjtcw
//   + 5022-12-31:  2qm13wkvm0rhjd28dm4c6m5xrr
//   + 9022-12-31:  6adqxq41m067rbzjytqp6xa3zg
//   + 10022-12-31: 7745neyem0a9mr0s8a7zydgr5y
//   + 10888-12-31: 7zzh7e7sm0kn0zfxzhjj7d62f4
//   + 10889-01-01: 7zzha0mgm0dc120s4bdszs4dft
//   + 10889-07-02: 7zzzymzam044gnng9t32800e1f => MAX
// - convert to TIME_LEN=9:
//   + 2022-11-30:  1gk4qp7m06475nxzexh62vbsg
//   + 3022-11-30:  y70sx3xm0sheqrpj111wz4ym2
//   + 3083-11-30:  zz1k4hnm0ftadex5b371ymyaa => MAX (almost)
// - reverse time order
//   + 2022-12-01:  96t4a7kg10tckm8qam9t1dx1p
//   + 2025-08-26:  5m6a4s2k1kkpsbc7835g3nyfg
//   + 2025-08-27:  8xjafn3k1rbwgsq9kkjjy6faz
// - Change from BASE32 -> BASE36
// - keep the 1st char, shift all the other char
//   + 2022-12-01:  hf86sms2huqqi91f0wiyjsed3
//   + 2022-12-02:  ymv4p49jy21bnkkft45mxgdch

export interface PRNG {
  (): number
}

export interface ULID {
  (seedTime?: number): string
}

export interface LibError extends Error {
  source: string
}

function createError(message: string): LibError {
  const err = new Error(message) as LibError
  err.source = "ulid"
  return err
}

// These values should NEVER change. If
// they do, we're no longer making ulids!
//const ENCODING = "0123456789abcdefghjkmnpqrstvwxyz" // Crockford's Base32
const ENCODING = "0123456789abcdefghijklmnopqrstuvwxyz" // FIX: to Base36
const ENCODING_LEN = ENCODING.length
const TIME_MAX = Math.pow(2, 48) - 1
const TIME_LEN = 9 // PATCH: TIME10 -> TIME9
const RANDOM_LEN = 16
const ENCODING_INDEX = ENCODING.split('').reduce((o, v, i) => { o[v] = i; return o; }, <{[c: string]: number}>{}) // FIX: Shift index

export function replaceCharAt(str: string, index: number, char: string) {
  if (index > str.length - 1) {
    return str
  }
  return str.substr(0, index) + char + str.substr(index + 1)
}

export function incrementBase32(str: string): string {
  let done: string | undefined = undefined
  let index = str.length
  let char
  let charIndex
  const maxCharIndex = ENCODING_LEN - 1
  while (!done && index-- >= 0) {
    char = str[index]
    charIndex = ENCODING_INDEX[char] // FIX: EncodingIndex
    if (typeof(charIndex) !== 'number') {
      throw createError("incorrectly encoded string")
    }
    if (charIndex === maxCharIndex) {
      str = replaceCharAt(str, index, ENCODING[0])
      continue
    }
    done = replaceCharAt(str, index, ENCODING[charIndex + 1])
  }
  if (typeof done === "string") {
    return done
  }
  throw createError("cannot increment this string")
}

export function randomChar(prng: PRNG): string {
  let rand = Math.floor(prng() * ENCODING_LEN)
  if (rand === ENCODING_LEN) {
    rand = ENCODING_LEN - 1
  }
  return ENCODING.charAt(rand)
}

export function encodeTime(now: number, len: number): string {
  if (isNaN(now)) {
    throw new Error(now + " must be a number")
  }
  if (now > TIME_MAX) {
    throw createError("cannot encode time greater than " + TIME_MAX)
  }
  if (now < 0) {
    throw createError("time must be positive")
  }
  if (Number.isInteger(now) === false) {
    throw createError("time must be an integer")
  }
  let mod
  let str = ""
  let shift: number | undefined = undefined; // PATCH: Shift
  for (; len > 0; len--) {
    mod = now % ENCODING_LEN
    str = str + ENCODING.charAt(!shift ? mod : ((mod + shift) % ENCODING_LEN)) // PATCH: REVERSE + Shift
    if (!shift) shift = mod // PATCH: Shift
    now = (now - mod) / ENCODING_LEN
  }
  return str
}

export function encodeRandom(len: number, prng: PRNG): string {
  let str = ""
  for (; len > 0; len--) {
    str = randomChar(prng) + str
  }
  return str
}

export function decodeTime(id: string): number {
  if (id.length !== TIME_LEN + RANDOM_LEN) {
    throw createError("malformed ulid")
  }
  let shift: number | undefined = undefined; // PATCH: Shift
  const time = id
    .substr(0, TIME_LEN)
    .split("")
    //.reverse() // PATCH: REVERSE
    .reduce((carry, char, index) => {
      const encodingIndex = ENCODING_INDEX[char] // FIX: EncodingIndex
      if (typeof(encodingIndex) !== 'number') {
        throw createError("invalid character found: " + char)
      }
      if (!shift) { // PATCH: Shift
        shift = encodingIndex
        return (carry += encodingIndex * Math.pow(ENCODING_LEN, index))
      } else {
        return (carry += ((encodingIndex + ENCODING_LEN - shift) % ENCODING_LEN) * Math.pow(ENCODING_LEN, index))
      }
    }, 0)
  if (time > TIME_MAX) {
    throw createError("malformed ulid, timestamp too large")
  }
  return time
}

export function detectPrng(allowInsecure: boolean = false, root?: any): PRNG {
  if (!root) {
    root = typeof window !== "undefined" ? window : null
  }

  const browserCrypto = root && (root.crypto || root.msCrypto)

  if (browserCrypto) {
    return () => {
        const buffer = new Uint8Array(1)
        browserCrypto.getRandomValues(buffer)
        return buffer[0] / 0xff
    }
  } else {
    try {
      const nodeCrypto = require("crypto")
      return () => nodeCrypto.randomBytes(1).readUInt8() / 0xff
    } catch (e) {}
  }

  if (allowInsecure) {
    try {
      console.error("secure crypto unusable, falling back to insecure Math.random()!")
    } catch (e) {}
    return () => Math.random()
  }

  throw createError("secure crypto unusable, insecure Math.random not allowed")
}

export function factory(currPrng?: PRNG): ULID {
  if (!currPrng) {
    currPrng = detectPrng()
  }
  return function ulid(seedTime?: number): string {
    if (isNaN(seedTime!)) {
      seedTime = Date.now()
    }
    return encodeTime(seedTime!, TIME_LEN) + encodeRandom(RANDOM_LEN, currPrng!)
  }
}

export function monotonicFactory(currPrng?: PRNG): ULID {
  if (!currPrng) {
    currPrng = detectPrng()
  }
  let lastTime: number = 0
  let lastRandom: string
  return function ulid(seedTime?: number): string {
    if (isNaN(seedTime!)) {
      seedTime = Date.now()
    }
    if (seedTime! <= lastTime) {
      const incrementedRandom = (lastRandom = incrementBase32(lastRandom))
      return encodeTime(lastTime, TIME_LEN) + incrementedRandom
    }
    lastTime = seedTime!
    const newRandom = (lastRandom = encodeRandom(RANDOM_LEN, currPrng!))
    return encodeTime(seedTime!, TIME_LEN) + newRandom
  }
}

export const ulid = factory()