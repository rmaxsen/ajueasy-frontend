import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, pattern = 'dd/MM/yyyy') {
  return format(new Date(date), pattern, { locale: ptBR })
}

export function timeAgo(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR })
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('')
}

export const SPECIALTIES = [
  'Direito Civil',
  'Direito Penal',
  'Direito Trabalhista',
  'Direito Tributário',
  'Direito Empresarial',
  'Direito de Família',
  'Direito Imobiliário',
  'Direito do Consumidor',
  'Direito Previdenciário',
  'Direito Administrativo',
  'Direito Ambiental',
  'Direito Digital',
  'Direito Internacional',
  'Direito Contratual',
  'Propriedade Intelectual',
]

export const UF_LIST = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO',
]

export function detectContactInfo(text: string): boolean {
  const patterns = [
    /\d{2}\s?\d{4,5}[-\s]?\d{4}/,        // telefone
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // email
    /whatsapp|zap\s*:/i,
    /instagram\.com|@[a-zA-Z0-9_.]+/i,
    /t\.me\//i,
  ]
  return patterns.some((p) => p.test(text))
}
