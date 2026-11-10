import { Button, Kbd, MOD_KEY } from '@fte/ui'
import { useId, useMemo, useState, type FormEvent } from 'react'
import { canMove } from '../../model/move'
import { listFolders, ROOT_LABEL } from '../../model/tree'
import type { FolderTarget, NodeId, Tree, TreeNode } from '../../model/types'

const ROOT_VALUE = '__root__'

/**
 * The single-pointer way to move an item: pick a folder and press Move. Folders the item can't go
 * to are disabled.
 */
export function MoveToForm({
  tree,
  node,
  onMove,
}: {
  tree: Tree
  node: TreeNode
  onMove(id: NodeId, target: FolderTarget): void
}) {
  const selectId = useId()
  const hintId = useId()
  const [value, setValue] = useState('')

  const options = useMemo(
    () =>
      listFolders(tree).map(({ node: folder, depth }) => ({
        value: folder.id,
        label: `${'   '.repeat(depth + 1)}${folder.name}`,
        disabled: !canMove(tree, node.id, folder.id).ok,
      })),
    [tree, node.id],
  )
  const rootDisabled = !canMove(tree, node.id, null).ok

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!value) return
    onMove(node.id, value === ROOT_VALUE ? null : value)
    setValue('')
  }

  return (
    <form onSubmit={submit} className="border-border flex flex-col gap-2 border-t pt-5">
      <label htmlFor={selectId} className="text-sm font-medium">
        Move to
      </label>
      <div className="flex gap-2">
        <select
          id={selectId}
          aria-describedby={hintId}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="border-border bg-surface h-8 min-w-0 flex-1 rounded-md border px-2 text-sm"
        >
          <option value="" disabled>
            Choose a folder
          </option>
          <option value={ROOT_VALUE} disabled={rootDisabled}>
            {ROOT_LABEL}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <Button type="submit" variant="primary" disabled={!value}>
          Move
        </Button>
      </div>
      <p id={hintId} className="text-muted text-xs">
        Unavailable folders already contain it or an item with the same name. You can also drag the item, or press{' '}
        <Kbd>{MOD_KEY}</Kbd> <Kbd>X</Kbd> and then <Kbd>{MOD_KEY}</Kbd> <Kbd>V</Kbd> on a folder.
      </p>
    </form>
  )
}
