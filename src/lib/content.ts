export function devlogSlug(id: string): string {
  const clean = id.replace(/\/index$/, '');
  return clean.split('/').pop()!;
}
