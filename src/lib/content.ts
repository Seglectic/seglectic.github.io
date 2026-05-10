export function devlogSlug(id: string): string {
  return id.replace(/\/index$/, '');
}
