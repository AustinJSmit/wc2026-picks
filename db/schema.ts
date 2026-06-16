import { pgTable, serial, text, integer, timestamp, unique, jsonb, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name').notNull(),
  age: integer('age'),
  gender: text('gender'),
  country: text('country'),
  favoriteTeam: text('favorite_team'),
  timezone: text('timezone'),
  darkMode: text('dark_mode'),
  isAdmin: boolean('is_admin').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const matches = pgTable('matches', {
  id: serial('id').primaryKey(),
  apiId: text('api_id').unique(),
  homeTeam: text('home_team').notNull(),
  awayTeam: text('away_team').notNull(),
  kickoffAt: timestamp('kickoff_at').notNull(),
  status: text('status').notNull().default('SCHEDULED'), // SCHEDULED | LIVE | FINISHED
  homeScore: integer('home_score'),
  awayScore: integer('away_score'),
  stage: text('stage'),
  homeTeamCrest: text('home_team_crest'),
  awayTeamCrest: text('away_team_crest'),
  goals: jsonb('goals'),
  bookings: jsonb('bookings'),
  statistics: jsonb('statistics'),
  lineups: jsonb('lineups'),
  venue: text('venue'),
  attendance: integer('attendance'),
});

export const lobbies = pgTable('lobbies', {
  id: serial('id').primaryKey(),
  code: text('code').unique().notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const lobbyMembers = pgTable('lobby_members', {
  id: serial('id').primaryKey(),
  lobbyId: integer('lobby_id').references(() => lobbies.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  isHost: boolean('is_host').notNull().default(false),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
}, (t) => [unique().on(t.lobbyId, t.userId)]);

export const predictions = pgTable('predictions', {
  id: serial('id').primaryKey(),
  lobbyId: integer('lobby_id').references(() => lobbies.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  matchId: integer('match_id').references(() => matches.id).notNull(),
  predHome: integer('pred_home').notNull(),
  predAway: integer('pred_away').notNull(),
  points: integer('points'),
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
}, (t) => [unique().on(t.lobbyId, t.userId, t.matchId)]);

export type User = typeof users.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type Prediction = typeof predictions.$inferSelect;
export type Lobby = typeof lobbies.$inferSelect;
export type LobbyMember = typeof lobbyMembers.$inferSelect;
