import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle, Upload, User, Briefcase, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthStore } from '@/store/auth'
import { SPECIALTIES, UF_LIST } from '@/lib/utils'

const steps = [
  { id: 1, title: 'Dados pessoais', icon: User },
  { id: 2, title: 'Dados da OAB', icon: Briefcase },
  { id: 3, title: 'Documentos', icon: FileText },
  { id: 4, title: 'Concluído', icon: CheckCircle },
]

const step1Schema = z.object({
  bio: z.string().min(20, 'Mínimo 20 caracteres').max(500),
  city: z.string().min(2),
  phone: z.string().min(10),
})

const step2Schema = z.object({
  oabNumber: z.string().min(4, 'Número OAB inválido'),
  oabState: z.string().length(2),
})

type Step1Data = z.infer<typeof step1Schema>
type Step2Data = z.infer<typeof step2Schema>

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([])
  const [selectedUF, setSelectedUF] = useState('')
  const [docs, setDocs] = useState<{ oab: File | null; id: File | null }>({ oab: null, id: null })
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const form1 = useForm<Step1Data>({ resolver: zodResolver(step1Schema) })
  const form2 = useForm<Step2Data>({ resolver: zodResolver(step2Schema) })

  if (user?.role !== 'lawyer') {
    navigate('/dashboard')
    return null
  }

  const progress = ((step - 1) / (steps.length - 1)) * 100

  function toggleSpecialty(s: string) {
    setSelectedSpecialties((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : prev.length < 5 ? [...prev, s] : prev
    )
  }

  async function handleFinish() {
    await new Promise((r) => setTimeout(r, 1000))
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="bg-background rounded-xl shadow-lg w-full max-w-2xl p-8">
        {/* Steps header */}
        <div className="flex items-center justify-between mb-2">
          {steps.map((s) => (
            <div
              key={s.id}
              className={`flex flex-col items-center gap-1 flex-1 ${s.id <= step ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                  s.id < step
                    ? 'bg-primary border-primary text-white'
                    : s.id === step
                    ? 'border-primary'
                    : 'border-muted'
                }`}
              >
                {s.id < step ? <CheckCircle className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
              </div>
              <span className="text-xs font-medium hidden sm:block">{s.title}</span>
            </div>
          ))}
        </div>
        <Progress value={progress} className="mb-8 h-2" />

        {/* Step 1 */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold mb-1">Dados pessoais</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Complete seu perfil para que clientes possam te encontrar.
            </p>
            <form onSubmit={form1.handleSubmit(() => setStep(2))} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Bio / Apresentação</Label>
                <Textarea
                  placeholder="Descreva sua experiência, especialidades e diferenciais..."
                  rows={4}
                  {...form1.register('bio')}
                />
                {form1.formState.errors.bio && (
                  <p className="text-destructive text-xs">{form1.formState.errors.bio.message}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Estado (UF de atuação)</Label>
                  <Select value={selectedUF} onValueChange={setSelectedUF}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {UF_LIST.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Cidade</Label>
                  <Input placeholder="Sua cidade" {...form1.register('city')} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Telefone (WhatsApp)</Label>
                <Input placeholder="(11) 99999-9999" {...form1.register('phone')} />
                {form1.formState.errors.phone && (
                  <p className="text-destructive text-xs">{form1.formState.errors.phone.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Especialidades (máx. 5)</Label>
                <div className="flex flex-wrap gap-2">
                  {SPECIALTIES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSpecialty(s)}
                      className={`rounded-full px-3 py-1 text-xs border transition-colors ${
                        selectedSpecialties.includes(s)
                          ? 'bg-primary text-white border-primary'
                          : 'border-border hover:border-primary'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                {selectedSpecialties.length > 0 && (
                  <p className="text-xs text-muted-foreground">{selectedSpecialties.length} selecionada(s)</p>
                )}
              </div>
              <Button type="submit" className="w-full">Próximo</Button>
            </form>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold mb-1">Dados da OAB</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Informe seus dados da OAB para verificação.
            </p>
            <form onSubmit={form2.handleSubmit(() => setStep(3))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Número OAB</Label>
                  <Input placeholder="123456" {...form2.register('oabNumber')} />
                  {form2.formState.errors.oabNumber && (
                    <p className="text-destructive text-xs">{form2.formState.errors.oabNumber.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Seccional (UF)</Label>
                  <Select onValueChange={(v) => form2.setValue('oabState', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {UF_LIST.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="p-4 bg-blue-50 rounded-md text-sm text-blue-800">
                <strong>Informação:</strong> Verificaremos seus dados junto ao CFOAB.
                O processo pode levar até 48h úteis.
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Voltar
                </Button>
                <Button type="submit" className="flex-1">Próximo</Button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-bold mb-1">Envio de documentos</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Envie os documentos para verificação KYC. Formatos aceitos: PDF, JPG, PNG.
            </p>
            <div className="space-y-4">
              {[
                { key: 'oab', label: 'Carteira OAB (frente e verso)', required: true },
                { key: 'id', label: 'Documento de identidade (RG ou CNH)', required: true },
              ].map((doc) => (
                <div key={doc.key} className="space-y-1.5">
                  <Label>
                    {doc.label}
                    {doc.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null
                        setDocs((prev) => ({ ...prev, [doc.key]: f }))
                      }}
                    />
                    {docs[doc.key as 'oab' | 'id'] ? (
                      <div className="flex items-center gap-2 text-sm text-primary">
                        <CheckCircle className="h-4 w-4" />
                        {docs[doc.key as 'oab' | 'id']!.name}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-muted-foreground">
                        <Upload className="h-6 w-6" />
                        <span className="text-sm">Clique para selecionar</span>
                        <span className="text-xs">PDF, JPG ou PNG — máx. 10MB</span>
                      </div>
                    )}
                  </label>
                </div>
              ))}

              <div className="flex gap-3 mt-4">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Voltar</Button>
                <Button
                  onClick={() => setStep(4)}
                  className="flex-1"
                  disabled={!docs.oab || !docs.id}
                >
                  Enviar documentos
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4 — Concluído */}
        {step === 4 && (
          <div className="text-center py-8">
            <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Perfil enviado!</h2>
            <p className="text-muted-foreground mb-2 max-w-sm mx-auto">
              Seus dados foram enviados para análise. Você receberá um e-mail em até <strong>48h úteis</strong> com o resultado.
            </p>
            <Badge variant="warning" className="mb-6">Status: Em análise</Badge>
            <div className="p-4 bg-amber-50 rounded-md text-sm text-amber-800 text-left mb-6">
              <strong>Enquanto aguarda a verificação:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Seu perfil não estará visível na busca</li>
                <li>Você não poderá responder demandas</li>
                <li>Pode explorar e editar seu perfil livremente</li>
              </ul>
            </div>
            <Button onClick={handleFinish} className="w-full">
              Ir para o Dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
