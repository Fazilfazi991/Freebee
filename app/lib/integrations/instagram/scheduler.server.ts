import type { InstagramConfig } from './config.server';
import { getPublishingSettings, listWorkAssignments } from './control-db.server';
import { planPostingSlots } from './distribution.server';
import { prepareInstagramPublication, processInstagramPublication, publishInstagramPublication } from './publication-workflow.server';
import { getInstagramAccount, IntegrationFailure, updateInstagramAccount } from './supabase.server';

export type SchedulerSummary = {
  planned: number; prepared: number; checked: number; published: number;
  skipped: number; failed: number; autoPublish: boolean; paused: boolean;
};

export async function runInstagramSchedulerTick(config: InstagramConfig, now = new Date()): Promise<SchedulerSummary> {
  const settings = await getPublishingSettings(config);
  const summary: SchedulerSummary = { planned: 0, prepared: 0, checked: 0, published: 0,
    skipped: 0, failed: 0, autoPublish: settings.auto_publish, paused: settings.pause_all };
  if (settings.pause_all) return summary;
  const ownerId = config.adminUserId;
  summary.planned = (await planPostingSlots(config, ownerId, now)).length;
  if (!settings.auto_publish) return summary;
  const work = await listWorkAssignments(config, ownerId, now, 5);
  const touchedAccounts = new Set<string>();
  for (const assignment of work) {
    if (touchedAccounts.has(assignment.instagram_account_id)) { summary.skipped++; continue; }
    touchedAccounts.add(assignment.instagram_account_id);
    try {
      if (assignment.status === 'scheduled') {
        await prepareInstagramPublication(config, ownerId, assignment.id, 'automatic');
        summary.prepared++;
      } else if (['container_created', 'processing'].includes(assignment.status)) {
        if (assignment.last_checked_at && now.getTime() - Date.parse(assignment.last_checked_at) < 60_000) {
          summary.skipped++; continue;
        }
        await processInstagramPublication(config, ownerId, assignment.id);
        summary.checked++;
      } else if (assignment.status === 'ready') {
        await publishInstagramPublication(config, ownerId, assignment.id, 'automatic');
        summary.published++;
      }
    } catch (error) {
      const code = error instanceof IntegrationFailure ? error.code : 'unexpected_failure';
      console.warn(JSON.stringify({ event: 'instagram_scheduler_item_failed',
        assignmentId: assignment.id, accountId: assignment.instagram_account_id, code }));
      if (['token_expired', 'meta_permission_denied', 'missing_credential', 'credential_decrypt_failed'].includes(code)) {
        const account = await getInstagramAccount(config, ownerId, assignment.instagram_account_id).catch(() => null);
        if (account) await updateInstagramAccount(config, ownerId, account.id, {
          posting_enabled: false, auth_failure_count: (account.auth_failure_count ?? 0) + 1,
        }).catch(() => undefined);
      }
      summary.failed++;
    }
  }
  console.info(JSON.stringify({ event: 'instagram_scheduler_tick', ...summary }));
  return summary;
}
