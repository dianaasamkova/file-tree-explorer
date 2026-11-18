// The API contract: what any backend for the file tree provides.
export { ApiProvider, useApi } from './api/api-context'
export { ApiError, datasets, isDatasetId, type DatasetId, type FileTreeApi } from './api/contract'
// The in-browser backend used by the demo and the tests.
export { createMockApi, parseDemoOptions, parseLatency, type MockApiOptions } from './server/mock-server'
// The feature itself.
export { useUrlState } from './hooks/use-url-state'
export { FileTreeExplorer, TREE_ID } from './ui/explorer/file-tree-explorer'
// Product analytics: connect a real service with setTracker.
export { setTracker, type MoveMethod, type ProductEvent, type Tracker } from './analytics/events'
