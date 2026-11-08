-- Migration 002: adds the "purpose" field used by the 3 / 1 / 1 content guideline (guidance only, never a rule).
alter table content add column if not exists purpose text
  check (purpose in ('educate_entertain','trust','promote'));
