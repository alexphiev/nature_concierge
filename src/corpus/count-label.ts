export function countLabel(n: number, singular: string, plural: string): string {
  return `${n} ${n >= 2 ? plural : singular}`;
}
