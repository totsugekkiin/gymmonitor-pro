/** 兼容 D,A,R 及可选 W,T,E（固件 telem 行） */
const DATA_REGEX =
  /D:(-?\d+),A:(-?\d+(?:\.\d+)?),R:(\d+)(?:,W:(\d+))?(?:,T:(\d+))?(?:,E:(\d+))?/;

export type ParsedTelemetry = {
  depth: number;
  angle: number;
  rep: number;
  warn: boolean;
  deviceT: number;
  repEvent: boolean;
};

export function parseTelemetry(raw: string): ParsedTelemetry | null {
  const match = raw.match(DATA_REGEX);
  if (!match) return null;
  return {
    depth: parseInt(match[1], 10),
    angle: parseFloat(match[2]),
    rep: parseInt(match[3], 10),
    warn: match[4] === '1',
    deviceT: match[5] != null ? parseInt(match[5], 10) : 0,
    repEvent: match[6] === '1',
  };
}
