// ─── Usuário / Auth ───────────────────────────────────────────────────────────

export type UserRole = 'client' | 'lawyer' | 'office_admin' | 'admin'

export type LawyerStatus = 'pending' | 'under_review' | 'verified' | 'rejected' | 'suspended'

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  role: UserRole
  createdAt: string
}

export interface Lawyer extends User {
  role: 'lawyer'
  oabNumber: string
  oabState: string
  status: LawyerStatus
  bio?: string
  specialties: string[]
  uf: string
  city: string
  rating: number
  reviewCount: number
  plan: 'free' | 'pro' | 'office'
  officeId?: string
  isVisible: boolean
}

export interface Client extends User {
  role: 'client'
}

// ─── Demanda / Marketplace ────────────────────────────────────────────────────

export type DemandStatus = 'open' | 'in_progress' | 'closed' | 'cancelled'

export interface Demand {
  id: string
  clientId: string
  client?: Client
  title: string
  description: string
  specialty: string
  uf: string
  budget?: number
  status: DemandStatus
  proposalsCount: number
  createdAt: string
  updatedAt: string
}

export type ProposalStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn'

export interface Proposal {
  id: string
  demandId: string
  lawyerId: string
  lawyer?: Lawyer
  description: string
  price: number
  estimatedDays: number
  status: ProposalStatus
  createdAt: string
}

// ─── Contrato ─────────────────────────────────────────────────────────────────

export type ContractStatus = 'active' | 'completed' | 'disputed' | 'cancelled'

export interface Contract {
  id: string
  demandId: string
  demand?: Demand
  proposalId: string
  proposal?: Proposal
  clientId: string
  client?: Client
  lawyerId: string
  lawyer?: Lawyer
  price: number
  status: ContractStatus
  signedAt?: string
  completedAt?: string
  createdAt: string
}

// ─── Avaliação ────────────────────────────────────────────────────────────────

export interface Review {
  id: string
  contractId: string
  reviewerId: string
  reviewer?: User
  lawyerId: string
  rating: number
  comment: string
  isVerified: boolean
  createdAt: string
}

// ─── Feed / Posts ─────────────────────────────────────────────────────────────

export interface Post {
  id: string
  authorId: string
  author?: Lawyer
  title: string
  content: string
  imageUrl?: string
  tags: string[]
  likesCount: number
  commentsCount: number
  isLiked?: boolean
  createdAt: string
  updatedAt: string
}

export interface Comment {
  id: string
  postId: string
  authorId: string
  author?: User
  content: string
  createdAt: string
}

// ─── Correspondentes ──────────────────────────────────────────────────────────

export type CorrespondentRequestStatus = 'open' | 'in_progress' | 'completed' | 'cancelled'

export interface CorrespondentRequest {
  id: string
  requesterId: string
  requester?: Lawyer
  title: string
  description: string
  uf: string
  city: string
  specialty: string
  hearing?: string
  deadline: string
  budget: number
  status: CorrespondentRequestStatus
  proposalsCount: number
  createdAt: string
}

export interface CorrespondentProposal {
  id: string
  requestId: string
  lawyerId: string
  lawyer?: Lawyer
  description: string
  price: number
  status: ProposalStatus
  documentUrl?: string
  createdAt: string
}

// ─── KYC ──────────────────────────────────────────────────────────────────────

export type KycStatus = 'pending' | 'under_review' | 'approved' | 'rejected'

export interface KycDocument {
  id: string
  lawyerId: string
  type: 'oab_card' | 'id_document' | 'address_proof' | 'other'
  fileUrl: string
  status: KycStatus
  reviewNote?: string
  uploadedAt: string
  reviewedAt?: string
}

// ─── Plano ────────────────────────────────────────────────────────────────────

export interface Plan {
  id: string
  name: string
  slug: 'free' | 'pro' | 'office'
  priceMonthly: number
  priceYearly: number
  features: string[]
  limits: {
    proposals: number | null
    teamMembers: number | null
    analytics: boolean
  }
}

// ─── Escritório ───────────────────────────────────────────────────────────────

export interface Office {
  id: string
  name: string
  cnpj: string
  adminId: string
  members: Lawyer[]
  plan: 'office'
  createdAt: string
}

// ─── Paginação ────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

// ─── Filtros ─────────────────────────────────────────────────────────────────

export interface LawyerFilters {
  specialty?: string
  uf?: string
  city?: string
  minRating?: number
  plan?: string
  search?: string
  page?: number
}

export interface DemandFilters {
  specialty?: string
  uf?: string
  status?: DemandStatus
  search?: string
  page?: number
}
