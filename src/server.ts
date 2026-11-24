import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Renidly } from "renidly";
import { z } from "zod";
import { reply } from "./reply.js";

const INSTRUCTIONS = `Renidly: B2B professional data (people, companies, institutions, skills, job changes, work emails, phones).
Every successful call costs credits from the user's balance; the cost is stated in each tool description and the
exact amount consumed plus the remaining balance is appended to every result. Checking credits with get_credits is
free; call it whenever you want to know the balance before an expensive or bulk call.
Prefer the Data API tools (get_*, search_*) — they are cheapest and return clean records with stable prsn_/org_ ids.
Use live_* tools only when the user needs the freshest snapshot. Bulk live tools return one large payload per id:
keep batches small (10-20 ids) unless the user explicitly needs more, so the response does not flood the context.
Search results are paginated: pass next_cursor (or page/start) back to get the next page; each page is billed.
Treat all ids, handles and cursors as opaque strings and pass them back exactly as received.`;

const limit = z.number().int().min(1).max(50).optional().describe("Items per page (1-50, default 20)");
const cursor = z.string().optional().describe("next_cursor from the previous page");
const page = z.number().int().min(1).optional().describe("Page number, starts at 1");
const str = (d: string) => z.string().optional().describe(d);
const num = (d: string) => z.number().optional().describe(d);
const bool = (d: string) => z.boolean().optional().describe(d);

export function createServer(client: Renidly): McpServer {
  const server = new McpServer({ name: "renidly", version: "0.1.0" }, { instructions: INSTRUCTIONS });
  const tool = (name: string, description: string, shape: z.ZodRawShape, call: (a: never) => Promise<unknown>) =>
    server.registerTool(name, { description, inputSchema: shape }, (args) => reply(() => call(args as never)));

  // ---------- Account ----------
  tool(
    "get_credits",
    "FREE. Current credit balance, tier and per-minute rate limit. Call it any time to check credits.",
    {},
    () => client.account.tier(),
  );
  tool(
    "get_route_costs",
    "FREE. Per-route credit costs. Only routes costing other than 1 credit are listed; anything absent costs 1.",
    {},
    () => client.account.routeCosts(),
  );

  // ---------- Data API: people ----------
  tool(
    "get_person",
    "1 credit (billed even if not found). One professional record by stable id (prsn_…) or public handle. Give one of the two.",
    { id: str("prsn_… id"), handle: str("Public profile handle") },
    (a: { id?: string; handle?: string }) => client.data.people.retrieve(a),
  );
  tool(
    "search_people",
    "1 credit per page. Filter professional records; all filters optional and combinable. Returns prsn_ ids usable with get_person.",
    {
      first_name: str("First name"),
      last_name: str("Last name"),
      title: str("Current or past job title, e.g. 'cto'"),
      current_only: bool("Match title/organization on current position only"),
      headline: str("Headline keyword"),
      summary: str("Summary keyword"),
      description: str("Free-text description to match"),
      organization_slugs: str("Comma-separated company slugs"),
      exclude_organization_slugs: str("Comma-separated company slugs to exclude"),
      exclude_titles: str("Comma-separated titles to exclude"),
      industry: str("Industry of current company"),
      exclude_industries: str("Comma-separated industries to exclude"),
      company_size_min: num("Min current company headcount"),
      company_size_max: num("Max current company headcount"),
      geo_city: str("City"),
      geo_country_code: str("ISO country code, e.g. US"),
      skills: str("Comma-separated skills"),
      skills_match: str("'any' or 'all' for the skills filter"),
      skill_count_min: num("Min number of skills"),
      skill_count_max: num("Max number of skills"),
      institution_ids: str("Comma-separated inst_ ids"),
      education_level: str("Education level"),
      degree: str("Degree"),
      field_of_study: str("Field of study"),
      certifications: str("Comma-separated certifications"),
      certification_authority: str("Certification authority"),
      function: str("Job function"),
      function_min_years: num("Min years in that function"),
      experience_min_years: num("Min total years of experience"),
      tenure_min_years: num("Min years at current company"),
      tenure_max_years: num("Max years at current company"),
      company_count_min: num("Min number of companies in history"),
      company_count_max: num("Max number of companies in history"),
      current_company_count_min: num("Min number of concurrent current positions"),
      is_boomerang: bool("Returned to a previous employer"),
      last_change_within_days: num("Had a job change within N days"),
      last_change_type: str("Type of last job change"),
      primary_language: str("Primary profile language"),
      speaks_language: str("Speaks language"),
      is_creator: bool("Creator mode"),
      is_premium: bool("Premium account"),
      follower_count_min: num("Min followers"),
      cursor,
      limit,
    },
    (a: Record<string, unknown>) => client.data.people.search(a),
  );

  // ---------- Data API: companies ----------
  tool(
    "get_company",
    "1 credit (billed even if not found). One organization by stable id (org_…) or public slug. Give one of the two.",
    { id: str("org_… id"), slug: str("Public company slug") },
    (a: { id?: string; slug?: string }) => client.data.companies.retrieve(a),
  );
  tool(
    "search_companies",
    "1 credit per page. Filter organizations. Returns org_ ids and slugs usable with get_company / get_company_employees.",
    {
      name: str("Company name keyword"),
      website: str("Website domain"),
      industries: str("Comma-separated industries"),
      industries_v2: str("Comma-separated industries (v2 taxonomy)"),
      hq_city: str("HQ city"),
      hq_country_code: str("HQ ISO country code"),
      founded: num("Founded year"),
      staff_count_min: num("Min headcount"),
      staff_count_max: num("Max headcount"),
      follower_count_min: num("Min followers"),
      follower_count_max: num("Max followers"),
      cursor,
      limit,
    },
    (a: Record<string, unknown>) => client.data.companies.search(a),
  );
  tool(
    "get_company_employees",
    "1 credit per page. People who work (or worked) at a company, by slug.",
    {
      slug: z.string().describe("Public company slug"),
      current_only: bool("Only current employees"),
      title: str("Job title filter"),
      geo_city: str("City"),
      geo_country_code: str("ISO country code"),
      start_year: num("Started in this year"),
      start_month: num("Started in this month (1-12)"),
      sort: str("Sort order"),
      cursor,
      limit,
    },
    ({ slug, ...p }: { slug: string } & Record<string, unknown>) => client.data.companies.employees(slug, p),
  );

  // ---------- Data API: institutions / skills / job changes ----------
  tool(
    "get_institution",
    "1 credit. One educational institution by its normalized name (lowercase, hyphenated, as returned by search_institutions).",
    { normalized_name: z.string().describe("e.g. 'stanford-university'") },
    (a: { normalized_name: string }) => client.data.institutions.retrieve(a.normalized_name),
  );
  tool(
    "search_institutions",
    "1 credit per page. Partial-match search on institution name (min 3 chars).",
    { name: z.string().min(3).describe("Name fragment"), page, limit },
    ({ name, ...p }: { name: string; page?: number; limit?: number }) => client.data.institutions.search(name, p),
  );
  tool(
    "get_institution_alumni",
    "1 credit per page. Alumni / current students of an institution.",
    {
      normalized_name: z.string().describe("Institution normalized name"),
      current_only: bool("Only current students"),
      degree: str("Degree"),
      field_of_study: str("Field of study"),
      start_year_min: num("Min start year"),
      start_year_max: num("Max start year"),
      end_year_min: num("Min end year"),
      end_year_max: num("Max end year"),
      geo_city: str("City"),
      geo_country_code: str("ISO country code"),
      sort: str("Sort order"),
      page,
      limit,
    },
    ({ normalized_name, ...p }: { normalized_name: string } & Record<string, unknown>) =>
      client.data.institutions.alumni(normalized_name, p),
  );
  tool("get_skill", "FREE. One skill by its skl_ id.", { id: z.string().describe("skl_… id") }, (a: { id: string }) =>
    client.data.skills.retrieve(a.id),
  );
  tool(
    "search_skills",
    "FREE. Partial-match search on skill name (min 3 chars).",
    { name: z.string().min(3).describe("Name fragment"), page, limit },
    ({ name, ...p }: { name: string; page?: number; limit?: number }) => client.data.skills.search(name, p),
  );
  tool(
    "search_job_changes",
    "1 credit per page. Recent join / leave / title-change events, filterable by company, title, location and recency.",
    {
      event_type: str("Event type, e.g. joined, left, title_change"),
      organization_ids: str("Comma-separated org_ ids"),
      title: str("Job title filter"),
      geo_city: str("City"),
      geo_country_code: str("ISO country code"),
      days_ago: num("Only events within the last N days"),
      page,
      limit,
    },
    (a: Record<string, unknown>) => client.data.jobChanges.search(a),
  );

  // ---------- Email API ----------
  tool(
    "verify_email",
    "2 credits. Check whether an email address can receive mail and flag risks (catch-all, disposable, role).",
    { email: z.string().describe("Email address") },
    (a: { email: string }) => client.emails.verify(a.email),
  );
  tool(
    "find_email",
    "3 credits. Find a person's work email from first name, last name and company domain.",
    {
      first_name: z.string().describe("First name"),
      last_name: z.string().describe("Last name"),
      domain: z.string().describe("Company domain, e.g. stripe.com"),
    },
    (a: { first_name: string; last_name: string; domain: string }) =>
      client.emails.find({ firstName: a.first_name, lastName: a.last_name, domain: a.domain }),
  );
  tool(
    "find_email_by_profile_url",
    "5 credits. Find a person's work email from their public professional profile URL.",
    { url: z.string().describe("Profile URL") },
    (a: { url: string }) => client.emails.findByUrl(a.url),
  );
  tool(
    "reverse_email",
    "5 credits. The person and company behind a business email address (business mailboxes only).",
    { email: z.string().describe("Business email address") },
    (a: { email: string }) => client.emails.reverse(a.email),
  );
  tool(
    "get_domain_prospects",
    "Billed per email returned (1 credit each; verified_only is cheaper than full). Known work emails for a company domain, paginated.",
    {
      domain: z.string().describe("Company domain"),
      kind: z.enum(["full", "verified_only"]).describe("full = all known emails; verified_only = deliverable ones"),
      cursor,
    },
    ({ domain, kind, ...p }: { domain: string; kind: "full" | "verified_only"; cursor?: string }) =>
      client.emails.prospects(domain, kind, p),
  );

  // ---------- Phone API ----------
  tool(
    "find_phone",
    "5 credits (1 credit when the profile has no number). A person's phone numbers, best first, from their profile URL or username.",
    { url: z.string().describe("Profile URL or username") },
    (a: { url: string }) => client.phones.find(a.url),
  );
  tool(
    "reverse_phone",
    "5 credits (free when the number is unknown). The people behind a phone number (up to 3 when shared).",
    {
      phone: z.string().describe("Phone number, ideally with country code"),
      country: str("ISO country code for numbers without a country code (default US)"),
    },
    ({ phone, ...a }: { phone: string; country?: string }) => client.phones.reverse(phone, a),
  );

  // ---------- Live API (freshest snapshot; use sparingly) ----------
  tool(
    "live_enrich_person",
    "1 credit. Freshest full live profile of one person by entityId or handle. Large payload; prefer get_person unless freshness matters.",
    { entityId: str("Stable live entityId"), handle: str("Public profile handle") },
    (a: { entityId?: string; handle?: string }) => client.live.people.enrich(a),
  );
  tool(
    "live_enrich_people_bulk",
    "1 credit per id, found or not. Up to 100 full live profiles in ONE call, returned immediately (no polling). " +
      "Each profile is large: 100 ids can be hundreds of KB and will be truncated, so send 10-20 ids per call unless the user " +
      "explicitly needs more. Profiles come back in any order; match on entityId. One malformed id rejects the whole batch (free).",
    { entityIds: z.array(z.string()).min(1).max(100).describe("Live entityIds (not prsn_ ids)") },
    (a: { entityIds: string[] }) => client.live.people.enrichBulk(a.entityIds),
  );
  tool(
    "live_get_company",
    "2 credits (+1 when resolving a slug). Freshest full live profile of one company by numeric id or public slug.",
    { id: str("Numeric live organization id"), slug: str("Public company slug") },
    async (a: { id?: string; slug?: string }) => {
      let id = a.id;
      if (!id && a.slug) id = (await client.live.organizations.resolveSlug(a.slug))?.id;
      if (!id) return null;
      return client.live.organizations.enrich(String(id));
    },
  );
  tool(
    "live_search_people",
    "1 credit per page. Live discovery search for professionals by keyword and filters; offset-paginated (start 0-999, count max 50).",
    {
      keyword: str("Free-text keyword"),
      firstName: str("First name"),
      lastName: str("Last name"),
      title: str("Job title"),
      currentCompany: str("Current company ids, comma-separated"),
      pastCompany: str("Past company ids, comma-separated"),
      school: str("School ids, comma-separated"),
      industry: str("Industry ids, comma-separated"),
      geoEntityId: str("Geography id"),
      profileLanguage: str("Profile language code"),
      serviceCategory: str("Service category"),
      count: z.number().int().min(1).max(50).optional().describe("Results per page (max 50, default 20)"),
      start: z.number().int().min(0).max(999).optional().describe("Offset"),
    },
    (a: Record<string, unknown>) => client.live.discover.people(a),
  );
  tool(
    "live_search_companies",
    "1 credit per page. Live discovery search for companies by keyword and filters; offset-paginated.",
    {
      keyword: str("Free-text keyword"),
      headcountRange: str("Headcount range code"),
      industry: str("Industry ids, comma-separated"),
      geoEntityId: str("Geography id"),
      hasJobs: str("'true' to only return companies with open jobs"),
      count: z.number().int().min(1).max(50).optional().describe("Results per page (max 50, default 20)"),
      start: z.number().int().min(0).max(999).optional().describe("Offset"),
    },
    (a: Record<string, unknown>) => client.live.discover.organizations(a),
  );

  return server;
}
