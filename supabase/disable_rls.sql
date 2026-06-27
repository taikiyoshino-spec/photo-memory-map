-- 個人用アプリのためRLSを無効化（全操作を許可）
alter table places disable row level security;
alter table trips disable row level security;
alter table groups disable row level security;
alter table visits disable row level security;
alter table photos disable row level security;
alter table group_place_candidates disable row level security;
