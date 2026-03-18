import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  value: number
  max?: number
  onChange?: (value: number) => void
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function StarRating({ value, max = 5, onChange, size = 'md', className }: StarRatingProps) {
  const sizes = { sm: 'h-3 w-3', md: 'h-4 w-4', lg: 'h-6 w-6' }

  return (
    <div className={cn('flex gap-0.5', className)}>
      {Array.from({ length: max }).map((_, i) => (
        <button
          key={i}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(i + 1)}
          className={cn('focus:outline-none', onChange && 'cursor-pointer hover:scale-110 transition-transform')}
        >
          <Star
            className={cn(
              sizes[size],
              i < value ? 'fill-yellow-400 text-yellow-400' : 'fill-none text-muted-foreground'
            )}
          />
        </button>
      ))}
    </div>
  )
}
