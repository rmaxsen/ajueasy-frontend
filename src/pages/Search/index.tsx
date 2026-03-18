import { useState, useMemo } from 'react'
import { Search, Filter, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LawyerCard } from '@/components/shared/LawyerCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import { mockLawyers } from '@/services/api/mock-data'
import { SPECIALTIES, UF_LIST } from '@/lib/utils'

export default function SearchPage() {
  const [search, setSearch] = useState('')
  const [specialty, setSpecialty] = useState('all')
  const [uf, setUf] = useState('all')
  const [minRating, setMinRating] = useState('all')
  const [showFilters, setShowFilters] = useState(false)

  const results = useMemo(() => {
    return mockLawyers.filter((l) => {
      if (!l.isVisible || l.status !== 'verified') return false
      if (search && !l.name.toLowerCase().includes(search.toLowerCase()) &&
          !l.specialties.some((s) => s.toLowerCase().includes(search.toLowerCase()))) return false
      if (specialty !== 'all' && !l.specialties.includes(specialty)) return false
      if (uf !== 'all' && l.uf !== uf) return false
      if (minRating !== 'all' && l.rating < Number(minRating)) return false
      return true
    })
  }, [search, specialty, uf, minRating])

  const activeFilters = [
    specialty !== 'all' && specialty,
    uf !== 'all' && uf,
    minRating !== 'all' && `★ ${minRating}+`,
  ].filter(Boolean) as string[]

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Buscar Advogados</h1>
        <p className="text-muted-foreground">
          Encontre advogados verificados por especialidade e localização.
        </p>
      </div>

      {/* Search bar */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10"
            placeholder="Buscar por nome ou especialidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filtros
          {activeFilters.length > 0 && (
            <Badge className="ml-1 h-5 w-5 p-0 text-xs">{activeFilters.length}</Badge>
          )}
        </Button>
      </div>

      {/* Active filter badges */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {activeFilters.map((f) => (
            <Badge key={f} variant="secondary" className="gap-1">
              {f}
              <button
                onClick={() => {
                  if (SPECIALTIES.includes(f)) setSpecialty('all')
                  else if (UF_LIST.includes(f)) setUf('all')
                  else setMinRating('all')
                }}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <button
            className="text-xs text-primary hover:underline"
            onClick={() => { setSpecialty('all'); setUf('all'); setMinRating('all') }}
          >
            Limpar todos
          </button>
        </div>
      )}

      {/* Filters panel */}
      {showFilters && (
        <div className="border rounded-lg p-5 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-background">
          <div className="space-y-1.5">
            <Label>Especialidade</Label>
            <Select value={specialty} onValueChange={setSpecialty}>
              <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {SPECIALTIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Estado (UF)</Label>
            <Select value={uf} onValueChange={setUf}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {UF_LIST.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Avaliação mínima</Label>
            <Select value={minRating} onValueChange={setMinRating}>
              <SelectTrigger><SelectValue placeholder="Qualquer" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Qualquer</SelectItem>
                <SelectItem value="3">★ 3+</SelectItem>
                <SelectItem value="4">★ 4+</SelectItem>
                <SelectItem value="4.5">★ 4.5+</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Results */}
      <p className="text-sm text-muted-foreground mb-4">
        {results.length} advogado{results.length !== 1 ? 's' : ''} encontrado{results.length !== 1 ? 's' : ''}
      </p>

      {results.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nenhum advogado encontrado"
          description="Tente ajustar os filtros ou buscar por outro termo."
          action={
            <Button variant="outline" onClick={() => { setSearch(''); setSpecialty('all'); setUf('all'); setMinRating('all') }}>
              Limpar filtros
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {results.map((l) => <LawyerCard key={l.id} lawyer={l} />)}
        </div>
      )}
    </div>
  )
}
