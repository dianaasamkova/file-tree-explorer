// zod/mini: the same validation, tree-shakable (the full build added about 26 KB gzipped).
import { z } from 'zod/mini'
import type { ApiFile, ApiFolder, ApiNode, ApiTreeResponse } from '../model/types'
import { ApiError } from './contract'

const fileSchema = z.object({
  id: z.string().check(z.minLength(1)),
  name: z.string().check(z.minLength(1)),
  type: z.literal('file'),
  size: z.number().check(z.int(), z.nonnegative()),
  mimeType: z.string(),
  modifiedAt: z.iso.datetime(),
}) satisfies z.ZodMiniType<ApiFile>

const folderSchema: z.ZodMiniType<ApiFolder> = z.object({
  id: z.string().check(z.minLength(1)),
  name: z.string().check(z.minLength(1)),
  type: z.literal('folder'),
  get children(): z.ZodMiniArray<z.ZodMiniType<ApiNode>> {
    return z.array(nodeSchema)
  },
})

const nodeSchema: z.ZodMiniType<ApiNode> = z.union([fileSchema, folderSchema])

/** The shape the backend promises. `satisfies` keeps it in step with the TypeScript types. */
export const treeResponseSchema = z.object({ items: z.array(nodeSchema) }) satisfies z.ZodMiniType<ApiTreeResponse>

/**
 * Checks a response at the boundary, before anything reaches the cache or the UI. Bad data then
 * fails here, with one clear error the explorer can show, instead of crashing deep in a component.
 */
export function parseTreeResponse(data: unknown): ApiTreeResponse {
  const result = treeResponseSchema.safeParse(data)
  if (result.success) return result.data
  const issue = result.error.issues[0]!
  const where = issue.path.length > 0 ? ` at ${issue.path.join('.')}` : ''
  throw new ApiError(502, `The server sent the drive in an unexpected format${where}.`, { cause: result.error })
}
