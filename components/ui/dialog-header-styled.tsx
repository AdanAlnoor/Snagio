import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

interface DialogHeaderStyledProps {
  icon: LucideIcon
  title: string
  description?: string
  theme?: 'danger' | 'info' | 'success' | 'warning' | 'communication'
  className?: string
}

const themeStyles = {
  danger: {
    container: 'bg-red-100 dark:bg-red-900/20',
    icon: 'text-red-600 dark:text-red-400',
    background: 'bg-red-50/20',
  },
  info: {
    container: 'bg-blue-100 dark:bg-blue-900/20',
    icon: 'text-blue-600 dark:text-blue-400',
    background: 'bg-blue-50/20',
  },
  success: {
    container: 'bg-green-100 dark:bg-green-900/20',
    icon: 'text-green-600 dark:text-green-400',
    background: 'bg-green-50/20',
  },
  warning: {
    container: 'bg-yellow-100 dark:bg-yellow-900/20',
    icon: 'text-yellow-600 dark:text-yellow-400',
    background: 'bg-yellow-50/20',
  },
  communication: {
    container: 'bg-purple-100 dark:bg-purple-900/20',
    icon: 'text-purple-600 dark:text-purple-400',
    background: 'bg-purple-50/20',
  },
}

export function DialogHeaderStyled({
  icon: Icon,
  title,
  description,
  theme = 'info',
  className,
}: DialogHeaderStyledProps) {
  const styles = themeStyles[theme]

  return (
    <DialogHeader className={className}>
      <div className="flex items-center gap-3">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', styles.container)}>
          <Icon className={cn('h-5 w-5', styles.icon)} />
        </div>
        <DialogTitle>{title}</DialogTitle>
      </div>
      {description && (
        <DialogDescription className="pt-2 pl-[52px]">{description}</DialogDescription>
      )}
    </DialogHeader>
  )
}

// Export theme background classes for dialog content
export const dialogBackgroundStyles = {
  danger: 'bg-red-50/10',
  info: 'bg-blue-50/10',
  success: 'bg-green-50/10',
  warning: 'bg-yellow-50/10',
  communication: 'bg-purple-50/10',
}