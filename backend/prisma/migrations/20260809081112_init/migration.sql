-- CreateTable
CREATE TABLE `Employee` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `staffNumber` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `department` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `laptopHolder` BOOLEAN NOT NULL DEFAULT false,
    `lastWinnerDate` DATETIME(3) NULL,
    `eligible` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Employee_staffNumber_key`(`staffNumber`),
    UNIQUE INDEX `Employee_email_key`(`email`),
    INDEX `Employee_active_idx`(`active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Device` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `assetTag` VARCHAR(191) NOT NULL,
    `deviceType` VARCHAR(191) NOT NULL,
    `brand` VARCHAR(191) NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `cpu` VARCHAR(191) NULL,
    `ram` VARCHAR(191) NULL,
    `storage` VARCHAR(191) NULL,
    `purchaseYear` INTEGER NULL,
    `yearsUsed` INTEGER NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('AVAILABLE', 'REMOVED', 'DRAWN', 'SOLD') NOT NULL DEFAULT 'AVAILABLE',
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Device_assetTag_key`(`assetTag`),
    INDEX `Device_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Registration` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER NOT NULL,
    `deviceId` INTEGER NOT NULL,
    `agreed` BOOLEAN NOT NULL DEFAULT false,
    `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` ENUM('PENDING', 'ELIGIBLE', 'INELIGIBLE', 'WITHDRAWN') NOT NULL DEFAULT 'PENDING',

    INDEX `Registration_employeeId_idx`(`employeeId`),
    INDEX `Registration_deviceId_idx`(`deviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Winner` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER NOT NULL,
    `deviceId` INTEGER NOT NULL,
    `drawId` INTEGER NULL,
    `drawDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `accepted` BOOLEAN NOT NULL DEFAULT false,
    `priceDue` DECIMAL(10, 2) NOT NULL,
    `paymentStatus` ENUM('PENDING', 'PAID', 'NON_PAYMENT') NOT NULL DEFAULT 'PENDING',
    `paymentDate` DATETIME(3) NULL,
    `paymentMethod` VARCHAR(191) NULL,
    `handoverDate` DATETIME(3) NULL,
    `redrawOf` INTEGER NULL,
    `redrawReason` ENUM('DECLINED', 'NON_PAYMENT', 'NO_SHOW', 'ADMIN_OVERRIDE') NULL,

    INDEX `Winner_employeeId_idx`(`employeeId`),
    INDEX `Winner_deviceId_idx`(`deviceId`),
    INDEX `Winner_paymentStatus_idx`(`paymentStatus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Draw` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `deviceId` INTEGER NOT NULL,
    `rngSeed` VARCHAR(191) NOT NULL,
    `candidatePoolSnapshot` JSON NOT NULL,
    `drawnAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `drawnByAdminId` INTEGER NOT NULL,

    INDEX `Draw_deviceId_idx`(`deviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Admin` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `lastLogin` DATETIME(3) NULL,

    UNIQUE INDEX `Admin_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `adminId` INTEGER NULL,
    `action` VARCHAR(191) NOT NULL,
    `entity` VARCHAR(191) NOT NULL,
    `entityId` INTEGER NOT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_entity_entityId_idx`(`entity`, `entityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Registration` ADD CONSTRAINT `Registration_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Registration` ADD CONSTRAINT `Registration_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `Device`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Winner` ADD CONSTRAINT `Winner_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Winner` ADD CONSTRAINT `Winner_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `Device`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Winner` ADD CONSTRAINT `Winner_drawId_fkey` FOREIGN KEY (`drawId`) REFERENCES `Draw`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Winner` ADD CONSTRAINT `Winner_redrawOf_fkey` FOREIGN KEY (`redrawOf`) REFERENCES `Winner`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Draw` ADD CONSTRAINT `Draw_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `Device`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Draw` ADD CONSTRAINT `Draw_drawnByAdminId_fkey` FOREIGN KEY (`drawnByAdminId`) REFERENCES `Admin`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `Admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
