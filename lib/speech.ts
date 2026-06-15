// Parses voice input like "Japan 2 Netherlands 1" or "two one" into scores.
// Returns null if the input can't be parsed confidently.

const WORD_TO_NUM: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

function toNum(s: string): number | null {
  const n = parseInt(s, 10);
  if (!isNaN(n)) return n;
  return WORD_TO_NUM[s.toLowerCase()] ?? null;
}

export function parseSpeech(text: string): { home: number; away: number } | null {
  const tokens = text.trim().toLowerCase().split(/\s+/);
  const nums: number[] = [];

  for (const t of tokens) {
    const n = toNum(t);
    if (n !== null) nums.push(n);
  }

  if (nums.length >= 2) {
    return { home: nums[0], away: nums[1] };
  }

  // Try X-Y or X:Y format
  const dashMatch = text.match(/(\d+)\s*[-:]\s*(\d+)/);
  if (dashMatch) {
    return { home: parseInt(dashMatch[1], 10), away: parseInt(dashMatch[2], 10) };
  }

  return null;
}
