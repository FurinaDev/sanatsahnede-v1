import { Router } from 'express';
import { DbInstance, parseJson } from '../db/database';
import { AuthedRequest, requireAuth, requireFeatureFlag, requireRole } from '../middleware/auth';
import {
  mapCulturalProgram,
  mapOpportunity,
  mapOpportunityApplication,
  mapOrganization,
  mapOrganizationMember,
  mapOriginalsProgram,
  mapProject,
  mapProjectApplication,
} from '../db/mappers';
import { newId } from '../utils/crypto';
import { logAudit } from '../services/auditService';
import { notifyUser } from '../services/notificationService';

export function createEcosystemRouter(db: DbInstance): Router {
  const router = Router();

  const isOrgAuthorized = (orgId: string, user: NonNullable<AuthedRequest['user']>): boolean => {
    if (user.activeRole === 'admin') return true;
    const org = db.prepare('SELECT owner_user_id FROM organizations WHERE id = ?').get(orgId) as any;
    if (!org) return false;
    if (org.owner_user_id === user.id) return true;
    const member = db
      .prepare(`SELECT id FROM organization_members WHERE organization_id = ? AND user_id = ? AND status = 'active'`)
      .get(orgId, user.id);
    return Boolean(member);
  };

  // ============================================================================
  // 9.1 Project Lab & Collaborative Workspace
  // ============================================================================
  router.get('/projects', requireFeatureFlag(db, 'project_lab'), (_req, res) => {
    const rows = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all() as any[];
    return res.json({ projects: rows.map(mapProject) });
  });

  router.post('/projects', requireAuth, requireFeatureFlag(db, 'project_lab'), (req: AuthedRequest, res) => {
    const {
      title,
      description,
      disciplines = ['Müzik', 'Bileşik Sanatlar'],
      projectType = 'Disiplinlerarası Performans',
      city = 'İstanbul',
      isRemote = false,
      budgetAmount = 0,
      isVolunteer = false,
      applicationDeadline = '2026-12-30',
      deliveryDate = '2027-02-15',
      rolesNeeded = [],
      rightsAgreement = '',
    } = req.body || {};

    if (!title || !description) {
      return res.status(400).json({ error: 'Proje başlığı ve açıklaması zorunludur.' });
    }

    const id = newId('proj');
    const now = new Date().toISOString();
    const ownerName = `${req.user!.firstName} ${req.user!.lastName}`.trim();
    const initialMembers = [{ id: newId('pm'), userId: req.user!.id, name: ownerName, roleTitle: 'Proje Sahibi', status: 'active' }];

    db.prepare(`
      INSERT INTO projects (
        id, owner_user_id, owner_name, title, description, disciplines_json,
        project_type, city, is_remote, budget_amount, is_volunteer,
        application_deadline, delivery_date, status, roles_needed_json,
        members_json, tasks_json, meetings_json, expenses_json, files_json,
        rights_agreement, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'recruiting', ?, ?, '[]', '[]', '[]', '[]', ?, ?)
    `).run(
      id, req.user!.id, ownerName, String(title).trim(), String(description).trim(),
      JSON.stringify(Array.isArray(disciplines) ? disciplines : ['Müzik']),
      projectType, city, isRemote ? 1 : 0, isVolunteer ? 0 : Number(budgetAmount || 0),
      isVolunteer ? 1 : 0, applicationDeadline, deliveryDate,
      JSON.stringify(Array.isArray(rolesNeeded) ? rolesNeeded : []),
      JSON.stringify(initialMembers), rightsAgreement, now
    );

    const created = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    return res.status(201).json({ project: mapProject(created) });
  });

  router.patch('/projects/:id', requireAuth, requireFeatureFlag(db, 'project_lab'), (req: AuthedRequest, res) => {
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id) as any;
    if (!row) return res.status(404).json({ error: 'Proje bulunamadı.' });
    const members = parseJson<Array<{ userId: string }>>(row.members_json, []);
    const isParticipant =
      row.owner_user_id === req.user!.id ||
      members.some((m) => m.userId === req.user!.id) ||
      req.user!.activeRole === 'admin';

    if (!isParticipant) {
      return res.status(403).json({ error: 'Bu proje çalışma alanını yalnızca proje üyeleri güncelleyebilir.' });
    }

    const { status, tasks, meetings, expenses, files, rightsAgreement } = req.body || {};
    db.prepare(`
      UPDATE projects SET
        status = COALESCE(?, status),
        tasks_json = COALESCE(?, tasks_json),
        meetings_json = COALESCE(?, meetings_json),
        expenses_json = COALESCE(?, expenses_json),
        files_json = COALESCE(?, files_json),
        rights_agreement = COALESCE(?, rights_agreement)
      WHERE id = ?
    `).run(
      status ?? null,
      tasks ? JSON.stringify(tasks) : null,
      meetings ? JSON.stringify(meetings) : null,
      expenses ? JSON.stringify(expenses) : null,
      files ? JSON.stringify(files) : null,
      rightsAgreement ?? null,
      row.id
    );

    const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(row.id);
    return res.json({ project: mapProject(updated) });
  });

  router.post('/projects/:id/apply', requireAuth, requireFeatureFlag(db, 'project_lab'), (req: AuthedRequest, res) => {
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id) as any;
    if (!row) return res.status(404).json({ error: 'Proje bulunamadı.' });

    const { roleTitle, message } = req.body || {};
    if (!roleTitle || !message) return res.status(400).json({ error: 'Başvurulan rol ve mesaj zorunludur.' });

    const appId = newId('papp');
    const now = new Date().toISOString();
    const applicantName = `${req.user!.firstName} ${req.user!.lastName}`.trim();

    db.prepare(`
      INSERT INTO project_applications (id, project_id, applicant_user_id, applicant_name, role_title, message, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'submitted', ?)
    `).run(appId, row.id, req.user!.id, applicantName, String(roleTitle).trim(), String(message).trim(), now);

    notifyUser(db, {
      userId: row.owner_user_id,
      type: 'project_application',
      title: 'Projenize Yeni Katılım Başvurusu',
      body: `${applicantName}, "${row.title}" projesindeki "${roleTitle}" rolüne başvurdu.`,
      linkView: 'project_workspace',
      linkEntityId: row.id,
    });

    const created = db.prepare('SELECT * FROM project_applications WHERE id = ?').get(appId);
    return res.status(201).json({ application: mapProjectApplication(created) });
  });

  router.post('/projects/:id/applications/:appId/decide', requireAuth, (req: AuthedRequest, res) => {
    const proj = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id) as any;
    if (!proj) return res.status(404).json({ error: 'Proje bulunamadı.' });
    if (proj.owner_user_id !== req.user!.id && req.user!.activeRole !== 'admin') {
      return res.status(403).json({ error: 'Proje başvurularını yalnızca proje sahibi değerlendirebilir.' });
    }

    const appRow = db.prepare('SELECT * FROM project_applications WHERE id = ? AND project_id = ?').get(req.params.appId, proj.id) as any;
    if (!appRow) return res.status(404).json({ error: 'Başvuru bulunamadı.' });

    const { decision } = req.body || {};
    if (!['accepted', 'rejected', 'shortlisted'].includes(decision)) {
      return res.status(400).json({ error: 'Geçersiz karar.' });
    }

    db.prepare('UPDATE project_applications SET status = ? WHERE id = ?').run(decision, appRow.id);

    if (decision === 'accepted') {
      const members = parseJson<any[]>(proj.members_json, []);
      if (!members.some((m) => m.userId === appRow.applicant_user_id)) {
        members.push({
          id: newId('pm'),
          userId: appRow.applicant_user_id,
          name: appRow.applicant_name,
          roleTitle: appRow.role_title,
          status: 'active',
        });
        db.prepare('UPDATE projects SET members_json = ? WHERE id = ?').run(JSON.stringify(members), proj.id);
      }
      notifyUser(db, {
        userId: appRow.applicant_user_id,
        type: 'project_accepted',
        title: 'Proje Ekibine Kabul Edildiniz',
        body: `"${proj.title}" projesindeki "${appRow.role_title}" rolüne kabul edildiniz.`,
        linkView: 'project_workspace',
        linkEntityId: proj.id,
      });
    }

    const updatedProj = db.prepare('SELECT * FROM projects WHERE id = ?').get(proj.id);
    const updatedApp = db.prepare('SELECT * FROM project_applications WHERE id = ?').get(appRow.id);
    return res.json({ project: mapProject(updatedProj), application: mapProjectApplication(updatedApp) });
  });

  // ============================================================================
  // 9.5 Opportunity Radar & Bookmarks
  // ============================================================================
  router.post('/opportunities', requireAuth, requireFeatureFlag(db, 'opportunity_radar'), (req: AuthedRequest, res) => {
    const {
      title,
      organizerName,
      category = 'Destek & Hibe',
      discipline = 'Müzik',
      city = 'İstanbul',
      country = 'Türkiye',
      rewardInfo,
      deadline,
      requirements = '',
      applicationMethod = 'internal',
      externalUrl,
    } = req.body || {};

    if (!title || !organizerName || !rewardInfo || !deadline) {
      return res.status(400).json({ error: 'Başlık, kurum, destek/ödül bilgisi ve son başvuru tarihi zorunludur.' });
    }

    const id = newId('opp');
    const now = new Date().toISOString();
    const isStaff = ['admin', 'moderator'].includes(req.user!.activeRole);
    const status = isStaff ? 'published' : 'pending_moderation';

    db.prepare(`
      INSERT INTO opportunities (
        id, creator_user_id, title, organizer_name, category, discipline, city, country,
        reward_info, deadline, requirements, application_method, external_url, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, req.user!.id, String(title).trim(), String(organizerName).trim(), category,
      discipline, city, country, rewardInfo, deadline, requirements,
      applicationMethod, externalUrl || null, status, now
    );

    const created = db.prepare('SELECT * FROM opportunities WHERE id = ?').get(id);
    return res.status(201).json({ opportunity: mapOpportunity(created) });
  });

  router.post('/opportunities/:id/apply', requireAuth, requireFeatureFlag(db, 'opportunity_radar'), (req: AuthedRequest, res) => {
    const opp = db.prepare('SELECT * FROM opportunities WHERE id = ?').get(req.params.id) as any;
    if (!opp || opp.status !== 'published') return res.status(404).json({ error: 'Yayınlanmış fırsat bulunamadı.' });

    const { portfolioLabel = 'Ana Sanatçı Portfolyosu', note = '' } = req.body || {};
    const id = newId('oapp');
    const now = new Date().toISOString();
    const applicantName = `${req.user!.firstName} ${req.user!.lastName}`.trim();

    db.prepare(`
      INSERT INTO opportunity_applications (id, opportunity_id, user_id, applicant_name, portfolio_label, note, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'submitted', ?)
    `).run(id, opp.id, req.user!.id, applicantName, portfolioLabel, note, now);

    const created = db.prepare('SELECT * FROM opportunity_applications WHERE id = ?').get(id);
    return res.status(201).json({ application: mapOpportunityApplication(created) });
  });

  router.post('/bookmarks/toggle', requireAuth, (req: AuthedRequest, res) => {
    const { itemType, itemId } = req.body || {};
    if (!itemType || !itemId) return res.status(400).json({ error: 'Öğe türü ve kimliği zorunludur.' });

    const existing = db
      .prepare('SELECT id FROM user_bookmarks WHERE user_id = ? AND item_type = ? AND item_id = ?')
      .get(req.user!.id, itemType, itemId) as { id: string } | undefined;

    if (existing) {
      db.prepare('DELETE FROM user_bookmarks WHERE id = ?').run(existing.id);
      return res.json({ bookmarked: false, id: existing.id });
    }

    const id = newId('bm');
    db.prepare('INSERT INTO user_bookmarks (id, user_id, item_type, item_id, created_at) VALUES (?, ?, ?, ?, ?)').run(
      id, req.user!.id, itemType, itemId, new Date().toISOString()
    );
    return res.status(201).json({ bookmarked: true, bookmark: { id, itemType, itemId } });
  });

  // ============================================================================
  // 9.11 Culture Desk (Corporate Multi-Branch & Annual Programs + Self vs Managed)
  // ============================================================================
  router.post('/culture-desk/organizations', requireAuth, requireFeatureFlag(db, 'culture_desk'), (req: AuthedRequest, res) => {
    const { name, orgType = 'Özel Şirket / Kurumsal', city = 'İstanbul', taxNumber = '' } = req.body || {};
    if (!name) return res.status(400).json({ error: 'Kurum adı zorunludur.' });

    const id = newId('org');
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO organizations (id, name, org_type, owner_user_id, city, tax_number, is_verified, managed_service_enabled, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(id, String(name).trim(), orgType, req.user!.id, city, taxNumber || null, req.user!.isVerified ? 1 : 0, now);

    db.prepare(`
      INSERT INTO organization_members (id, organization_id, user_id, user_name, email, role_title, permissions_json, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'Kurum Sahibi', ?, 'active', ?)
    `).run(
      newId('orgm'), id, req.user!.id, `${req.user!.firstName} ${req.user!.lastName}`.trim(),
      req.user!.email, JSON.stringify(['manage_listings', 'approve_bookings', 'manage_budget', 'manage_staff']), now
    );

    const created = db.prepare('SELECT * FROM organizations WHERE id = ?').get(id);
    return res.status(201).json({ organization: mapOrganization(created) });
  });

  router.post('/culture-desk/organizations/:id/members', requireAuth, requireFeatureFlag(db, 'culture_desk'), (req: AuthedRequest, res) => {
    const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.params.id) as any;
    if (!org) return res.status(404).json({ error: 'Kurum bulunamadı.' });
    if (org.owner_user_id !== req.user!.id && req.user!.activeRole !== 'admin') {
      return res.status(403).json({ error: 'Yetkili ekleme hakkı yalnızca kurum sahibine aittir.' });
    }

    const { userName, email, roleTitle = 'Etkinlik Uzmanı', permissions = ['manage_listings'] } = req.body || {};
    if (!userName || !email) return res.status(400).json({ error: 'Ad ve e-posta zorunludur.' });

    const id = newId('orgm');
    const linkedUser = db.prepare('SELECT id FROM users WHERE email = ?').get(String(email).toLowerCase()) as any;
    db.prepare(`
      INSERT INTO organization_members (id, organization_id, user_id, user_name, email, role_title, permissions_json, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, org.id, linkedUser?.id || `invited_${id}`, String(userName).trim(), String(email).toLowerCase(),
      roleTitle, JSON.stringify(Array.isArray(permissions) ? permissions : ['manage_listings']),
      linkedUser ? 'active' : 'invited', new Date().toISOString()
    );

    const created = db.prepare('SELECT * FROM organization_members WHERE id = ?').get(id);
    return res.status(201).json({ member: mapOrganizationMember(created) });
  });

  router.post('/culture-desk/programs', requireAuth, requireFeatureFlag(db, 'culture_desk'), (req: AuthedRequest, res) => {
    const { organizationId, title, year = 2027, serviceMode = 'self_service', totalBudget = 100000 } = req.body || {};
    const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(organizationId) as any;
    if (!org) return res.status(404).json({ error: 'Kurum bulunamadı.' });
    if (!isOrgAuthorized(org.id, req.user!)) {
      return res.status(403).json({ error: 'Bu kurum adına program oluşturma yetkiniz bulunmamaktadır.' });
    }

    const id = newId('cp');
    const now = new Date().toISOString();
    const coordinator = serviceMode === 'managed_service' ? 'SanatSahnede Kurumsal Program Koordinatörü' : null;
    db.prepare(`
      INSERT INTO cultural_programs (
        id, organization_id, organization_name, title, year, service_mode,
        assigned_coordinator_name, total_budget, events_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '[]', ?)
    `).run(id, org.id, org.name, String(title || `${org.name} ${year} Programı`).trim(), Number(year), serviceMode, coordinator, Number(totalBudget), now);

    logAudit(db, {
      userId: req.user!.id,
      action: serviceMode === 'managed_service' ? 'CULTURE_PROGRAM_MANAGED_CREATED' : 'CULTURE_PROGRAM_SELF_SERVICE_CREATED',
      resourceType: 'cultural_program',
      resourceId: id,
    });

    const created = db.prepare('SELECT * FROM cultural_programs WHERE id = ?').get(id);
    return res.status(201).json({ program: mapCulturalProgram(created) });
  });

  router.post('/culture-desk/programs/:id/events', requireAuth, requireFeatureFlag(db, 'culture_desk'), (req: AuthedRequest, res) => {
    const cp = db.prepare('SELECT * FROM cultural_programs WHERE id = ?').get(req.params.id) as any;
    if (!cp) return res.status(404).json({ error: 'Program bulunamadı.' });
    if (!isOrgAuthorized(cp.organization_id, req.user!)) {
      return res.status(403).json({ error: 'Bu programa etkinlik ekleme yetkiniz bulunmamaktadır.' });
    }

    const { month = 'Ocak 2027', title, discipline = 'Müzik', venueName = 'Ana Salon', budget = 25000 } = req.body || {};
    if (!title) return res.status(400).json({ error: 'Etkinlik başlığı zorunludur.' });

    const events = parseJson<any[]>(cp.events_json, []);
    events.push({
      id: newId('cpe'),
      month,
      title: String(title).trim(),
      discipline,
      venueName,
      budget: Number(budget),
      status: 'planned',
    });

    db.prepare('UPDATE cultural_programs SET events_json = ? WHERE id = ?').run(JSON.stringify(events), cp.id);
    const updated = db.prepare('SELECT * FROM cultural_programs WHERE id = ?').get(cp.id);
    return res.json({ program: mapCulturalProgram(updated) });
  });

  router.patch('/culture-desk/programs/:id/service-mode', requireAuth, requireFeatureFlag(db, 'culture_desk'), (req: AuthedRequest, res) => {
    const cp = db.prepare('SELECT * FROM cultural_programs WHERE id = ?').get(req.params.id) as any;
    if (!cp) return res.status(404).json({ error: 'Program bulunamadı.' });
    if (!isOrgAuthorized(cp.organization_id, req.user!)) {
      return res.status(403).json({ error: 'Bu programın yönetim modunu değiştirme yetkiniz bulunmamaktadır.' });
    }
    const { serviceMode } = req.body || {};
    if (!['self_service', 'managed_service'].includes(serviceMode)) {
      return res.status(400).json({ error: 'Geçersiz yönetim modu.' });
    }

    const coordinator = serviceMode === 'managed_service' ? 'SanatSahnede Kurumsal Program Koordinatörü' : null;
    db.prepare('UPDATE cultural_programs SET service_mode = ?, assigned_coordinator_name = ? WHERE id = ?').run(
      serviceMode, coordinator, cp.id
    );

    logAudit(db, {
      userId: req.user!.id,
      action: serviceMode === 'managed_service' ? 'SWITCH_TO_MANAGED_SERVICE' : 'SWITCH_TO_SELF_SERVICE',
      resourceType: 'cultural_program',
      resourceId: cp.id,
      details: { serviceMode },
    });

    const updated = db.prepare('SELECT * FROM cultural_programs WHERE id = ?').get(cp.id);
    return res.json({ program: mapCulturalProgram(updated) });
  });

  // ============================================================================
  // 10. SanatSahnede Originals Programs
  // ============================================================================
  router.post('/originals/:id/apply', requireAuth, requireFeatureFlag(db, 'originals_programs'), (req: AuthedRequest, res) => {
    const orig = db.prepare('SELECT * FROM originals_programs WHERE id = ?').get(req.params.id) as any;
    if (!orig) return res.status(404).json({ error: 'Originals programı bulunamadı.' });

    const { discipline = 'Müzik', pitch } = req.body || {};
    if (!pitch || !String(pitch).trim()) return res.status(400).json({ error: 'Başvuru açıklaması / proje özeti zorunludur.' });

    const apps = parseJson<any[]>(orig.applications_json, []);
    const applicantName = `${req.user!.firstName} ${req.user!.lastName}`.trim();
    apps.push({
      id: newId('origapp'),
      userId: req.user!.id,
      applicantName,
      discipline,
      pitch: String(pitch).trim(),
      status: 'submitted',
    });

    db.prepare('UPDATE originals_programs SET applications_json = ? WHERE id = ?').run(JSON.stringify(apps), orig.id);
    const updated = db.prepare('SELECT * FROM originals_programs WHERE id = ?').get(orig.id);
    return res.status(201).json({ program: mapOriginalsProgram(updated) });
  });

  router.post(
    '/originals/:id/applications/:appId/review',
    requireAuth,
    requireRole('admin', 'moderator'),
    (req: AuthedRequest, res) => {
      const orig = db.prepare('SELECT * FROM originals_programs WHERE id = ?').get(req.params.id) as any;
      if (!orig) return res.status(404).json({ error: 'Program bulunamadı.' });

      const apps = parseJson<any[]>(orig.applications_json, []);
      const idx = apps.findIndex((a) => a.id === req.params.appId);
      if (idx === -1) return res.status(404).json({ error: 'Başvuru bulunamadı.' });

      const { status, juryScore } = req.body || {};
      if (status) apps[idx].status = status;
      if (juryScore !== undefined) apps[idx].juryScore = Number(juryScore);

      db.prepare('UPDATE originals_programs SET applications_json = ? WHERE id = ?').run(JSON.stringify(apps), orig.id);
      if (status === 'selected') {
        notifyUser(db, {
          userId: apps[idx].userId,
          type: 'originals_selected',
          title: `SanatSahnede Originals: ${orig.title} Seçkisi`,
          body: `"${orig.title}" programına başvurunuz jüri tarafından seçildi!`,
          linkView: 'originals',
        });
      }
      const updated = db.prepare('SELECT * FROM originals_programs WHERE id = ?').get(orig.id);
      return res.json({ program: mapOriginalsProgram(updated) });
    }
  );

  return router;
}
