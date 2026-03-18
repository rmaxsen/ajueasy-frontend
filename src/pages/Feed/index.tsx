import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, MessageCircle, Plus, Image, Tag, Loader2, Send } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { EmptyState } from '@/components/shared/EmptyState'
import { mockPosts } from '@/services/api/mock-data'
import { Post } from '@/types'
import { getInitials, timeAgo } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'

export default function FeedPage() {
  const { user, isAuthenticated } = useAuthStore()
  const [posts, setPosts] = useState<Post[]>(mockPosts)
  const [createOpen, setCreateOpen] = useState(false)
  const [expandedComments, setExpandedComments] = useState<string | null>(null)
  const [newComment, setNewComment] = useState('')
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<{
    title: string; content: string; tags: string
  }>()

  function toggleLike(postId: string) {
    if (!isAuthenticated) return
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, isLiked: !p.isLiked, likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1 }
          : p
      )
    )
  }

  async function onCreatePost(data: { title: string; content: string; tags: string }) {
    await new Promise((r) => setTimeout(r, 800))
    const newPost: Post = {
      id: `p${Date.now()}`,
      authorId: user?.id ?? '',
      author: user as any,
      title: data.title,
      content: data.content,
      tags: data.tags.split(',').map((t) => t.trim()).filter(Boolean),
      likesCount: 0,
      commentsCount: 0,
      isLiked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setPosts((prev) => [newPost, ...prev])
    reset()
    setCreateOpen(false)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Feed Jurídico</h1>
          <p className="text-muted-foreground text-sm">Artigos e insights de advogados verificados</p>
        </div>
        {isAuthenticated && user?.role === 'lawyer' && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Publicar artigo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Novo artigo</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onCreatePost)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Título</Label>
                  <Input placeholder="Título do artigo" {...register('title', { required: true })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Conteúdo</Label>
                  <Textarea
                    placeholder="Escreva seu artigo..."
                    rows={6}
                    {...register('content', { required: true })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Tags (separadas por vírgula)</Label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Direito Civil, Contratos, Dicas"
                      {...register('tags')}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Publicar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {posts.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title="Nenhum artigo no feed"
          description="Os artigos publicados por advogados verificados aparecerão aqui."
        />
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <Card key={post.id}>
              <CardContent className="p-6">
                {/* Author */}
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={post.author?.avatar} />
                    <AvatarFallback>
                      {post.author ? getInitials(post.author.name) : '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Link
                      to={`/advogado/${post.authorId}`}
                      className="font-medium text-sm hover:text-primary transition-colors"
                    >
                      {post.author?.name ?? 'Advogado'}
                    </Link>
                    <p className="text-xs text-muted-foreground">{timeAgo(post.createdAt)}</p>
                  </div>
                </div>

                {/* Content */}
                <Link to={`/feed/${post.id}`}>
                  <h2 className="text-lg font-semibold mb-2 hover:text-primary transition-colors">
                    {post.title}
                  </h2>
                </Link>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{post.content}</p>

                {/* Tags */}
                {post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {post.tags.map((t) => (
                      <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-4 pt-3 border-t">
                  <button
                    onClick={() => toggleLike(post.id)}
                    className={`flex items-center gap-1.5 text-sm transition-colors ${
                      post.isLiked ? 'text-rose-500' : 'text-muted-foreground hover:text-rose-500'
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${post.isLiked ? 'fill-current' : ''}`} />
                    {post.likesCount}
                  </button>
                  <button
                    onClick={() =>
                      setExpandedComments(expandedComments === post.id ? null : post.id)
                    }
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {post.commentsCount}
                  </button>
                  <Link
                    to={`/feed/${post.id}`}
                    className="ml-auto text-xs text-primary hover:underline"
                  >
                    Ler artigo completo
                  </Link>
                </div>

                {/* Comment input */}
                {expandedComments === post.id && isAuthenticated && (
                  <div className="mt-4 flex gap-2">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className="text-xs">
                        {user ? getInitials(user.name) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 flex gap-2">
                      <Input
                        placeholder="Escreva um comentário..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="text-sm"
                      />
                      <Button size="icon" variant="ghost" disabled={!newComment.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
