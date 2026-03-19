-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CLIENT', 'LAWYER', 'OFFICE_ADMIN', 'ADMIN');

-- CreateEnum
CREATE TYPE "LawyerStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO', 'OFFICE');

-- CreateEnum
CREATE TYPE "KycDocType" AS ENUM ('OAB_CARD', 'ID_DOCUMENT', 'ADDRESS_PROOF', 'OTHER');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DemandStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('AWAITING_PAYMENT', 'ACTIVE', 'COMPLETED', 'DISPUTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'RELEASED', 'REFUNDED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "CorrespondentStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('CONTACT_INFO', 'FRAUD', 'SPAM', 'ABUSIVE_CONTENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "avatar" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CLIENT',
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "banReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LawyerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "oabNumber" TEXT NOT NULL,
    "oabState" TEXT NOT NULL,
    "status" "LawyerStatus" NOT NULL DEFAULT 'PENDING',
    "bio" TEXT,
    "specialties" TEXT[],
    "uf" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "phone" TEXT,
    "iuguSubAccountId" TEXT,
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "isVisible" BOOLEAN NOT NULL DEFAULT false,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "officeId" TEXT,

    CONSTRAINT "LawyerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KycDocument" (
    "id" TEXT NOT NULL,
    "lawyerProfileId" TEXT NOT NULL,
    "type" "KycDocType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "status" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,

    CONSTRAINT "KycDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "tags" TEXT[],
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "commentsCount" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Like" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Like_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Demand" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "budget" DOUBLE PRECISION,
    "status" "DemandStatus" NOT NULL DEFAULT 'OPEN',
    "proposalsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Demand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "demandId" TEXT NOT NULL,
    "lawyerProfileId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "estimatedDays" INTEGER NOT NULL,
    "status" "ProposalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "demandId" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "lawyerUserId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'AWAITING_PAYMENT',
    "signedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "iuguInvoiceId" TEXT,
    "iuguInvoiceUrl" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "lawyerUserId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorrespondentRequest" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "hearing" TIMESTAMP(3),
    "deadline" TIMESTAMP(3) NOT NULL,
    "budget" DOUBLE PRECISION NOT NULL,
    "status" "CorrespondentStatus" NOT NULL DEFAULT 'OPEN',
    "proposalsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorrespondentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorrespondentProposal" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "lawyerId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "status" "ProposalStatus" NOT NULL DEFAULT 'PENDING',
    "documentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorrespondentProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reportedId" TEXT NOT NULL,
    "type" "ReportType" NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "resolution" TEXT,
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordReset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessoMonitorado" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "numeroProcesso" TEXT NOT NULL,
    "tribunalIndex" TEXT NOT NULL,
    "alias" TEXT,
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessoMonitorado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_role_idx" ON "User"("role");

CREATE UNIQUE INDEX "LawyerProfile_userId_key" ON "LawyerProfile"("userId");
CREATE INDEX "LawyerProfile_uf_status_idx" ON "LawyerProfile"("uf", "status");
CREATE INDEX "LawyerProfile_status_idx" ON "LawyerProfile"("status");
CREATE INDEX "LawyerProfile_oabNumber_oabState_idx" ON "LawyerProfile"("oabNumber", "oabState");

CREATE INDEX "KycDocument_lawyerProfileId_idx" ON "KycDocument"("lawyerProfileId");
CREATE INDEX "KycDocument_status_idx" ON "KycDocument"("status");

CREATE INDEX "Post_authorId_idx" ON "Post"("authorId");
CREATE INDEX "Post_createdAt_idx" ON "Post"("createdAt");

CREATE INDEX "Comment_postId_idx" ON "Comment"("postId");

CREATE UNIQUE INDEX "Like_postId_userId_key" ON "Like"("postId", "userId");
CREATE INDEX "Like_postId_idx" ON "Like"("postId");

CREATE INDEX "Demand_clientId_idx" ON "Demand"("clientId");
CREATE INDEX "Demand_status_uf_idx" ON "Demand"("status", "uf");
CREATE INDEX "Demand_specialty_idx" ON "Demand"("specialty");

CREATE UNIQUE INDEX "Proposal_demandId_lawyerProfileId_key" ON "Proposal"("demandId", "lawyerProfileId");
CREATE INDEX "Proposal_demandId_idx" ON "Proposal"("demandId");
CREATE INDEX "Proposal_lawyerProfileId_idx" ON "Proposal"("lawyerProfileId");

CREATE UNIQUE INDEX "Contract_demandId_key" ON "Contract"("demandId");
CREATE UNIQUE INDEX "Contract_proposalId_key" ON "Contract"("proposalId");
CREATE INDEX "Contract_clientId_idx" ON "Contract"("clientId");
CREATE INDEX "Contract_lawyerUserId_idx" ON "Contract"("lawyerUserId");
CREATE INDEX "Contract_status_idx" ON "Contract"("status");

CREATE UNIQUE INDEX "Payment_contractId_key" ON "Payment"("contractId");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");
CREATE INDEX "Payment_iuguInvoiceId_idx" ON "Payment"("iuguInvoiceId");

CREATE UNIQUE INDEX "Review_contractId_key" ON "Review"("contractId");
CREATE INDEX "Review_lawyerUserId_idx" ON "Review"("lawyerUserId");

CREATE INDEX "CorrespondentRequest_uf_status_idx" ON "CorrespondentRequest"("uf", "status");

CREATE UNIQUE INDEX "CorrespondentProposal_requestId_lawyerId_key" ON "CorrespondentProposal"("requestId", "lawyerId");
CREATE INDEX "CorrespondentProposal_requestId_idx" ON "CorrespondentProposal"("requestId");

CREATE INDEX "Report_status_idx" ON "Report"("status");

CREATE UNIQUE INDEX "ProcessoMonitorado_userId_numeroProcesso_key" ON "ProcessoMonitorado"("userId", "numeroProcesso");
CREATE INDEX "ProcessoMonitorado_userId_idx" ON "ProcessoMonitorado"("userId");

CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

CREATE UNIQUE INDEX "PasswordReset_token_key" ON "PasswordReset"("token");

CREATE INDEX "AuditLog_adminId_idx" ON "AuditLog"("adminId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "LawyerProfile" ADD CONSTRAINT "LawyerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KycDocument" ADD CONSTRAINT "KycDocument_lawyerProfileId_fkey" FOREIGN KEY ("lawyerProfileId") REFERENCES "LawyerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Like" ADD CONSTRAINT "Like_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Like" ADD CONSTRAINT "Like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Demand" ADD CONSTRAINT "Demand_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_demandId_fkey" FOREIGN KEY ("demandId") REFERENCES "Demand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_lawyerProfileId_fkey" FOREIGN KEY ("lawyerProfileId") REFERENCES "LawyerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_demandId_fkey" FOREIGN KEY ("demandId") REFERENCES "Demand"("id") ON UPDATE CASCADE;
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON UPDATE CASCADE;
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON UPDATE CASCADE;
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_lawyerUserId_fkey" FOREIGN KEY ("lawyerUserId") REFERENCES "User"("id") ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON UPDATE CASCADE;
ALTER TABLE "CorrespondentRequest" ADD CONSTRAINT "CorrespondentRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "LawyerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CorrespondentProposal" ADD CONSTRAINT "CorrespondentProposal_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "CorrespondentRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CorrespondentProposal" ADD CONSTRAINT "CorrespondentProposal_lawyerId_fkey" FOREIGN KEY ("lawyerId") REFERENCES "LawyerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_reportedId_fkey" FOREIGN KEY ("reportedId") REFERENCES "User"("id") ON UPDATE CASCADE;
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PasswordReset" ADD CONSTRAINT "PasswordReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON UPDATE CASCADE;
ALTER TABLE "ProcessoMonitorado" ADD CONSTRAINT "ProcessoMonitorado_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
