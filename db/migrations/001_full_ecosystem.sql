-- =========================================================================
-- SanatSahnede — Artırımlı MySQL / MariaDB Geçiş Betiği (001)
-- Mevcut tabloları korur (DROP TABLE içermez).
-- =========================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS kyc_status ENUM('unsubmitted','pending','approved','rejected','revision_needed') DEFAULT 'unsubmitted',
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS active_organization_id VARCHAR(64) NULL;

ALTER TABLE user_roles
  MODIFY COLUMN role ENUM(
    'artist','ensemble_leader','business_owner','business_member',
    'venue_manager','technical_provider','organizer','audience',
    'moderator','finance_admin','verification_officer','support','admin'
  ) NOT NULL;

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS discipline VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS specialty_tags JSON NULL,
  MODIFY COLUMN status ENUM('draft','pending_moderation','active','assigned','completed','cancelled','rejected') DEFAULT 'pending_moderation';

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS performer_completed_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS employer_completed_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS payment_ref VARCHAR(120) NULL,
  ADD COLUMN IF NOT EXISTS dispute_status ENUM('none','open','resolved') DEFAULT 'none';

CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS offers (
  id VARCHAR(64) PRIMARY KEY,
  listing_id VARCHAR(64) NOT NULL,
  application_id VARCHAR(64) NULL,
  employer_user_id VARCHAR(64) NOT NULL,
  business_id VARCHAR(64) NOT NULL,
  performer_type ENUM('individual','ensemble') NOT NULL,
  performer_id VARCHAR(64) NOT NULL,
  performer_user_id VARCHAR(64) NOT NULL,
  proposed_amount DECIMAL(12,2) NOT NULL,
  commission_model ENUM('A_EMPLOYER_PAYS','B_ARTIST_DEDUCTS') NOT NULL,
  commission_rate DECIMAL(4,2) NOT NULL,
  net_payout_amount DECIMAL(12,2) NOT NULL,
  commission_amount DECIMAL(12,2) NOT NULL,
  gross_amount DECIMAL(12,2) NOT NULL,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  last_actor_user_id VARCHAR(64) NOT NULL,
  status ENUM('pending','countered','accepted','rejected','expired') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS offer_revisions (
  id VARCHAR(64) PRIMARY KEY,
  offer_id VARCHAR(64) NOT NULL,
  actor_user_id VARCHAR(64) NOT NULL,
  actor_role VARCHAR(50) NOT NULL,
  proposed_amount DECIMAL(12,2) NOT NULL,
  scope_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS disputes (
  id VARCHAR(64) PRIMARY KEY,
  booking_id VARCHAR(64) NOT NULL,
  opened_by_user_id VARCHAR(64) NOT NULL,
  opened_by_role VARCHAR(50) NOT NULL,
  reason TEXT NOT NULL,
  evidence_notes TEXT,
  status ENUM('open','under_review','resolved_refund','resolved_release','closed') DEFAULT 'open',
  resolution_note TEXT,
  resolved_by_user_id VARCHAR(64) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS financial_ledger (
  id VARCHAR(64) PRIMARY KEY,
  booking_id VARCHAR(64) NOT NULL,
  entry_type ENUM('payment_hold','commission_accrual','payout_release','refund','partial_refund') NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'TRY',
  provider VARCHAR(50) NOT NULL,
  provider_ref VARCHAR(120) NOT NULL,
  mode ENUM('sandbox','production') DEFAULT 'sandbox',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS organizations (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  org_type VARCHAR(100) NOT NULL,
  owner_user_id VARCHAR(64) NOT NULL,
  city VARCHAR(100) NOT NULL,
  tax_number VARCHAR(50),
  is_verified BOOLEAN DEFAULT FALSE,
  managed_service_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS organization_members (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  role_title VARCHAR(100) NOT NULL,
  permissions JSON,
  status ENUM('active','invited') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS venues (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NULL,
  manager_user_id VARCHAR(64) NOT NULL,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  city VARCHAR(100) NOT NULL,
  district VARCHAR(100) NOT NULL,
  address TEXT NOT NULL,
  description TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  accessibility_json JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS availability_slots (
  id VARCHAR(64) PRIMARY KEY,
  owner_type ENUM('artist','ensemble','venue','technical_provider') NOT NULL,
  owner_id VARCHAR(64) NOT NULL,
  owner_user_id VARCHAR(64) NOT NULL,
  title VARCHAR(200) NOT NULL,
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_kind ENUM('available','open_stage','free_rehearsal','booked','blocked') DEFAULT 'available',
  is_free BOOLEAN DEFAULT FALSE,
  fee_amount DECIMAL(12,2) DEFAULT 0,
  city VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS technical_providers (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  city VARCHAR(100) NOT NULL,
  service_areas JSON,
  categories JSON,
  description TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR(64) PRIMARY KEY,
  owner_user_id VARCHAR(64) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  disciplines JSON,
  city VARCHAR(100) NOT NULL,
  budget_amount DECIMAL(12,2) DEFAULT 0,
  status ENUM('draft','published','recruiting','in_production','rehearsal','completed','archived') DEFAULT 'recruiting',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS opportunities (
  id VARCHAR(64) PRIMARY KEY,
  creator_user_id VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  organizer_name VARCHAR(200) NOT NULL,
  category VARCHAR(100) NOT NULL,
  discipline VARCHAR(100) NOT NULL,
  city VARCHAR(100) NOT NULL,
  deadline DATE NOT NULL,
  application_method ENUM('internal','external') DEFAULT 'internal',
  external_url VARCHAR(500) NULL,
  status ENUM('pending_moderation','published','rejected') DEFAULT 'pending_moderation',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS feature_flags (
  flag_key VARCHAR(100) PRIMARY KEY,
  label VARCHAR(150) NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  allowed_roles JSON,
  description TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
