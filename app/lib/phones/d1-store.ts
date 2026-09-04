import type { IngestionCandidate } from '~/lib/phones/ingestion/records';
import type { AsyncMutablePhoneDataStore } from '~/lib/phones/persistence';
import type { Phone, PhoneBrand } from '~/lib/phones/schema';

interface PhoneRow {
  normalized_json: string;
}

export class D1PhoneDataStore implements AsyncMutablePhoneDataStore {
  constructor(private readonly _database: D1Database) {}

  async getByIdentity(brand: PhoneBrand, slug: string) {
    const row = await this._database
      .prepare(
        `SELECT normalized_json FROM phones
         WHERE brand = ?1 AND slug = ?2 AND publication_state = 'published'
         LIMIT 1`,
      )
      .bind(brand, slug)
      .first<PhoneRow>();
    return row ? (JSON.parse(row.normalized_json) as Phone) : undefined;
  }

  async list() {
    const result = await this._database
      .prepare(`SELECT normalized_json FROM phones WHERE publication_state = 'published' ORDER BY brand, model`)
      .all<PhoneRow>();
    return result.results.map((row) => JSON.parse(row.normalized_json) as Phone);
  }

  async writeIngestion(candidate: IngestionCandidate) {
    const { phone, source, provenance, run, changes } = candidate;
    await this._database
      .prepare(
        `INSERT INTO ingestion_runs
          (id, brand, model, started_at, completed_at, status, http_status, parser_version, validation_issues_json)
         VALUES (?1, ?2, ?3, ?4, NULL, 'running', ?5, ?6, ?7)`,
      )
      .bind(
        run.id,
        run.brand,
        run.model ?? null,
        run.startedAt,
        run.httpStatus ?? null,
        run.parserVersion,
        JSON.stringify(run.validationIssues),
      )
      .run();

    try {
      const statements: D1PreparedStatement[] = [
        this._database
          .prepare(
            `INSERT INTO phone_sources
              (id, phone_id, manufacturer, official_url, region, source_hash, content_type, retrieved_at, last_changed_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
             ON CONFLICT(phone_id, official_url, region) DO UPDATE SET
               source_hash = excluded.source_hash,
               content_type = excluded.content_type,
               retrieved_at = excluded.retrieved_at,
               last_changed_at = excluded.last_changed_at`,
          )
          .bind(
            source.id,
            phone.id,
            source.manufacturer,
            source.officialUrl,
            source.region,
            source.sourceHash,
            source.contentType,
            source.retrievedAt,
            source.lastChangedAt,
          ),
        this._database
          .prepare(
            `INSERT INTO phones
              (id, brand, slug, model, series, variant_name, quality, publication_state, parser_version,
               normalized_json, created_at, updated_at, published_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
             ON CONFLICT(id) DO UPDATE SET
               model = excluded.model,
               series = excluded.series,
               variant_name = excluded.variant_name,
               quality = excluded.quality,
               publication_state = excluded.publication_state,
               parser_version = excluded.parser_version,
               normalized_json = excluded.normalized_json,
               updated_at = excluded.updated_at,
               published_at = excluded.published_at`,
          )
          .bind(
            phone.id,
            phone.brand,
            phone.slug,
            phone.model,
            phone.series,
            phone.variantName ?? null,
            phone.quality,
            phone.publicationState,
            phone.parserVersion,
            JSON.stringify(phone),
            run.startedAt,
            run.completedAt ?? run.startedAt,
            phone.publicationState === 'published' ? (run.completedAt ?? run.startedAt) : null,
          ),
        ...provenance.map((item) =>
          this._database
            .prepare(
              `INSERT INTO field_provenance
                (phone_id, field_path, source_id, source_section, source_text, verified_at, parser_version)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
               ON CONFLICT(phone_id, field_path, source_id) DO UPDATE SET
                 source_section = excluded.source_section,
                 source_text = excluded.source_text,
                 verified_at = excluded.verified_at,
                 parser_version = excluded.parser_version`,
            )
            .bind(
              item.phoneId,
              item.fieldPath,
              item.sourceId,
              item.sourceSection,
              item.sourceText,
              item.verifiedAt,
              item.parserVersion,
            ),
        ),
        ...changes.map((change, index) =>
          this._database
            .prepare(
              `INSERT INTO ingestion_changes
                (id, run_id, phone_id, field_path, previous_value_json, new_value_json, source_id, review_status)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
            )
            .bind(
              `${change.runId}:${index}`,
              change.runId,
              change.phoneId,
              change.fieldPath,
              change.previousValue === undefined ? null : JSON.stringify(change.previousValue),
              change.newValue === undefined ? null : JSON.stringify(change.newValue),
              change.sourceId,
              change.reviewStatus,
            ),
        ),
        this._database
          .prepare(`UPDATE ingestion_runs SET completed_at = ?2, status = ?3 WHERE id = ?1`)
          .bind(run.id, run.completedAt ?? new Date().toISOString(), run.status),
      ];
      await this._database.batch(statements);
    } catch (error) {
      await this._database
        .prepare(`UPDATE ingestion_runs SET completed_at = ?2, status = 'failed' WHERE id = ?1`)
        .bind(run.id, new Date().toISOString())
        .run();
      throw error;
    }
  }
}
