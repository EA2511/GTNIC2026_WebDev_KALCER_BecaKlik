-- CreateTable
CREATE TABLE `pangkalan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(100) NOT NULL,
    `alamat` VARCHAR(255) NULL,
    `tarifDasar` INTEGER NOT NULL DEFAULT 5000,
    `tarifPerKm` INTEGER NOT NULL DEFAULT 3000,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(100) NOT NULL,
    `email` VARCHAR(120) NOT NULL,
    `noHp` VARCHAR(20) NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `role` ENUM('ADMIN', 'DRIVER', 'PENUMPANG') NOT NULL,
    `pangkalanId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_role_idx`(`role`),
    INDEX `users_pangkalanId_idx`(`pangkalanId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `drivers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `pangkalanId` INTEGER NOT NULL,
    `status` ENUM('OFFLINE', 'ONLINE', 'ON_TRIP') NOT NULL DEFAULT 'OFFLINE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `drivers_userId_key`(`userId`),
    INDEX `drivers_pangkalanId_status_idx`(`pangkalanId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vehicles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pangkalanId` INTEGER NOT NULL,
    `kodeUnit` VARCHAR(20) NOT NULL,
    `status` ENUM('TERSEDIA', 'DIPAKAI', 'CHARGING', 'SERVIS') NOT NULL DEFAULT 'TERSEDIA',
    `driverId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `vehicles_driverId_key`(`driverId`),
    UNIQUE INDEX `vehicles_pangkalanId_kodeUnit_key`(`pangkalanId`, `kodeUnit`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `driver_queue` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pangkalanId` INTEGER NOT NULL,
    `driverId` INTEGER NOT NULL,
    `status` ENUM('MENUNGGU', 'DILAYANI', 'SELESAI', 'KELUAR') NOT NULL DEFAULT 'MENUNGGU',
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `servedAt` DATETIME(3) NULL,

    INDEX `driver_queue_pangkalanId_status_joinedAt_idx`(`pangkalanId`, `status`, `joinedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `orders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kode` VARCHAR(20) NOT NULL,
    `pangkalanId` INTEGER NOT NULL,
    `penumpangId` INTEGER NOT NULL,
    `driverId` INTEGER NULL,
    `vehicleId` INTEGER NULL,
    `jemputAlamat` VARCHAR(255) NOT NULL,
    `tujuanAlamat` VARCHAR(255) NOT NULL,
    `jarakKm` DECIMAL(5, 2) NOT NULL,
    `tarif` INTEGER NOT NULL,
    `status` ENUM('MENCARI_DRIVER', 'DITERIMA', 'DIJEMPUT', 'BERJALAN', 'SELESAI', 'DIBATALKAN') NOT NULL DEFAULT 'MENCARI_DRIVER',
    `alasanBatal` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `acceptedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,

    UNIQUE INDEX `orders_kode_key`(`kode`),
    INDEX `orders_pangkalanId_status_createdAt_idx`(`pangkalanId`, `status`, `createdAt`),
    INDEX `orders_driverId_completedAt_idx`(`driverId`, `completedAt`),
    INDEX `orders_penumpangId_idx`(`penumpangId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `jumlah` INTEGER NOT NULL,
    `metode` ENUM('TUNAI', 'QRIS') NOT NULL DEFAULT 'TUNAI',
    `status` ENUM('BELUM_BAYAR', 'LUNAS') NOT NULL DEFAULT 'BELUM_BAYAR',
    `paidAt` DATETIME(3) NULL,

    UNIQUE INDEX `payments_orderId_key`(`orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ratings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `skor` INTEGER NOT NULL,
    `komentar` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ratings_orderId_key`(`orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `log_unit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `vehicleId` INTEGER NOT NULL,
    `jenis` ENUM('CHARGING', 'SERVIS') NOT NULL,
    `catatan` VARCHAR(255) NULL,
    `biaya` INTEGER NOT NULL DEFAULT 0,
    `tanggal` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `log_unit_vehicleId_tanggal_idx`(`vehicleId`, `tanggal`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_pangkalanId_fkey` FOREIGN KEY (`pangkalanId`) REFERENCES `pangkalan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `drivers` ADD CONSTRAINT `drivers_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `drivers` ADD CONSTRAINT `drivers_pangkalanId_fkey` FOREIGN KEY (`pangkalanId`) REFERENCES `pangkalan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicles` ADD CONSTRAINT `vehicles_pangkalanId_fkey` FOREIGN KEY (`pangkalanId`) REFERENCES `pangkalan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicles` ADD CONSTRAINT `vehicles_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `drivers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `driver_queue` ADD CONSTRAINT `driver_queue_pangkalanId_fkey` FOREIGN KEY (`pangkalanId`) REFERENCES `pangkalan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `driver_queue` ADD CONSTRAINT `driver_queue_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `drivers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_pangkalanId_fkey` FOREIGN KEY (`pangkalanId`) REFERENCES `pangkalan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_penumpangId_fkey` FOREIGN KEY (`penumpangId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `drivers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ratings` ADD CONSTRAINT `ratings_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `log_unit` ADD CONSTRAINT `log_unit_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
