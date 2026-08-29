-- CreateTable
CREATE TABLE `OnboardingProgress` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER NULL,
    `adminId` INTEGER NULL,
    `tourStartedAt` DATETIME(3) NULL,
    `tourCompletedAt` DATETIME(3) NULL,
    `tourSkippedAt` DATETIME(3) NULL,
    `currentStepId` VARCHAR(191) NULL,
    `tourVersion` INTEGER NULL,
    `whatsNewSeenVersion` INTEGER NULL,
    `checklist` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `OnboardingProgress_employeeId_key`(`employeeId`),
    UNIQUE INDEX `OnboardingProgress_adminId_key`(`adminId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `OnboardingProgress` ADD CONSTRAINT `OnboardingProgress_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OnboardingProgress` ADD CONSTRAINT `OnboardingProgress_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `Admin`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
