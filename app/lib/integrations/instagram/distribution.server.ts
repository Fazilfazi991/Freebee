import type { InstagramConfig } from './config.server';
import { sha256 } from './crypto.server';
import { createAssignment, getContent, getPublishingSettings, listAssignments, listContent,
  listPostingSlots, type Assignment, type ContentRow } from './control-db.server';
import { getInstagramAccount, listInstagramAccounts, IntegrationFailure, type ConnectionRow } from './supabase.server';

function localParts(date: Date, timezone: string): { year: number; month: number; day: number; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value('year'), month: value('month'), day: value('day'), hour: value('hour'), minute: value('minute') };
}

export function isValidTimezone(timezone: string): boolean {
  try { new Intl.DateTimeFormat('en-US', { timeZone: timezone }); return true; }
  catch { return false; }
}

export function zonedSlotToUtc(localDate: string, timeOfDay: string, timezone: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(localDate) || !/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/u.test(timeOfDay) || !isValidTimezone(timezone)) return null;
  const [year, month, day] = localDate.split('-').map(Number);
  const [hour, minute] = timeOfDay.split(':').map(Number);
  const target = Date.UTC(year, month - 1, day, hour, minute);
  const verifiedDate = new Date(target).toISOString().slice(0, 10);
  if (verifiedDate !== localDate) return null;
  let candidate = target;
  for (let i = 0; i < 4; i++) {
    const actual = localParts(new Date(candidate), timezone);
    const seen = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute);
    if (seen === target) return new Date(candidate);
    candidate += target - seen;
  }
  // A local time can disappear at a daylight-saving transition. Skip it safely.
  return null;
}

function localDateIn(timezone: string, date: Date): string {
  const p = localParts(date, timezone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

function addLocalDays(localDate: string, days: number): string {
  const [year, month, day] = localDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

async function rankedCandidates(account: ConnectionRow, content: ContentRow[],
  allAssignments: Assignment[], seed: string): Promise<ContentRow[]> {
  const accountAssignments = allAssignments.filter((assignment) => assignment.instagram_account_id === account.id);
  const used = new Set(accountAssignments.map((assignment) => assignment.content_id));
  const candidates = content.filter((item) => item.status === 'ready' && !used.has(item.id));
  if (account.ordering_mode === 'sequential') return candidates.sort((a, b) => a.content_number - b.content_number);
  const usage = new Map<string, number>();
  const recent = new Map<string, number>();
  for (const assignment of allAssignments) {
    if (!['scheduled', 'preparing', 'container_created', 'processing', 'ready', 'publishing', 'published'].includes(assignment.status)) continue;
    usage.set(assignment.content_id, (usage.get(assignment.content_id) ?? 0) + 1);
    const at = Date.parse(assignment.scheduled_at ?? assignment.published_at ?? assignment.created_at);
    if (Number.isFinite(at)) recent.set(assignment.content_id, Math.max(recent.get(assignment.content_id) ?? 0, at));
  }
  const keyed = await Promise.all(candidates.map(async (item) => ({ item,
    tie: await sha256(`${account.id}:${seed}:${item.id}`),
    count: usage.get(item.id) ?? 0, last: recent.get(item.id) ?? 0,
  })));
  keyed.sort((a, b) => account.ordering_mode === 'smart_random'
    ? (a.count - b.count || a.last - b.last || a.tie.localeCompare(b.tie))
    : a.tie.localeCompare(b.tie));
  return keyed.map(({ item }) => item);
}

export async function assignContentToAccount(config: InstagramConfig, ownerId: string, accountId: string,
  contentId: string, scheduledAt?: string): Promise<Assignment> {
  const [account, content] = await Promise.all([
    getInstagramAccount(config, ownerId, accountId), getContent(config, ownerId, contentId),
  ]);
  if (!account) throw new IntegrationFailure('account_not_found');
  if (!content || content.status !== 'ready') throw new IntegrationFailure('content_not_ready');
  if (scheduledAt && (!Number.isFinite(Date.parse(scheduledAt)) || Date.parse(scheduledAt) < Date.now() - 60_000)) {
    throw new IntegrationFailure('invalid_schedule');
  }
  return createAssignment(config, ownerId, { accountId, contentId, caption: content.caption,
    shareToFeed: account.default_share_to_feed ?? true, coverPath: content.cover_storage_path,
    scheduledAt });
}

export async function planPostingSlots(config: InstagramConfig, ownerId: string, now = new Date(),
  horizonHours = 36, maxPlans = 10): Promise<Assignment[]> {
  if (!Number.isSafeInteger(maxPlans) || maxPlans < 1 || maxPlans > 50) throw new IntegrationFailure('invalid_plan_limit');
  const settings = await getPublishingSettings(config);
  if (settings.pause_all) return [];
  const [accounts, slots, existing, content] = await Promise.all([
    listInstagramAccounts(config, ownerId), listPostingSlots(config, ownerId),
    listAssignments(config, ownerId), listContent(config, ownerId),
  ]);
  const planned: Assignment[] = [];
  const horizon = now.getTime() + horizonHours * 3600_000;
  accountLoop: for (const account of accounts) {
    if (account.status !== 'connected' || !account.posting_enabled || !isValidTimezone(account.timezone ?? '')) continue;
    const accountSlots = slots.filter((slot) => slot.instagram_account_id === account.id && slot.enabled)
      .slice(0, account.posts_per_day ?? 2);
    const localToday = localDateIn(account.timezone!, now);
    for (const dayOffset of [0, 1, 2]) {
      const localDate = addLocalDays(localToday, dayOffset);
      for (const slot of accountSlots) {
        if (existing.some((assignment) => assignment.posting_slot_id === slot.id && assignment.slot_local_date === localDate &&
              !['cancelled', 'skipped', 'failed'].includes(assignment.status)) ||
            planned.some((assignment) => assignment.posting_slot_id === slot.id && assignment.slot_local_date === localDate)) continue;
        const due = zonedSlotToUtc(localDate, slot.time_of_day, account.timezone!);
        if (!due) continue;
        // Stable 0–19 minute spread prevents every account hitting Meta at the same second.
        const jitter = Number.parseInt((await sha256(`${account.id}:${slot.id}:${localDate}`)).slice(0, 8), 16) % 20;
        const scheduledAt = new Date(due.getTime() + jitter * 60_000);
        if (scheduledAt.getTime() < now.getTime() || scheduledAt.getTime() > horizon) continue;
        const candidates = await rankedCandidates(account, content, existing, `${slot.id}:${localDate}`);
        for (const content of candidates.slice(0, 3)) {
          try {
            const assignment = await createAssignment(config, ownerId, { accountId: account.id,
              contentId: content.id, caption: content.caption, shareToFeed: account.default_share_to_feed ?? true,
              coverPath: content.cover_storage_path, slotId: slot.id, localDate,
              scheduledAt: scheduledAt.toISOString(), orderPosition: content.content_number });
            planned.push(assignment);
            existing.push(assignment);
            if (planned.length >= maxPlans) break accountLoop;
            break;
          } catch (error) {
            if (!(error instanceof IntegrationFailure) || error.code !== 'duplicate_assignment') throw error;
          }
        }
      }
    }
  }
  return planned;
}
