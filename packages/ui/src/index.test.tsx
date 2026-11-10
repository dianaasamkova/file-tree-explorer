import { render, screen } from '@testing-library/react'
import { Button, cn, Kbd, Skeleton } from './index'

describe('Button', () => {
  it('is a button that never submits by accident', () => {
    render(<Button>Save</Button>)
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button')
  })

  it('applies variants and lets a className override them', () => {
    render(
      <Button variant="primary" size="sm" className="h-10">
        Move
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Move' })
    expect(button).toHaveClass('bg-accent', 'h-10')
    expect(button).not.toHaveClass('h-7')
  })
})

describe('Kbd and Skeleton', () => {
  it('render a key and a placeholder hidden from screen readers', () => {
    const { container } = render(
      <>
        <Kbd className="ml-1">Esc</Kbd>
        <Skeleton className="h-4" />
      </>,
    )
    expect(screen.getByText('Esc').tagName).toBe('KBD')
    expect(screen.getByText('Esc')).toHaveClass('ml-1')
    expect(container.querySelector('[aria-hidden]')).toHaveClass('animate-pulse', 'h-4')
  })
})

describe('cn', () => {
  it('joins classes and keeps the last of conflicting Tailwind classes', () => {
    expect(cn('px-2 py-1', false, 'px-4')).toBe('py-1 px-4')
  })
})
