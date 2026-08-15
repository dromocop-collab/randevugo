import type { EntityBase } from "@/types/common";

export interface AuditLog extends EntityBase {
  actorUid: string;
  actorRole: string;
  actorEmail?: string;
  businessId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}
