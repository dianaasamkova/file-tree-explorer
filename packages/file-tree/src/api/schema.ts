import { z } from 'zod'
import type { ApiFile, ApiFolder, ApiNode, ApiTreeResponse } from '../model/types'
import { ApiError } from './contract'

const fileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.literal('file'),
  size: z.number().int().nonnegative(),
  mimeType: z.string(),
  modifiedAt: z.iso.datetime(),
}) satisfies z.ZodType<ApiFile>

const folderSchema: z.ZodType<ApiFolder> = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.literal('folder'),
  get children(): z.ZodArray<z.ZodType<ApiNode>> {
    return z.array(nodeSchema)
  },
})

const nodeSchema: z.ZodType<ApiNode> = z.union([fileSchema, folderSchema])

/** The shape the backend promises. `satisfies` keeps it in step with the TypeScript types. */
export const treeResponseSchema = z.object({ items: z.array(nodeSchema) }) satisfies z.ZodType<ApiTreeResponse>

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
