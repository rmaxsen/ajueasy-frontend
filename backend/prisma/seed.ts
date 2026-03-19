/**
 * Seed — popula o banco com dados iniciais para desenvolvimento.
 * Execute com: npm run db:seed
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // ─── Admin ──────────────────────────────────────────────────────────────────

  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@ajueasy.com.br'
  const adminPass = process.env.ADMIN_PASSWORD ?? 'Admin@2024!'

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: 'Administrador Ajueasy',
      email: adminEmail,
      password: await bcrypt.hash(adminPass, 12),
      role: 'ADMIN',
    },
  })
  console.log('✅ Admin:', admin.email)

  // ─── Clientes ───────────────────────────────────────────────────────────────

  const client1 = await prisma.user.upsert({
    where: { email: 'joao.cliente@example.com' },
    update: {},
    create: {
      name: 'João da Silva',
      email: 'joao.cliente@example.com',
      password: await bcrypt.hash('123456', 12),
      role: 'CLIENT',
    },
  })

  const client2 = await prisma.user.upsert({
    where: { email: 'maria.cliente@example.com' },
    update: {},
    create: {
      name: 'Maria Oliveira',
      email: 'maria.cliente@example.com',
      password: await bcrypt.hash('123456', 12),
      role: 'CLIENT',
    },
  })
  console.log('✅ Clientes criados')

  // ─── Advogados verificados ──────────────────────────────────────────────────

  const lawyerData = [
    {
      email: 'carlos.mendes@example.com',
      name: 'Dr. Carlos Mendes',
      oabNumber: '123456',
      oabState: 'SP',
      specialties: ['Direito Trabalhista', 'Direito Previdenciário'],
      uf: 'SP',
      city: 'São Paulo',
      bio: 'Advogado especialista em Direito Trabalhista com mais de 15 anos de experiência.',
      plan: 'PRO' as const,
      rating: 4.8,
      reviewCount: 47,
    },
    {
      email: 'ana.lima@example.com',
      name: 'Dra. Ana Lima',
      oabNumber: '654321',
      oabState: 'RJ',
      specialties: ['Direito de Família', 'Direito Civil'],
      uf: 'RJ',
      city: 'Rio de Janeiro',
      bio: 'Especialista em Direito de Família e Sucessões.',
      plan: 'FREE' as const,
      rating: 4.6,
      reviewCount: 32,
    },
    {
      email: 'felipe.santos@example.com',
      name: 'Dr. Felipe Santos',
      oabNumber: '789012',
      oabState: 'MG',
      specialties: ['Direito Tributário', 'Direito Empresarial'],
      uf: 'MG',
      city: 'Belo Horizonte',
      bio: 'Advogado tributarista com foco em PMEs e startups.',
      plan: 'PRO' as const,
      rating: 4.9,
      reviewCount: 61,
    },
  ]

  const createdLawyers: { user: any; profile: any }[] = []

  for (const d of lawyerData) {
    const user = await prisma.user.upsert({
      where: { email: d.email },
      update: {},
      create: {
        name: d.name,
        email: d.email,
        password: await bcrypt.hash('123456', 12),
        role: 'LAWYER',
      },
    })

    const profile = await prisma.lawyerProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        oabNumber: d.oabNumber,
        oabState: d.oabState,
        status: 'VERIFIED',
        bio: d.bio,
        specialties: d.specialties,
        uf: d.uf,
        city: d.city,
        plan: d.plan,
        isVisible: true,
        rating: d.rating,
        reviewCount: d.reviewCount,
      },
    })

    createdLawyers.push({ user, profile })
  }
  console.log('✅ Advogados verificados criados')

  // ─── Advogado pendente ──────────────────────────────────────────────────────

  const pendingUser = await prisma.user.upsert({
    where: { email: 'juliana.costa@example.com' },
    update: {},
    create: {
      name: 'Dra. Juliana Costa',
      email: 'juliana.costa@example.com',
      password: await bcrypt.hash('123456', 12),
      role: 'LAWYER',
    },
  })
  await prisma.lawyerProfile.upsert({
    where: { userId: pendingUser.id },
    update: {},
    create: {
      userId: pendingUser.id,
      oabNumber: '345678',
      oabState: 'BA',
      status: 'UNDER_REVIEW',
      specialties: ['Direito Imobiliário', 'Direito Contratual'],
      uf: 'BA',
      city: 'Salvador',
      isVisible: false,
    },
  })
  console.log('✅ Advogado pendente criado')

  // ─── Demandas ───────────────────────────────────────────────────────────────

  const demand1 = await prisma.demand.create({
    data: {
      clientId: client1.id,
      title: 'Preciso de assessoria em rescisão trabalhista',
      description:
        'Fui demitido sem justa causa e tenho dúvidas sobre meus direitos e valores a receber. Trabalhei por 8 anos na empresa.',
      specialty: 'Direito Trabalhista',
      uf: 'SP',
      budget: 500,
      status: 'OPEN',
    },
  })

  const demand2 = await prisma.demand.create({
    data: {
      clientId: client2.id,
      title: 'Consultoria para abertura de empresa',
      description:
        'Quero abrir uma startup de tecnologia e preciso entender a melhor estrutura societária e aspectos tributários.',
      specialty: 'Direito Empresarial',
      uf: 'SP',
      budget: 1200,
      status: 'OPEN',
    },
  })

  const demand3 = await prisma.demand.create({
    data: {
      clientId: client1.id,
      title: 'Divórcio consensual com partilha de bens',
      description:
        'Meu cônjuge e eu decidimos nos divorciar de forma amigável. Temos imóvel e veículos para partilhar.',
      specialty: 'Direito de Família',
      uf: 'RJ',
      status: 'OPEN',
    },
  })
  console.log('✅ Demandas criadas')

  // ─── Proposta + Contrato + Review (fluxo completo) ──────────────────────────

  const lawyer1 = createdLawyers[0]

  // Demanda fechada com contrato concluído para demonstrar avaliação verificada
  const closedDemand = await prisma.demand.create({
    data: {
      clientId: client1.id,
      title: 'Consultoria trabalhista — caso encerrado',
      description: 'Questão resolvida sobre horas extras não pagas.',
      specialty: 'Direito Trabalhista',
      uf: 'SP',
      budget: 800,
      status: 'CLOSED',
      proposalsCount: 1,
    },
  })

  const proposal = await prisma.proposal.create({
    data: {
      demandId: closedDemand.id,
      lawyerProfileId: lawyer1.profile.id,
      description: 'Tenho ampla experiência em rescisões e horas extras. Posso resolver isso rapidamente.',
      price: 750,
      estimatedDays: 30,
      status: 'ACCEPTED',
    },
  })

  const contract = await prisma.contract.create({
    data: {
      demandId: closedDemand.id,
      proposalId: proposal.id,
      clientId: client1.id,
      lawyerUserId: lawyer1.user.id,
      price: 750,
      status: 'COMPLETED',
      signedAt: new Date('2024-01-15'),
      completedAt: new Date('2024-02-20'),
    },
  })

  await prisma.review.create({
    data: {
      contractId: contract.id,
      reviewerId: client1.id,
      lawyerUserId: lawyer1.user.id,
      rating: 5,
      comment:
        'Excelente profissional! Muito atencioso e competente. Resolveu meu caso de horas extras rapidamente e consegui um ótimo acordo.',
      isVerified: true,
    },
  })
  console.log('✅ Fluxo completo: proposta → contrato → avaliação verificada')

  // ─── Posts no feed ──────────────────────────────────────────────────────────

  for (const [i, lawyer] of createdLawyers.entries()) {
    await prisma.post.create({
      data: {
        authorId: lawyer.user.id,
        title: [
          '5 direitos trabalhistas que você precisa conhecer',
          'Como funciona o divórcio consensual no Brasil',
          'Planejamento tributário para startups: guia completo',
        ][i],
        content: [
          'Muitos trabalhadores desconhecem seus direitos fundamentais. O aviso prévio proporcional, o FGTS com multa de 40%, o seguro-desemprego e as verbas rescisórias são garantias constitucionais...',
          'O divórcio consensual é a forma mais rápida e menos onerosa de se divorciar no Brasil. Desde 2010, é possível realizá-lo em cartório quando não há filhos menores ou incapazes...',
          'O planejamento tributário é uma ferramenta legal essencial para startups. Escolher o regime tributário correto (Simples Nacional, Lucro Presumido ou Real) pode economizar até 30% em impostos...',
        ][i],
        tags: [
          ['Direito Trabalhista', 'Dicas', 'Direitos'],
          ['Direito de Família', 'Divórcio'],
          ['Direito Tributário', 'Startups', 'Empresas'],
        ][i],
        likesCount: [124, 89, 201][i],
        commentsCount: [18, 12, 34][i],
      },
    })
  }
  console.log('✅ Posts no feed criados')

  // ─── Pedidos de correspondentes ─────────────────────────────────────────────

  await prisma.correspondentRequest.create({
    data: {
      requesterId: createdLawyers[0].profile.id,
      title: 'Audiência trabalhista — Fórum do Brás/SP',
      description:
        'Necessito de correspondente para audiência de instrução em reclamação trabalhista. Processo com réu revel. Documentos serão enviados com antecedência.',
      uf: 'SP',
      city: 'São Paulo',
      specialty: 'Direito Trabalhista',
      hearing: new Date('2024-04-15T14:00:00'),
      deadline: new Date('2024-04-10'),
      budget: 350,
    },
  })

  await prisma.correspondentRequest.create({
    data: {
      requesterId: createdLawyers[2].profile.id,
      title: 'Sustentação oral — TJMG 2ª Câmara',
      description:
        'Preciso de advogado habilitado no TJMG para sustentação oral em apelação cível. Peças já estão prontas.',
      uf: 'MG',
      city: 'Belo Horizonte',
      specialty: 'Direito Civil',
      hearing: new Date('2024-04-20T10:00:00'),
      deadline: new Date('2024-04-15'),
      budget: 600,
    },
  })
  console.log('✅ Pedidos de correspondentes criados')

  console.log('\n✨ Seed concluído com sucesso!')
  console.log('\nContas disponíveis (senha: 123456):')
  console.log('  Admin:        admin@ajueasy.com.br')
  console.log('  Cliente 1:    joao.cliente@example.com')
  console.log('  Cliente 2:    maria.cliente@example.com')
  console.log('  Advogado 1:   carlos.mendes@example.com  (VERIFIED, PRO)')
  console.log('  Advogado 2:   ana.lima@example.com       (VERIFIED, FREE)')
  console.log('  Advogado 3:   felipe.santos@example.com  (VERIFIED, PRO)')
  console.log('  Advogado 4:   juliana.costa@example.com  (UNDER_REVIEW)\n')
}

main()
  .catch((e) => {
    console.error('❌ Seed falhou:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
