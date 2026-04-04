import {
  pgTable,
  uuid,
  varchar,
  integer,
  numeric,
  boolean,
  text,
  timestamp,
  pgEnum,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ─── ENUMS ────────────────────────────────────────────────
export const activityCategoryEnum = pgEnum('activity_category', [
  'scholarship',
  'competition',
  'extracurricular',
  'research',
  'self_learning',
  'green_ethics',
])

export const opportunityTypeEnum = pgEnum('opportunity_type', [
  'competition',
  'scholarship',
  'workshop',
  'summer_program',
])

export const opportunityScopeEnum = pgEnum('opportunity_scope', [
  'international',
  'national',
  'regional',
])

export const targetMajorEnum = pgEnum('target_major', ['cntt', 'toan_thong_ke'])

// ─── TABLES ───────────────────────────────────────────────

/**
 * User profiles — one row per student (linked to Supabase Auth user_id)
 */
export const userProfiles = pgTable('user_profiles', {
  user_id: uuid('user_id').primaryKey(),          // = Supabase Auth uid
  display_name: varchar('display_name', { length: 100 }).notNull(),
  grade: integer('grade').notNull(),               // 10 | 11 | 12
  school_name: varchar('school_name', { length: 200 }).notNull(),
  province: varchar('province', { length: 100 }).notNull(),
  gpa: numeric('gpa', { precision: 3, scale: 1 }),
  sat_score: integer('sat_score'),                 // 400–1600
  ielts_score: numeric('ielts_score', { precision: 2, scale: 1 }),
  target_major: targetMajorEnum('target_major'),
  target_schools: text('target_schools').array(),  // max 6 school_ids
  created_at: timestamp('created_at').defaultNow().notNull(),
  last_active: timestamp('last_active').defaultNow(),
})

/**
 * Activities — STAR-structured extracurricular records
 */
export const activities = pgTable(
  'activities',
  {
    activity_id: uuid('activity_id').primaryKey().defaultRandom(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => userProfiles.user_id, { onDelete: 'cascade' }),
    category: activityCategoryEnum('category').notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    // STAR fields — server-side validation enforces minimum lengths
    star_situation: text('star_situation').notNull(),  // ≥ 30 chars
    star_task: text('star_task').notNull(),             // ≥ 30 chars
    star_action: text('star_action').notNull(),         // ≥ 50 chars (hard rule)
    star_result: text('star_result').notNull(),         // ≥ 30 chars
    trust_tier: integer('trust_tier').default(1).notNull(), // 1 | 2 | 3
    trust_verified_by: varchar('trust_verified_by', { length: 200 }),
    tech_tags: text('tech_tags').array(),               // auto-tagged by NLP
    base_score: numeric('base_score', { precision: 2, scale: 1 }), // 1.0–5.0
    slot_order: integer('slot_order'),                  // 1–10; UNIQUE per user
    artifact_url: varchar('artifact_url', { length: 500 }),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    // Each slot number must be unique per user (NULL allowed for unslotted)
    uniqueSlotPerUser: uniqueIndex('unique_slot_per_user')
      .on(table.user_id, table.slot_order)
      .where(sql`${table.slot_order} IS NOT NULL`),
    userIdx: index('activities_user_idx').on(table.user_id),
  })
)

/**
 * School personas — Big 6 admission thresholds
 */
export const schoolPersonas = pgTable('school_personas', {
  school_id: varchar('school_id', { length: 50 }).primaryKey(), // e.g. 'vinuni'
  school_name: varchar('school_name', { length: 200 }).notNull(),
  short_name: varchar('short_name', { length: 50 }).notNull(),
  min_sat: integer('min_sat'),
  min_gpa: numeric('min_gpa', { precision: 3, scale: 1 }).notNull(),
  min_ielts: numeric('min_ielts', { precision: 2, scale: 1 }).notNull(),
  has_interview: boolean('has_interview').notNull(),
  min_portfolio_activities: integer('min_portfolio_activities').notNull(),
  preferred_categories: text('preferred_categories').array(),
  persona_description: text('persona_description'),
  source_doc: varchar('source_doc', { length: 300 }),
  source_page: varchar('source_page', { length: 50 }),
  effective_year: integer('effective_year').notNull(),
})

/**
 * STEM Opportunities — competitions, scholarships, workshops
 */
export const opportunities = pgTable('opportunities', {
  opp_id: uuid('opp_id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 200 }).notNull(),
  type: opportunityTypeEnum('type').notNull(),
  field_tags: text('field_tags').array().notNull(),  // at least 1
  scope: opportunityScopeEnum('scope').notNull(),
  is_online: boolean('is_online').notNull(),
  is_free: boolean('is_free').notNull(),
  deadline: timestamp('deadline').notNull(),
  source_url: varchar('source_url', { length: 500 }).notNull(),
  description: text('description'),
  admin_verified: boolean('admin_verified').default(false).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
})

/**
 * Mentors — Big 6 students / alumni verified to advise
 */
export const mentors = pgTable('mentors', {
  mentor_id: uuid('mentor_id').primaryKey().defaultRandom(),
  display_name: varchar('display_name', { length: 100 }).notNull(),
  school: varchar('school', { length: 200 }).notNull(),
  major: varchar('major', { length: 200 }).notNull(),
  expertise_tags: text('expertise_tags').array(),
  bio: text('bio'),
  is_active: boolean('is_active').default(true).notNull(),
  verified: boolean('verified').default(false).notNull(),
  rating: numeric('rating', { precision: 2, scale: 1 }),
  created_at: timestamp('created_at').defaultNow().notNull(),
})

/**
 * Mentor connections — consent-based student ↔ mentor links
 */
export const mentorConnections = pgTable('mentor_connections', {
  connection_id: uuid('connection_id').primaryKey().defaultRandom(),
  student_id: uuid('student_id')
    .notNull()
    .references(() => userProfiles.user_id),
  mentor_id: uuid('mentor_id')
    .notNull()
    .references(() => mentors.mentor_id),
  consented: boolean('consented').default(false).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
})

/**
 * Audit logs — track TrustFactor changes and admin actions
 */
export const auditLogs = pgTable('audit_logs', {
  log_id: uuid('log_id').primaryKey().defaultRandom(),
  entity_type: varchar('entity_type', { length: 50 }).notNull(), // 'activity' | 'opportunity'
  entity_id: uuid('entity_id').notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  performed_by: varchar('performed_by', { length: 200 }),
  metadata: text('metadata'), // JSON string
  created_at: timestamp('created_at').defaultNow().notNull(),
})

// ─── INFERRED TYPES ───────────────────────────────────────
export type UserProfileRow = typeof userProfiles.$inferSelect
export type ActivityRow = typeof activities.$inferSelect
export type SchoolPersonaRow = typeof schoolPersonas.$inferSelect
export type OpportunityRow = typeof opportunities.$inferSelect
export type MentorRow = typeof mentors.$inferSelect
export type MentorConnectionRow = typeof mentorConnections.$inferSelect
export type AuditLogRow = typeof auditLogs.$inferSelect
