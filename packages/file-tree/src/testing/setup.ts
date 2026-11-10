import { toast } from 'sonner'
import { afterEach } from 'vitest'

// sonner keeps toasts in a module-level store; without this, one test could see another's toast.
afterEach(() => {
  toast.dismiss()
})
