export function buildDocumentUrl(slug: string, familySlug: string, page: number): string {
  const base = process.env.NEXT_PUBLIC_CPR_APP_URL || 'https://app.climatepolicyradar.org';
  return `${base}/documents/${slug}?page=${page}&id=${familySlug}`;
}

export function buildWikibaseUrl(conceptId: string): string {
  const base = process.env.NEXT_PUBLIC_WIKIBASE_URL || 'https://climatepolicyradar.wikibase.cloud';
  return `${base}/wiki/Item:${conceptId}`;
}

