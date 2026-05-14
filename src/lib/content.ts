export function devlogSlug(id: string): string {
  const clean = id.replace(/\/index$/, '');
  return clean.split('/').pop()!;
}

export function devlogProject(id: string): string | undefined {
  const clean = id.replace(/\/index$/, '');
  const [project, scope] = clean.split('/');
  if (!project || scope !== 'devlog') return undefined;
  return project;
}
