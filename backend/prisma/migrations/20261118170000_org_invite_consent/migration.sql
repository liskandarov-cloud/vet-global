-- Членство в организации действует после согласия приглашённого.
-- Существующие членства (и создатели организаций) считаются принятыми.
ALTER TABLE "OrgMembership" ADD COLUMN "acceptedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
