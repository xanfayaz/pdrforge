-- CreateTable
CREATE TABLE "Workshop" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "inn" TEXT NOT NULL,
    "ogrn" TEXT NOT NULL,
    "kpp" TEXT NOT NULL DEFAULT '',
    "vatEnabled" BOOLEAN NOT NULL DEFAULT false,
    "vatRate" INTEGER NOT NULL DEFAULT 0,
    "bankName" TEXT NOT NULL,
    "bik" TEXT NOT NULL,
    "account" TEXT NOT NULL,
    "corrAccount" TEXT NOT NULL,
    "stampText" TEXT NOT NULL,
    "logoPath" TEXT,
    "travelBaseFee" INTEGER NOT NULL DEFAULT 2500,
    "travelPerKm" INTEGER NOT NULL DEFAULT 80,
    "adjustMin" INTEGER NOT NULL DEFAULT -20,
    "adjustMax" INTEGER NOT NULL DEFAULT 40,
    "adjustStep" INTEGER NOT NULL DEFAULT 5,
    "staffCanAdjust" BOOLEAN NOT NULL DEFAULT true,
    "priceRoundTo" INTEGER NOT NULL DEFAULT 50,
    "minOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workshop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectionSetting" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DirectionSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControlPoint" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "diameterMm" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,

    CONSTRAINT "ControlPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coefficient" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Coefficient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AreaMatrix" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "widths" JSONB NOT NULL,
    "lengths" JSONB NOT NULL,
    "prices" JSONB NOT NULL,

    CONSTRAINT "AreaMatrix_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArmatureItem" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "panelCode" TEXT,
    "price" INTEGER NOT NULL,
    "minutes" INTEGER NOT NULL DEFAULT 20,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ArmatureItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceItem" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "directionCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "isComplex" BOOLEAN NOT NULL DEFAULT false,
    "minutes" INTEGER NOT NULL DEFAULT 60,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ServiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "color" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "inn" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "plate" TEXT NOT NULL,
    "vin" TEXT NOT NULL,
    "mileage" INTEGER NOT NULL,
    "carClass" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "bodyType" TEXT NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "durationMin" INTEGER NOT NULL DEFAULT 60,
    "assigneeId" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    "travelEnabled" BOOLEAN NOT NULL DEFAULT false,
    "travelKm" INTEGER NOT NULL DEFAULT 0,
    "mileageAt" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderLine" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "directionCode" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "panelCode" TEXT,
    "panelName" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "qty" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "minutes" INTEGER NOT NULL DEFAULT 0,
    "snapshot" JSONB,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "spentAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DirectionSetting_workshopId_idx" ON "DirectionSetting"("workshopId");

-- CreateIndex
CREATE UNIQUE INDEX "DirectionSetting_workshopId_code_key" ON "DirectionSetting"("workshopId", "code");

-- CreateIndex
CREATE INDEX "ControlPoint_workshopId_idx" ON "ControlPoint"("workshopId");

-- CreateIndex
CREATE UNIQUE INDEX "ControlPoint_workshopId_diameterMm_key" ON "ControlPoint"("workshopId", "diameterMm");

-- CreateIndex
CREATE INDEX "Coefficient_workshopId_idx" ON "Coefficient"("workshopId");

-- CreateIndex
CREATE UNIQUE INDEX "Coefficient_workshopId_group_key_key" ON "Coefficient"("workshopId", "group", "key");

-- CreateIndex
CREATE UNIQUE INDEX "AreaMatrix_workshopId_key" ON "AreaMatrix"("workshopId");

-- CreateIndex
CREATE INDEX "ArmatureItem_workshopId_idx" ON "ArmatureItem"("workshopId");

-- CreateIndex
CREATE INDEX "ServiceItem_workshopId_directionCode_idx" ON "ServiceItem"("workshopId", "directionCode");

-- CreateIndex
CREATE INDEX "Employee_workshopId_idx" ON "Employee"("workshopId");

-- CreateIndex
CREATE INDEX "Client_workshopId_idx" ON "Client"("workshopId");

-- CreateIndex
CREATE INDEX "Vehicle_workshopId_idx" ON "Vehicle"("workshopId");

-- CreateIndex
CREATE INDEX "Vehicle_clientId_idx" ON "Vehicle"("clientId");

-- CreateIndex
CREATE INDEX "Order_workshopId_status_idx" ON "Order"("workshopId", "status");

-- CreateIndex
CREATE INDEX "Order_workshopId_scheduledAt_idx" ON "Order"("workshopId", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_workshopId_number_key" ON "Order"("workshopId", "number");

-- CreateIndex
CREATE INDEX "OrderLine_orderId_idx" ON "OrderLine"("orderId");

-- CreateIndex
CREATE INDEX "Photo_lineId_idx" ON "Photo"("lineId");

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");

-- CreateIndex
CREATE INDEX "Expense_workshopId_spentAt_idx" ON "Expense"("workshopId", "spentAt");

-- CreateIndex
CREATE INDEX "Notification_workshopId_read_idx" ON "Notification"("workshopId", "read");

-- AddForeignKey
ALTER TABLE "DirectionSetting" ADD CONSTRAINT "DirectionSetting_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlPoint" ADD CONSTRAINT "ControlPoint_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coefficient" ADD CONSTRAINT "Coefficient_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AreaMatrix" ADD CONSTRAINT "AreaMatrix_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArmatureItem" ADD CONSTRAINT "ArmatureItem_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceItem" ADD CONSTRAINT "ServiceItem_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "OrderLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
