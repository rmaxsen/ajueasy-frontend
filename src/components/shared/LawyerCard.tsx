import { Link } from 'react-router-dom'
import { MapPin, CheckCircle, Clock, Shield } from 'lucide-react'
import { Lawyer } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { StarRating } from './StarRating'
import { getInitials } from '@/lib/utils'

interface LawyerCardProps {
  lawyer: Lawyer
}

export function LawyerCard({ lawyer }: LawyerCardProps) {
  const statusMap = {
    verified: { label: 'Verificado', icon: CheckCircle, variant: 'success' as const },
    pending: { label: 'Em análise', icon: Clock, variant: 'warning' as const },
    under_review: { label: 'Em análise', icon: Clock, variant: 'warning' as const },
    rejected: { label: 'Rejeitado', icon: Shield, variant: 'destructive' as const },
    suspended: { label: 'Suspenso', icon: Shield, variant: 'destructive' as const },
  }
  const st = statusMap[lawyer.status]

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex gap-4">
          <Avatar className="h-16 w-16 shrink-0">
            <AvatarImage src={lawyer.avatar} />
            <AvatarFallback className="text-lg">{getInitials(lawyer.name)}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-base leading-tight">{lawyer.name}</h3>
                <p className="text-xs text-muted-foreground">OAB/{lawyer.oabState} {lawyer.oabNumber}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Badge variant={st.variant} className="text-[10px] gap-1">
                  <st.icon className="h-3 w-3" />
                  {st.label}
                </Badge>
                {lawyer.plan === 'pro' && (
                  <Badge variant="info" className="text-[10px]">PRO</Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 mt-1">
              <StarRating value={lawyer.rating} size="sm" />
              <span className="text-xs text-muted-foreground">
                {lawyer.rating.toFixed(1)} ({lawyer.reviewCount})
              </span>
            </div>

            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {lawyer.city}/{lawyer.uf}
            </div>

            <div className="flex flex-wrap gap-1 mt-2">
              {lawyer.specialties.slice(0, 2).map((s) => (
                <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
              ))}
              {lawyer.specialties.length > 2 && (
                <Badge variant="outline" className="text-[10px]">
                  +{lawyer.specialties.length - 2}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {lawyer.bio && (
          <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{lawyer.bio}</p>
        )}

        <div className="mt-4">
          <Button asChild size="sm" className="w-full" disabled={!lawyer.isVisible}>
            <Link to={`/advogado/${lawyer.id}`}>Ver perfil completo</Link>
          </Button>
          {!lawyer.isVisible && (
            <p className="text-xs text-center text-muted-foreground mt-1">
              Perfil em análise — ainda não está visível
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
