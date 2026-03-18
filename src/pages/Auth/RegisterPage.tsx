import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/store/auth'
import { mockLawyers } from '@/services/api/mock-data'

const schema = z.object({
  name: z.string().min(3, 'Mínimo 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  confirmPassword: z.string(),
  role: z.enum(['client', 'lawyer']),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
})
type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const [params] = useSearchParams()
  const { login } = useAuthStore()
  const navigate = useNavigate()
  const [showPass, setShowPass] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: (params.get('role') as 'client' | 'lawyer') ?? 'client' },
  })

  const selectedRole = watch('role')

  async function onSubmit(data: FormData) {
    await new Promise((r) => setTimeout(r, 1000))

    if (data.role === 'lawyer') {
      const mockUser = { ...mockLawyers[0], name: data.name, email: data.email }
      login(mockUser, 'mock-token-lawyer')
      navigate('/onboarding')
    } else {
      login(
        { id: 'new-client', name: data.name, email: data.email, role: 'client', createdAt: new Date().toISOString() },
        'mock-token-client'
      )
      navigate('/dashboard')
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Criar sua conta</h1>
        <p className="text-muted-foreground mt-1">
          Já tem conta?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Entrar
          </Link>
        </p>
      </div>

      {/* Role selector */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {(['client', 'lawyer'] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setValue('role', r)}
            className={`rounded-lg border-2 p-4 text-left transition-colors ${
              selectedRole === r
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-muted-foreground'
            }`}
          >
            <div className="font-semibold text-sm">{r === 'client' ? 'Sou Cliente' : 'Sou Advogado'}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {r === 'client' ? 'Busco assessoria jurídica' : 'Ofereço serviços jurídicos'}
            </div>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <input type="hidden" {...register('role')} />

        <div className="space-y-1.5">
          <Label htmlFor="name">Nome completo</Label>
          <Input id="name" placeholder="João da Silva" autoComplete="name" {...register('name')} />
          {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" placeholder="seu@email.com" autoComplete="email" {...register('email')} />
          {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Senha</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPass ? 'text' : 'password'}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
              {...register('password')}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              onClick={() => setShowPass(!showPass)}
            >
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-destructive text-xs">{errors.password.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirmar senha</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Repita a senha"
            autoComplete="new-password"
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p className="text-destructive text-xs">{errors.confirmPassword.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Criar conta
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Ao criar sua conta você concorda com os{' '}
          <Link to="/termos" className="text-primary hover:underline">Termos de Uso</Link> e{' '}
          <Link to="/privacidade" className="text-primary hover:underline">Política de Privacidade</Link>.
        </p>
      </form>
    </div>
  )
}
