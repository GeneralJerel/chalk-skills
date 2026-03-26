/**
 * Base interface for context collectors.
 *
 * Collectors gather specific workspace signals (git state, diagnostics, etc.)
 * and return them as markdown sections. The interface is intentionally simple
 * so third-party extensions can register custom collectors.
 */

export interface ContextSection {
  /** Markdown heading, e.g. "## Git State" */
  heading: string;
  /** Markdown body content */
  content: string;
  /** Unix timestamp of when data was collected */
  freshness: number;
  /** If true, the section is skipped in output */
  isEmpty: boolean;
}

export interface ContextCollector {
  /** Stable identifier, e.g. 'git-status', 'diagnostics'. No framework prefix. */
  id: string;
  /** Human-readable label for the Context Inspector UI */
  label: string;
  /** Gather workspace data and return a markdown section */
  collect(): Promise<ContextSection>;
  /** Whether this collector can run in the current workspace */
  isAvailable(): boolean;
}

/** Standard collector IDs — used in skill frontmatter `context-needs` */
export const COLLECTOR_IDS = {
  GIT_STATUS: 'git-status',
  DIAGNOSTICS: 'diagnostics',
  TEST_RESULTS: 'test-results',
  RECENT_ACTIVITY: 'recent-activity',
  PLAN_STATE: 'plan-state',
  CONVENTIONS: 'conventions',
} as const;

export type CollectorId = typeof COLLECTOR_IDS[keyof typeof COLLECTOR_IDS];

/** Status snapshot for the Context Inspector UI */
export interface CollectorStatus {
  id: string;
  label: string;
  available: boolean;
  lastRun: number | null;
  lastDurationMs: number | null;
  lastEmpty: boolean;
}
