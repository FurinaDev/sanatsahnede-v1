import { DbInstance } from './database';

export function initSchema(db: DbInstance): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      avatar_url TEXT NOT NULL DEFAULT '',
      roles_json TEXT NOT NULL,
      active_role TEXT NOT NULL,
      active_organization_id TEXT,
      is_verified INTEGER NOT NULL DEFAULT 0,
      email_verified INTEGER NOT NULL DEFAULT 0,
      phone_verified INTEGER NOT NULL DEFAULT 0,
      kyc_status TEXT NOT NULL DEFAULT 'unsubmitted',
      is_demo INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      verification_code_email TEXT,
      verification_code_phone TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS platform_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      org_type TEXT NOT NULL,
      owner_user_id TEXT NOT NULL,
      city TEXT NOT NULL,
      tax_number TEXT,
      is_verified INTEGER NOT NULL DEFAULT 0,
      managed_service_enabled INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS organization_members (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      email TEXT NOT NULL,
      role_title TEXT NOT NULL,
      permissions_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS individual_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      stage_name TEXT,
      title TEXT NOT NULL,
      discipline TEXT,
      specialty_tags_json TEXT,
      bio_short TEXT NOT NULL DEFAULT '',
      bio_long TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL,
      district TEXT NOT NULL DEFAULT '',
      primary_instrument TEXT NOT NULL,
      instruments_json TEXT NOT NULL,
      genres_json TEXT NOT NULL,
      education TEXT NOT NULL DEFAULT '',
      experience_years INTEGER NOT NULL DEFAULT 0,
      repertoire_json TEXT NOT NULL,
      video_urls_json TEXT NOT NULL,
      audio_samples_json TEXT NOT NULL,
      cv_url TEXT,
      avatar_url TEXT NOT NULL,
      cover_url TEXT,
      website TEXT,
      social_links_json TEXT,
      is_verified INTEGER NOT NULL DEFAULT 0,
      verification_status TEXT NOT NULL DEFAULT 'pending',
      verification_doc_url TEXT,
      rating_avg REAL NOT NULL DEFAULT 0,
      rating_count INTEGER NOT NULL DEFAULT 0,
      completed_jobs_count INTEGER NOT NULL DEFAULT 0,
      cancellation_rate REAL NOT NULL DEFAULT 0,
      is_recommended INTEGER NOT NULL DEFAULT 0,
      recommendation_period TEXT,
      recommendation_badge TEXT,
      educations_json TEXT,
      experiences_json TEXT,
      media_items_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ensembles (
      id TEXT PRIMARY KEY,
      leader_user_id TEXT NOT NULL,
      payout_responsible_user_id TEXT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      discipline TEXT,
      specialty_tags_json TEXT,
      ensemble_type TEXT NOT NULL,
      bio TEXT NOT NULL DEFAULT '',
      founded_year INTEGER NOT NULL DEFAULT 2024,
      city TEXT NOT NULL,
      genres_json TEXT NOT NULL,
      repertoire_json TEXT NOT NULL,
      video_urls_json TEXT NOT NULL,
      avatar_url TEXT NOT NULL,
      cover_url TEXT,
      website TEXT,
      is_verified INTEGER NOT NULL DEFAULT 0,
      verification_status TEXT NOT NULL DEFAULT 'pending',
      rating_avg REAL NOT NULL DEFAULT 0,
      rating_count INTEGER NOT NULL DEFAULT 0,
      completed_jobs_count INTEGER NOT NULL DEFAULT 0,
      cancellation_rate REAL NOT NULL DEFAULT 0,
      is_recommended INTEGER NOT NULL DEFAULT 0,
      recommendation_period TEXT,
      recommendation_badge TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ensemble_members (
      id TEXT PRIMARY KEY,
      ensemble_id TEXT NOT NULL,
      user_id TEXT,
      email TEXT,
      name TEXT NOT NULL,
      instrument TEXT NOT NULL,
      role_title TEXT NOT NULL,
      joined_year INTEGER NOT NULL,
      avatar_url TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      FOREIGN KEY (ensemble_id) REFERENCES ensembles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS business_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      organization_id TEXT,
      business_name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      business_type TEXT NOT NULL,
      disciplines_json TEXT,
      facilities_json TEXT,
      description TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL,
      district TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      website TEXT,
      phone TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      tax_number TEXT,
      tax_office TEXT,
      official_title TEXT,
      logo_url TEXT NOT NULL,
      cover_url TEXT,
      is_verified INTEGER NOT NULL DEFAULT 0,
      verification_status TEXT NOT NULL DEFAULT 'pending',
      verification_doc_url TEXT,
      rating_avg REAL NOT NULL DEFAULT 0,
      rating_count INTEGER NOT NULL DEFAULT 0,
      completed_bookings_count INTEGER NOT NULL DEFAULT 0,
      is_recommended INTEGER NOT NULL DEFAULT 0,
      recommendation_period TEXT,
      recommendation_badge TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS listings (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      business_name TEXT NOT NULL,
      business_type TEXT NOT NULL,
      business_logo TEXT NOT NULL,
      business_verified INTEGER NOT NULL DEFAULT 0,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      discipline TEXT,
      specialty_tags_json TEXT,
      event_type TEXT NOT NULL,
      genres_json TEXT NOT NULL,
      target_ensemble_type TEXT NOT NULL,
      required_instruments_json TEXT NOT NULL,
      performer_count INTEGER NOT NULL DEFAULT 1,
      duration_mins INTEGER NOT NULL DEFAULT 60,
      event_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      application_deadline TEXT NOT NULL,
      city TEXT NOT NULL,
      district TEXT NOT NULL DEFAULT '',
      venue_name TEXT NOT NULL,
      is_outdoor INTEGER NOT NULL DEFAULT 0,
      repertoire_expectation TEXT NOT NULL DEFAULT '',
      dress_code TEXT NOT NULL DEFAULT '',
      sound_system_provided INTEGER NOT NULL DEFAULT 0,
      transportation_provided INTEGER NOT NULL DEFAULT 0,
      accommodation_provided INTEGER NOT NULL DEFAULT 0,
      budget_amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'TRY',
      status TEXT NOT NULL DEFAULT 'pending_moderation',
      is_replacement INTEGER NOT NULL DEFAULT 0,
      original_listing_id TEXT,
      urgent_reason TEXT,
      applications_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (business_id) REFERENCES business_profiles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      listing_id TEXT NOT NULL,
      applicant_type TEXT NOT NULL,
      applicant_id TEXT NOT NULL,
      applicant_user_id TEXT NOT NULL,
      applicant_name TEXT NOT NULL,
      applicant_avatar TEXT NOT NULL,
      applicant_rating REAL NOT NULL DEFAULT 0,
      applicant_completed_jobs INTEGER NOT NULL DEFAULT 0,
      applicant_cancellation_rate REAL NOT NULL DEFAULT 0,
      applicant_is_verified INTEGER NOT NULL DEFAULT 0,
      instruments_or_type TEXT NOT NULL,
      genres_json TEXT NOT NULL,
      message TEXT NOT NULL,
      participating_members_json TEXT,
      status TEXT NOT NULL DEFAULT 'submitted',
      created_at TEXT NOT NULL,
      FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS offers (
      id TEXT PRIMARY KEY,
      listing_id TEXT NOT NULL,
      listing_title TEXT NOT NULL,
      application_id TEXT,
      employer_user_id TEXT NOT NULL,
      business_id TEXT NOT NULL,
      performer_type TEXT NOT NULL,
      performer_id TEXT NOT NULL,
      performer_user_id TEXT NOT NULL,
      performer_name TEXT NOT NULL,
      proposed_amount REAL NOT NULL,
      commission_model TEXT NOT NULL,
      commission_rate REAL NOT NULL,
      net_payout_amount REAL NOT NULL,
      commission_amount REAL NOT NULL,
      gross_amount REAL NOT NULL,
      event_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      last_actor_user_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS offer_revisions (
      id TEXT PRIMARY KEY,
      offer_id TEXT NOT NULL,
      actor_user_id TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      proposed_amount REAL NOT NULL,
      commission_model TEXT NOT NULL,
      commission_rate REAL NOT NULL,
      net_payout_amount REAL NOT NULL,
      commission_amount REAL NOT NULL,
      gross_amount REAL NOT NULL,
      scope_notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      listing_id TEXT NOT NULL,
      listing_title TEXT NOT NULL,
      business_id TEXT NOT NULL,
      business_name TEXT NOT NULL,
      application_id TEXT NOT NULL,
      performer_type TEXT NOT NULL,
      performer_id TEXT NOT NULL,
      performer_user_id TEXT NOT NULL,
      performer_name TEXT NOT NULL,
      performer_avatar TEXT NOT NULL,
      event_date TEXT NOT NULL,
      start_time TEXT NOT NULL DEFAULT '20:00',
      end_time TEXT NOT NULL DEFAULT '21:30',
      venue_name TEXT NOT NULL,
      city TEXT NOT NULL,
      net_payout_amount REAL NOT NULL,
      commission_amount REAL NOT NULL,
      gross_amount REAL NOT NULL,
      commission_model TEXT NOT NULL,
      commission_rate REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'agreement_pending',
      performer_completed_at TEXT,
      employer_completed_at TEXT,
      contract_terms_accepted_by_performer INTEGER NOT NULL DEFAULT 0,
      contract_terms_accepted_by_employer INTEGER NOT NULL DEFAULT 0,
      payment_status TEXT NOT NULL DEFAULT 'unpaid',
      payment_provider TEXT,
      payment_ref TEXT,
      cancellation_reason TEXT,
      cancelled_by_role TEXT,
      dispute_status TEXT NOT NULL DEFAULT 'none',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contracts (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL UNIQUE,
      version TEXT NOT NULL DEFAULT '1.0',
      title TEXT NOT NULL,
      terms_text TEXT NOT NULL,
      disclaimer TEXT NOT NULL,
      employer_accepted_at TEXT,
      performer_accepted_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS disputes (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL,
      opened_by_user_id TEXT NOT NULL,
      opened_by_role TEXT NOT NULL,
      reason TEXT NOT NULL,
      evidence_notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'open',
      resolution_note TEXT,
      resolved_by_user_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS financial_ledger (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL,
      entry_type TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'TRY',
      provider TEXT NOT NULL,
      provider_ref TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'sandbox',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL,
      reviewer_id TEXT NOT NULL,
      reviewer_name TEXT NOT NULL,
      reviewer_role TEXT NOT NULL,
      target_id TEXT NOT NULL,
      target_name TEXT NOT NULL,
      score_overall INTEGER NOT NULL,
      score_communication INTEGER NOT NULL,
      score_professionalism INTEGER NOT NULL,
      score_quality INTEGER NOT NULL,
      comment TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS verification_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      entity_name TEXT NOT NULL,
      account_type TEXT NOT NULL,
      documents_json TEXT NOT NULL,
      portfolio_url TEXT,
      video_url TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      admin_note TEXT,
      reviewed_by_user_id TEXT,
      reviewed_at TEXT,
      submitted_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      creator_user_id TEXT,
      title TEXT NOT NULL,
      discipline TEXT,
      category TEXT NOT NULL,
      organizer_name TEXT NOT NULL,
      organizer_contact TEXT,
      venue_name TEXT NOT NULL,
      city TEXT NOT NULL,
      district TEXT,
      event_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      genres_json TEXT NOT NULL,
      performers TEXT NOT NULL,
      ticket_price REAL NOT NULL DEFAULT 0,
      is_free INTEGER NOT NULL DEFAULT 0,
      ticket_url TEXT,
      description TEXT NOT NULL,
      poster_url TEXT,
      status TEXT NOT NULL DEFAULT 'pending_moderation',
      is_originals INTEGER NOT NULL DEFAULT 0,
      accessibility_summary_json TEXT,
      accessibility_verified_by TEXT,
      accessibility_verified_at TEXT,
      latitude REAL,
      longitude REAL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS venues (
      id TEXT PRIMARY KEY,
      organization_id TEXT,
      manager_user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      city TEXT NOT NULL,
      district TEXT NOT NULL,
      address TEXT NOT NULL,
      description TEXT NOT NULL,
      contact_phone TEXT NOT NULL DEFAULT '',
      contact_email TEXT NOT NULL DEFAULT '',
      is_verified INTEGER NOT NULL DEFAULT 0,
      accessibility_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS venue_spaces (
      id TEXT PRIMARY KEY,
      venue_id TEXT NOT NULL,
      name TEXT NOT NULL,
      seated_capacity INTEGER NOT NULL DEFAULT 0,
      standing_capacity INTEGER NOT NULL DEFAULT 0,
      stage_dimensions TEXT NOT NULL DEFAULT '',
      technical_equipment_json TEXT NOT NULL,
      FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS availability_slots (
      id TEXT PRIMARY KEY,
      owner_type TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      owner_user_id TEXT NOT NULL,
      owner_name TEXT NOT NULL,
      title TEXT NOT NULL,
      slot_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      recurrence TEXT NOT NULL DEFAULT 'once',
      slot_kind TEXT NOT NULL DEFAULT 'available',
      is_free INTEGER NOT NULL DEFAULT 0,
      fee_amount REAL NOT NULL DEFAULT 0,
      city TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS technical_providers (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      city TEXT NOT NULL,
      service_areas_json TEXT NOT NULL,
      categories_json TEXT NOT NULL,
      description TEXT NOT NULL,
      staff_capacity INTEGER NOT NULL DEFAULT 2,
      is_verified INTEGER NOT NULL DEFAULT 0,
      rating_avg REAL NOT NULL DEFAULT 4.8,
      completed_jobs_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS equipment_inventory (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      brand_model TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      daily_rate REAL NOT NULL DEFAULT 0,
      mode TEXT NOT NULL DEFAULT 'rental',
      is_available INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (provider_id) REFERENCES technical_providers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS service_packages (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      price_amount REAL NOT NULL,
      included_items_json TEXT NOT NULL,
      FOREIGN KEY (provider_id) REFERENCES technical_providers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS technical_requests (
      id TEXT PRIMARY KEY,
      requester_user_id TEXT NOT NULL,
      context_type TEXT NOT NULL,
      context_id TEXT NOT NULL,
      title TEXT NOT NULL,
      city TEXT NOT NULL,
      event_date TEXT NOT NULL,
      required_equipment_json TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS technical_quotes (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      provider_name TEXT NOT NULL,
      amount REAL NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'submitted',
      created_at TEXT NOT NULL,
      FOREIGN KEY (request_id) REFERENCES technical_requests(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS production_workspaces (
      id TEXT PRIMARY KEY,
      context_type TEXT NOT NULL,
      context_id TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      event_date TEXT NOT NULL,
      venue_name TEXT NOT NULL,
      rider_json TEXT NOT NULL,
      stage_plot_json TEXT NOT NULL,
      schedule_json TEXT NOT NULL,
      tasks_json TEXT NOT NULL,
      logistics_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL,
      owner_name TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      disciplines_json TEXT NOT NULL,
      project_type TEXT NOT NULL,
      city TEXT NOT NULL,
      is_remote INTEGER NOT NULL DEFAULT 0,
      budget_amount REAL NOT NULL DEFAULT 0,
      is_volunteer INTEGER NOT NULL DEFAULT 0,
      application_deadline TEXT NOT NULL,
      delivery_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'recruiting',
      roles_needed_json TEXT NOT NULL,
      members_json TEXT NOT NULL,
      tasks_json TEXT NOT NULL,
      meetings_json TEXT NOT NULL,
      expenses_json TEXT NOT NULL,
      files_json TEXT NOT NULL,
      rights_agreement TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS project_applications (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      applicant_user_id TEXT NOT NULL,
      applicant_name TEXT NOT NULL,
      role_title TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'submitted',
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS opportunities (
      id TEXT PRIMARY KEY,
      creator_user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      organizer_name TEXT NOT NULL,
      category TEXT NOT NULL,
      discipline TEXT NOT NULL,
      city TEXT NOT NULL,
      country TEXT NOT NULL DEFAULT 'Türkiye',
      reward_info TEXT NOT NULL,
      deadline TEXT NOT NULL,
      requirements TEXT NOT NULL,
      application_method TEXT NOT NULL DEFAULT 'internal',
      external_url TEXT,
      status TEXT NOT NULL DEFAULT 'pending_moderation',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS opportunity_applications (
      id TEXT PRIMARY KEY,
      opportunity_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      applicant_name TEXT NOT NULL,
      portfolio_label TEXT NOT NULL,
      note TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'submitted',
      created_at TEXT NOT NULL,
      FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_bookmarks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      item_type TEXT NOT NULL,
      item_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, item_type, item_id)
    );

    CREATE TABLE IF NOT EXISTS artist_portfolios (
      id TEXT PRIMARY KEY,
      artist_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      audience_type TEXT NOT NULL,
      identity_role TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'tr',
      visibility TEXT NOT NULL DEFAULT 'public',
      summary TEXT NOT NULL,
      works_list_json TEXT NOT NULL,
      press_quotes_json TEXT NOT NULL,
      awards_json TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS career_records (
      id TEXT PRIMARY KEY,
      artist_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      organization_name TEXT NOT NULL,
      venue_name TEXT NOT NULL,
      role_title TEXT NOT NULL,
      event_date TEXT NOT NULL,
      source_type TEXT NOT NULL,
      source_id TEXT,
      is_verified_record INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      context_type TEXT NOT NULL,
      context_id TEXT NOT NULL,
      title TEXT NOT NULL,
      participant_user_ids_json TEXT NOT NULL,
      last_message_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      sender_user_id TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      body TEXT NOT NULL,
      attachment_url TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      link_view TEXT,
      link_entity_id TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cultural_programs (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      organization_name TEXT NOT NULL,
      title TEXT NOT NULL,
      year INTEGER NOT NULL,
      service_mode TEXT NOT NULL DEFAULT 'self_service',
      assigned_coordinator_name TEXT,
      total_budget REAL NOT NULL DEFAULT 0,
      events_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS originals_programs (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      tagline TEXT NOT NULL,
      description TEXT NOT NULL,
      season_title TEXT NOT NULL,
      city TEXT NOT NULL,
      application_deadline TEXT NOT NULL,
      event_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      jury_members_json TEXT NOT NULL,
      sponsors_json TEXT NOT NULL,
      applications_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS feature_flags (
      flag_key TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      allowed_roles_json TEXT NOT NULL,
      description TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );
  `);
}
