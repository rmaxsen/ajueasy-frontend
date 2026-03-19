import { prisma } from './prisma'

export async function auditLog(adminId: string, action: string, target: string, metadata?: object) {
  try {
    await prisma.auditLog.create({
      data: { adminId, action, target, metadata: metadata ?? {} },
    })
  } catch {
    // Don't throw — audit failure shouldn't break the request
    console.error('[AUDIT] Failed to write audit log:', { adminId, action, target })
  }
}
