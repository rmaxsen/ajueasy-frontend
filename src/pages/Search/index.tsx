import { useState, useEffect, useCallback } from 'react'
import { Search, Filter, X, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LawyerCard } from '@/components/shared/LawyerCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import { lawyersApi } from '@/services/api/lawyers'
import { Lawyer } from '@/types'
import { SPECIALTIES, UF_LIST } from '@/lib/utils'

export default function SearchPage() {
  const [search, setSearch] = useState('')
  const [specialty, setSpecialty] = useState('all')
  const [uf, setUf] = useState('all')
  const [minRating, setMinRating] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [lawyers, setLawyers] = useState<Lawyer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLawyers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: Record<string, string> = {}
      if (search) params.search = search
      if (specialty !== 'all') params.specialty = specialty
      if (uf !== 'all') params.uf = uf
      if (minRating !== 'all') params.minRating = minRating
      const res = await lawyersApi.list(params as any)
      setLawyers(Array.isArray(res) ? res : (res as any).data ?? [])
    } catch {
      setError('Erro ao carregar advogados. Verifique sua conexão.')
    } finally {
      setLoading(false)
    }
  }, [search, specialty, uf, minRating])

  useEffect(() => {
    const timer = setTimeout(fetchLawyers, 400)
    return () => clearTimeout(timer)
  }, [fetchLawyers])

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
        <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="gap-2">
          <Filter className="h-4 w-4" />
          Filtros
          {activeFilters.length > 0 && (
            <Badge className="ml-1 h-5 w-5 p-0 text-xs">{activeFilters.length}</Badge>
          )}
        </Button>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {activeFilters.map((f) => (
            <Badge key={f} variant="secondary" className="gap-1">
              {f}
              <button onClick={() => {
                if (SPECIALTIES.includes(f)) setSpecialty('all')
                else if (UF_LIST.includes(f)) setUf('all')
                else setMinRating('all')
              }}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <button
            className="text-xs text-primary hover:underline"
            onClick={() => { setSearch(''); setSpecialty('all'); setUf('all'); setMinRating('all') }}
          >
            Limpar todos
          </button>
        </div>
      )}

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

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-destructive mb-4">{error}</p>
          <Button variant="outline" onClick={fetchLawyers}>Tentar novamente</Button>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            {lawyers.length} advogado{lawyers.length !== 1 ? 's' : ''} encontrado{lawyers.length !== 1 ? 's' : ''}
          </p>
          {lawyers.length === 0 ? (
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
              {lawyers.map((l) => <LawyerCard key={l.id} lawyer={l} />)}
            </div>
          )}
        </>
      )}
    </div>
  )
}
