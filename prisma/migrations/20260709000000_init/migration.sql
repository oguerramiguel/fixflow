-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'TECHNICIAN');

-- CreateEnum
CREATE TYPE "EquipmentType" AS ENUM ('NOTEBOOK', 'DESKTOP', 'OTHER');

-- CreateEnum
CREATE TYPE "ServiceOrderStatus" AS ENUM ('RECEIVED', 'IN_DIAGNOSIS', 'WAITING_FOR_APPROVAL', 'APPROVED', 'IN_REPAIR', 'FINAL_TESTING', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'TECHNICIAN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "document" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "EquipmentType" NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "serialNumber" TEXT,
    "accessories" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceOrder" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "publicCode" TEXT NOT NULL,
    "reportedIssue" TEXT NOT NULL,
    "status" "ServiceOrderStatus" NOT NULL DEFAULT 'RECEIVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Diagnostic" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "serviceOrderId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "technicalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Diagnostic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "serviceOrderId" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceOrderTimeline" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "serviceOrderId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceOrderTimeline_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_id_organizationId_key" ON "User"("id", "organizationId");
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_id_organizationId_key" ON "Customer"("id", "organizationId");
CREATE INDEX "Customer_organizationId_idx" ON "Customer"("organizationId");
CREATE INDEX "Customer_organizationId_name_idx" ON "Customer"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_id_organizationId_key" ON "Equipment"("id", "organizationId");
CREATE UNIQUE INDEX "Equipment_organizationId_serialNumber_key" ON "Equipment"("organizationId", "serialNumber");
CREATE INDEX "Equipment_organizationId_idx" ON "Equipment"("organizationId");
CREATE INDEX "Equipment_organizationId_customerId_idx" ON "Equipment"("organizationId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceOrder_publicCode_key" ON "ServiceOrder"("publicCode");
CREATE UNIQUE INDEX "ServiceOrder_id_organizationId_key" ON "ServiceOrder"("id", "organizationId");
CREATE INDEX "ServiceOrder_organizationId_idx" ON "ServiceOrder"("organizationId");
CREATE INDEX "ServiceOrder_organizationId_customerId_idx" ON "ServiceOrder"("organizationId", "customerId");
CREATE INDEX "ServiceOrder_organizationId_equipmentId_idx" ON "ServiceOrder"("organizationId", "equipmentId");
CREATE INDEX "ServiceOrder_organizationId_status_idx" ON "ServiceOrder"("organizationId", "status");
CREATE INDEX "ServiceOrder_organizationId_createdAt_idx" ON "ServiceOrder"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Diagnostic_id_organizationId_key" ON "Diagnostic"("id", "organizationId");
CREATE UNIQUE INDEX "Diagnostic_serviceOrderId_organizationId_key" ON "Diagnostic"("serviceOrderId", "organizationId");
CREATE INDEX "Diagnostic_organizationId_idx" ON "Diagnostic"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_id_organizationId_key" ON "Quote"("id", "organizationId");
CREATE INDEX "Quote_organizationId_idx" ON "Quote"("organizationId");
CREATE INDEX "Quote_organizationId_serviceOrderId_idx" ON "Quote"("organizationId", "serviceOrderId");
CREATE INDEX "Quote_organizationId_status_idx" ON "Quote"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteItem_id_organizationId_key" ON "QuoteItem"("id", "organizationId");
CREATE INDEX "QuoteItem_organizationId_idx" ON "QuoteItem"("organizationId");
CREATE INDEX "QuoteItem_organizationId_quoteId_idx" ON "QuoteItem"("organizationId", "quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceOrderTimeline_id_organizationId_key" ON "ServiceOrderTimeline"("id", "organizationId");
CREATE INDEX "ServiceOrderTimeline_organizationId_idx" ON "ServiceOrderTimeline"("organizationId");
CREATE INDEX "ServiceOrderTimeline_organizationId_serviceOrderId_createdAt_idx" ON "ServiceOrderTimeline"("organizationId", "serviceOrderId", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_customerId_organizationId_fkey" FOREIGN KEY ("customerId", "organizationId") REFERENCES "Customer"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOrder" ADD CONSTRAINT "ServiceOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceOrder" ADD CONSTRAINT "ServiceOrder_customerId_organizationId_fkey" FOREIGN KEY ("customerId", "organizationId") REFERENCES "Customer"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceOrder" ADD CONSTRAINT "ServiceOrder_equipmentId_organizationId_fkey" FOREIGN KEY ("equipmentId", "organizationId") REFERENCES "Equipment"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnostic" ADD CONSTRAINT "Diagnostic_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Diagnostic" ADD CONSTRAINT "Diagnostic_serviceOrderId_organizationId_fkey" FOREIGN KEY ("serviceOrderId", "organizationId") REFERENCES "ServiceOrder"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_serviceOrderId_organizationId_fkey" FOREIGN KEY ("serviceOrderId", "organizationId") REFERENCES "ServiceOrder"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_quoteId_organizationId_fkey" FOREIGN KEY ("quoteId", "organizationId") REFERENCES "Quote"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOrderTimeline" ADD CONSTRAINT "ServiceOrderTimeline_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceOrderTimeline" ADD CONSTRAINT "ServiceOrderTimeline_serviceOrderId_organizationId_fkey" FOREIGN KEY ("serviceOrderId", "organizationId") REFERENCES "ServiceOrder"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
