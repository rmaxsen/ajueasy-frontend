import { useParams, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { MapPin, Star, Briefcase, ExternalLink, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { StarRating } from '@/components/shared/StarRating'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { lawyersApi } from '@/services/api/lawyers'
import { feedApi } from '@/services/api/feed'
import { Lawyer, Review, Post } from '@/types'
import { getInitials, formatDate, timeAgo } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'

export default function LawyerProfilePage() {
  const { id } = useParams<{ id: string }>()
  const { user, isAuthenticated } = useAuthStore()
  const [lawyer, setLawyer] = useState<Lawyer | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([
      lawyersApi.get(id),
      lawyersApi.getReviews(id),
      feedApi.list({ page: 1 }),
    ])
      .then(([lawyerData, reviewsData, feedData]) => {
        setLawyer(lawyerData)
        setReviews(Array.isArray(reviewsData) ? reviewsData : (reviewsData as any).data ?? [])
        const allPosts = Array.isArray(feedData) ? feedData : (feedData as any).data ?? []
        setPosts(allPosts.filter((p: Post) => p.authorId === id))
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !lawyer) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-2">Advogado não encontrado</h2>
        <Button asChild variant="outline"><Link to="/buscar">Voltar à busca</Link></Button>
      </div>
    )
  }

  const isOwner = user?.id === lawyer.id

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {lawyer.status !== 'verified' && (
        <div className="mb-6 flex items-center gap-3 rounded-lg bg-amber-50 border border-amber-200 p-4">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <p className="font-medium text-amber-800">Perfil em análise</p>
            <p className="text-sm text-amber-700">
              Este perfil está aguardando verificação e não está visível na busca.
              {isOwner && ' Você pode editar suas informações enquanto aguarda.'}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-6 text-center">
              <Avatar className="h-24 w-24 mx-auto mb-4">
                <AvatarImage src={lawyer.avatar} />
                <AvatarFallback className="text-2xl">{getInitials(lawyer.name)}</AvatarFallback>
              </Avatar>
              <h1 className="text-xl font-bold">{lawyer.name}</h1>
              <p className="text-sm text-muted-foreground mb-2">
                OAB/{lawyer.oabState} {lawyer.oabNumber}
              </p>
              <div className="flex items-center justify-center gap-1 mb-2">
                <StarRating value={lawyer.rating} size="sm" />
                <span className="text-sm text-muted-foreground">
                  {lawyer.rating.toFixed(1)} ({lawyer.reviewCount})
                </span>
              </div>
              <div className="flex flex-wrap gap-1 justify-center mb-4">
                <StatusBadge type="lawyer" status={lawyer.status} />
                {lawyer.plan === 'pro' && <Badge variant="info">PRO</Badge>}
              </div>
              <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-4">
                <MapPin className="h-4 w-4" />
                {lawyer.city}/{lawyer.uf}
              </div>
              {isAuthenticated && !isOwner && lawyer.isVisible && (
                <Button className="w-full" asChild>
                  <Link to={`/marketplace?lawyerId=${lawyer.id}`}>Contratar / Enviar demanda</Link>
                </Button>
              )}
              {isOwner && (
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/perfil/editar">Editar perfil</Link>
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Especialidades</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1.5">
              {lawyer.specialties.map((s) => (
                <Badge key={s} variant="outline">{s}</Badge>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Main content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="about">
            <TabsList className="w-full">
              <TabsTrigger value="about" className="flex-1">Sobre</TabsTrigger>
              <TabsTrigger value="reviews" className="flex-1">
                Avaliações ({reviews.length})
              </TabsTrigger>
              <TabsTrigger value="posts" className="flex-1">
                Artigos ({posts.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="about" className="mt-4">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Briefcase className="h-4 w-4" /> Apresentação
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {lawyer.bio ?? 'Nenhuma biografia cadastrada.'}
                  </p>
                  <Separator className="my-4" />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Membro desde</p>
                      <p className="font-medium">{formatDate(lawyer.createdAt, 'MMMM yyyy')}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Casos concluídos</p>
                      <p className="font-medium">{lawyer.reviewCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reviews" className="mt-4 space-y-4">
              {reviews.length === 0 ? (
                <EmptyState
                  icon={Star}
                  title="Sem avaliações ainda"
                  description="As avaliações aparecem após a conclusão de contratos."
                />
              ) : (
                reviews.map((r) => (
                  <Card key={r.id}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>C</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">Cliente verificado</p>
                            <p className="text-xs text-muted-foreground">{timeAgo(r.createdAt)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StarRating value={r.rating} size="sm" />
                          {r.isVerified && (
                            <Badge variant="success" className="gap-1 text-[10px]">
                              <CheckCircle className="h-3 w-3" />
                              Verificada
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">{r.comment}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="posts" className="mt-4 space-y-4">
              {posts.length === 0 ? (
                <EmptyState
                  icon={ExternalLink}
                  title="Nenhum artigo publicado"
                  description="Este advogado ainda não publicou artigos no feed."
                />
              ) : (
                posts.map((p) => (
                  <Card key={p.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-5">
                      <Link to={`/feed/${p.id}`} className="hover:text-primary transition-colors">
                        <h3 className="font-semibold mb-1">{p.title}</h3>
                      </Link>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{p.content}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex gap-3">
                          <span>♥ {p.likesCount}</span>
                          <span>💬 {p.commentsCount}</span>
                        </div>
                        <span>{timeAgo(p.createdAt)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
