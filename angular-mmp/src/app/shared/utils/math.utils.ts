export function averageNonZero1D(arr: unknown[]): number | null {
  if (!Array.isArray(arr)) return null;
  const values = arr.filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v !== 0);
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  const ave = sum / values.length;
  return Math.round(ave*100) / 100;
}


export function addArrays(a: number[], b: number[]): number[] {
  if (a.length !== b.length) {
    throw new Error(`Array length mismatch: a=${a.length}, b=${b.length}`);
  }
  const result = new Array<number>(a.length);
  for (let i = 0; i < a.length; i++) {
    result[i] = a[i] + b[i];
  }
  return result;
}


export function addManyArrays(...arrays: number[][]): number[] {
  if (arrays.length === 0) return [];
  const len = arrays[0].length;
  if (!arrays.every(arr => arr.length === len)) {
    throw new Error('All arrays must have the same length');
  }

  const result = new Array<number>(len).fill(0);
  for (const arr of arrays) {
    for (let i = 0; i < len; i++) {
      result[i] += arr[i];
    }
  }
  return result;
}
