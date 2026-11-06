// What is typed into the search entry and chosen in its filters (NautilusQuery), and what the window can tell from it
// before any search runs. The search itself is in search.ts, which loads when it is first needed.

export const TYPE_FILTERS = ['Audio', 'Documents', 'Folders', 'Images', 'PDF', 'Spreadsheets', 'Text', 'Videos'] as const;
export type TypeFilter = (typeof TYPE_FILTERS)[number];
export const DATE_FILTERS = ['Today', 'Yesterday', 'Past Week', 'Past Month', 'Past Year'] as const;
export type DateFilter = (typeof DATE_FILTERS)[number];
/** org.gnome.nautilus.SearchFilterTimeType */
export type TimeType = 'last_used' | 'last_modified' | 'created';

export type SearchText = { text: string; types: TypeFilter[]; date: DateFilter | null };
export const NO_SEARCH: SearchText = { text: '', types: [], date: null };
/** A run of a snippet: what was matched is bold. */
export type SnippetPart = { text: string; bold: boolean };

/** nautilus_query_is_empty */
export const isEmptyQuery = (q: SearchText) => !q.date && !q.text.trim() && !q.types.length;
/** nautilus_query_has_active_filter */
export const hasActiveFilter = (q: SearchText, content: boolean) => !!q.date || q.types.length > 0 || !content;
/** nautilus_search_directory_file_update_display_name */
export const searchTitle = (text: string) => (text.trim() ? `Search for “${text.trim()}”` : 'Search');
