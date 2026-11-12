;
;
;
;
;
;
;
;
;
;
;
;
CREATE TABLE IF NOT EXISTS `admin` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sf_unique_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
;
;
;
CREATE TABLE IF NOT EXISTS `agronomists` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `phone` int(11) NOT NULL,
  `password` varchar(255) NOT NULL,
  `photo` varchar(1024) NOT NULL,
  `location` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sf_unique_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
;
;
;
CREATE TABLE IF NOT EXISTS `chats` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sender` varchar(50) NOT NULL,
  `receiver` varchar(50) NOT NULL,
  `message` mediumtext NOT NULL,
  `type` varchar(50) NOT NULL,
  `status` int(11) NOT NULL,
  `time` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
;
;
;
CREATE TABLE IF NOT EXISTS `demand` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product` varchar(255) NOT NULL,
  `measure` varchar(50) NOT NULL,
  `rate` decimal(18,2) NOT NULL,
  `maxsupply` decimal(18,3) NOT NULL,
  `status` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
;
;
;
CREATE TABLE IF NOT EXISTS `farmers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `phone` int(11) NOT NULL,
  `idno` int(11) NOT NULL,
  `password` varchar(255) NOT NULL,
  `location` varchar(255) NOT NULL,
  `status` int(11) NOT NULL,
  `time` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sf_unique_phone` (`phone`),
  UNIQUE KEY `sf_unique_idno` (`idno`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
;
;
;
CREATE TABLE IF NOT EXISTS `inputs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `photo` varchar(1024) NOT NULL,
  `details` mediumtext NOT NULL,
  `cost` decimal(18,2) NOT NULL,
  `county` varchar(50) NOT NULL,
  `time` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
;
;
;
CREATE TABLE IF NOT EXISTS `manager` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sf_unique_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
;
;
;
CREATE TABLE IF NOT EXISTS `news` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `county` varchar(255) NOT NULL,
  `source` varchar(50) NOT NULL,
  `message` mediumtext NOT NULL,
  `time` int(11) NOT NULL,
  `author_role` varchar(16) DEFAULT NULL,
  `author_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
;
;
;
CREATE TABLE IF NOT EXISTS `payments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `farmer` int(11) NOT NULL,
  `description` mediumtext NOT NULL,
  `mode` varchar(50) NOT NULL,
  `transaction` varchar(50) NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `time` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
;
;
;
CREATE TABLE IF NOT EXISTS `products` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product` varchar(255) NOT NULL,
  `photo` varchar(1024) NOT NULL,
  `details` mediumtext NOT NULL,
  `cost` decimal(18,2) NOT NULL,
  `time` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
;
;
;
CREATE TABLE IF NOT EXISTS `purchases` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `item` varchar(255) NOT NULL,
  `photo` varchar(1024) NOT NULL,
  `details` mediumtext NOT NULL,
  `cost` decimal(18,2) NOT NULL,
  `farmer` int(11) NOT NULL,
  `day` varchar(50) NOT NULL,
  `paid` int(11) NOT NULL,
  `time` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
;
;
;
CREATE TABLE IF NOT EXISTS `sales` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `farmer` varchar(255) NOT NULL,
  `product` varchar(255) NOT NULL,
  `photo` varchar(1024) NOT NULL,
  `cost` decimal(18,2) NOT NULL,
  `paid` int(11) NOT NULL,
  `time` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
;
;
;
CREATE TABLE IF NOT EXISTS `sf_audit` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `role` varchar(16) NOT NULL,
  `user_id` int(11) NOT NULL,
  `action` varchar(80) NOT NULL,
  `detail` varchar(255) NOT NULL,
  `created` bigint(20) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
;
;
;
CREATE TABLE IF NOT EXISTS `sf_files` (
  `id` char(36) NOT NULL,
  `pathname` varchar(1024) NOT NULL,
  `owner_role` varchar(16) NOT NULL,
  `owner_id` int(11) NOT NULL,
  `scope` varchar(16) NOT NULL,
  `peer_id` int(11) DEFAULT NULL,
  `mime` varchar(64) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
;
;
;
CREATE TABLE IF NOT EXISTS `sf_login_limits` (
  `identity_hash` char(64) NOT NULL,
  `attempts` int(11) NOT NULL DEFAULT 0,
  `expires` bigint(20) NOT NULL,
  PRIMARY KEY (`identity_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
;
;
;
CREATE TABLE IF NOT EXISTS `sf_payment_allocations` (
  `payment_id` int(11) NOT NULL,
  `record_type` varchar(16) NOT NULL,
  `record_id` int(11) NOT NULL,
  PRIMARY KEY (`record_type`,`record_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
;
;
;
CREATE TABLE IF NOT EXISTS `sf_payment_refs` (
  `reference` varchar(100) NOT NULL,
  `farmer_id` int(11) NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `created` bigint(20) NOT NULL,
  PRIMARY KEY (`reference`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
;
;
;
CREATE TABLE IF NOT EXISTS `sf_reset_tokens` (
  `token_hash` char(64) NOT NULL,
  `role` varchar(16) NOT NULL,
  `user_id` int(11) NOT NULL,
  `expires` bigint(20) NOT NULL,
  PRIMARY KEY (`token_hash`),
  KEY `reset_account` (`role`,`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
;
;
;
CREATE TABLE IF NOT EXISTS `sf_sessions` (
  `token_hash` char(64) NOT NULL,
  `role` varchar(16) NOT NULL,
  `user_id` int(11) NOT NULL,
  `expires` bigint(20) NOT NULL,
  PRIMARY KEY (`token_hash`),
  KEY `account_session` (`role`,`user_id`),
  KEY `session_expiry` (`expires`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
;
;
;
CREATE TABLE IF NOT EXISTS `sf_supply_demands` (
  `supply_id` int(11) NOT NULL,
  `demand_id` int(11) NOT NULL,
  `quantity` decimal(18,3) NOT NULL,
  PRIMARY KEY (`supply_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
;
;
;
CREATE TABLE IF NOT EXISTS `stations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `station` varchar(255) NOT NULL,
  `county` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
;
;
;
CREATE TABLE IF NOT EXISTS `supplies` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `farmer` int(11) NOT NULL,
  `station` varchar(255) NOT NULL,
  `produce` varchar(255) NOT NULL,
  `quantity` varchar(255) NOT NULL,
  `rate` varchar(50) NOT NULL,
  `total` varchar(50) NOT NULL,
  `status` int(11) NOT NULL,
  `paid` int(11) NOT NULL,
  `time` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
;
;

;
;
;
;
;
;
;
