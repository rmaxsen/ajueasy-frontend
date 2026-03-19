import { Link, useNavigate } from 'react-router-dom'
import { Scale, Menu, X, Bell, User, LogOut, Settings, LayoutDashboard } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuthStore } from '@/store/auth'
import { getInitials } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

const navLinks = [
  { label: 'Buscar Advogados', to: '/buscar' },
  { label: 'Demandas', to: '/marketplace' },
  { label: 'Correspondentes', to: '/correspondentes' },
  { label: 'Andamento Processual', to: '/processos' },
  { label: 'Feed', to: '/feed' },
]

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary">
          <Scale className="h-6 w-6" />
          <span>Ajueasy</span>
        </Link>

        {/* Nav desktop */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {isAuthenticated && user ? (
            <>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] text-white flex items-center justify-center">
                  3
                </span>
              </Button>

              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:block text-sm font-medium">{user.name.split(' ')[0]}</span>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-md border bg-popover shadow-lg z-50">
                    <div className="px-4 py-3 border-b">
                      <p className="font-medium text-sm">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                      {user.role === 'lawyer' && (
                        <Badge variant="info" className="mt-1 text-[10px]">Advogado</Badge>
                      )}
                    </div>
                    <div className="py-1">
                      <Link
                        to="/perfil"
                        className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <User className="h-4 w-4" /> Meu Perfil
                      </Link>
                      <Link
                        to="/dashboard"
                        className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <LayoutDashboard className="h-4 w-4" /> Dashboard
                      </Link>
                      <Link
                        to="/configuracoes"
                        className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Settings className="h-4 w-4" /> Configurações
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-accent"
                      >
                        <LogOut className="h-4 w-4" /> Sair
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild className="hidden sm:inline-flex">
                <Link to="/login">Entrar</Link>
              </Button>
              <Button asChild>
                <Link to="/cadastro">Cadastrar</Link>
              </Button>
            </>
          )}

          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-background px-4 py-4 flex flex-col gap-3">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm font-medium py-2"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {!isAuthenticated && (
            <div className="flex gap-2 mt-2">
              <Button variant="outline" asChild className="flex-1">
                <Link to="/login" onClick={() => setMobileOpen(false)}>Entrar</Link>
              </Button>
              <Button asChild className="flex-1">
                <Link to="/cadastro" onClick={() => setMobileOpen(false)}>Cadastrar</Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
