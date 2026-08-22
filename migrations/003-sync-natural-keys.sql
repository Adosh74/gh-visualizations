-- Up

ALTER TABLE repositories ADD COLUMN description VARCHAR;
ALTER TABLE repositories ADD COLUMN default_branch VARCHAR;
ALTER TABLE repositories ADD COLUMN synced_branch VARCHAR;

CREATE UNIQUE INDEX IF NOT EXISTS idx_repositories_owner_name
    ON repositories (owner, name);

ALTER TABLE commits ADD COLUMN branch VARCHAR;

CREATE UNIQUE INDEX IF NOT EXISTS idx_commits_repo_sha
    ON commits (repo_id, sha);

CREATE INDEX IF NOT EXISTS idx_commits_repo_committed_at
    ON commits (repo_id, committed_at DESC);

CREATE TABLE pull_requests_new (
    id VARCHAR PRIMARY KEY,
    repo_id VARCHAR NOT NULL,
    pr_number INTEGER NOT NULL,
    title VARCHAR NOT NULL,
    author VARCHAR NOT NULL,
    body VARCHAR,
    state VARCHAR NOT NULL DEFAULT 'open',
    created_at INTEGER NOT NULL DEFAULT 0,
    merged_at INTEGER,
    url VARCHAR NOT NULL,

    FOREIGN KEY (repo_id) REFERENCES repositories (id) ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO pull_requests_new (id, repo_id, pr_number, title, author, body, state, created_at, merged_at, url)
    SELECT id, repo_id, CAST(pr_number AS INTEGER), title, author, body, 'merged', merged_at, merged_at, url
    FROM pull_requests;

DROP TABLE pull_requests;

ALTER TABLE pull_requests_new RENAME TO pull_requests;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pull_requests_repo_number
    ON pull_requests (repo_id, pr_number);

CREATE INDEX IF NOT EXISTS idx_pull_requests_repo_created_at
    ON pull_requests (repo_id, created_at DESC);

-- Down

DROP INDEX IF EXISTS idx_pull_requests_repo_created_at;
DROP INDEX IF EXISTS idx_pull_requests_repo_number;
DROP INDEX IF EXISTS idx_commits_repo_committed_at;
DROP INDEX IF EXISTS idx_commits_repo_sha;
DROP INDEX IF EXISTS idx_repositories_owner_name;
