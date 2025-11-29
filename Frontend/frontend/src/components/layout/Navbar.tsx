import { Moon, Sun, User } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function Navbar() {
  const { theme, toggleTheme } = useTheme()
  const { user } = useAuth()

  return (
    <div className="flex h-16 items-center justify-between border-b-2 border-teal-200 dark:border-teal-800 bg-gradient-to-r from-white to-teal-50 dark:from-background dark:to-teal-950 px-4 sm:px-6 shadow-sm">
      <div className="flex items-center gap-4">
        <h1 className="text-base sm:text-lg font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">
          Health Intelligence Network
        </h1>
        {user && (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{user.name}</span>
            <Badge variant="secondary" className="text-xs capitalize">
              {user.role}
            </Badge>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="rounded-full hover:bg-teal-100 dark:hover:bg-teal-900 transition-colors"
        >
          {theme === 'light' ? (
            <Moon className="h-5 w-5 text-teal-600" />
          ) : (
            <Sun className="h-5 w-5 text-yellow-500" />
          )}
        </Button>
      </div>
    </div>
  )
}

