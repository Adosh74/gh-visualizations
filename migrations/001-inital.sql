CREATE TABLE repositories (
    id VARCHAR PRIMARY KEY,
    owner NOT NULL,
    name VARCHAR NOT NULL,
    last_synced_at INTEGER
);

CREATE TABLE commits (
    id VARCHAR PRIMARY KEY,
    repo_id VARCHAR NOT NULL,
    sha VARCHAR NOT NULL,
    message VARCHAR NOT NULL,
    author_name VARCHAR NOT NULL,
    author_email VARCHAR NOT NULL,
    committed_at INTEGER NOT NULL,
    url VARCHAR NOT NULL,

    FOREIGN KEY (repo_id) REFERENCES repositories (id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE pull_requests (
    id VARCHAR NOT NULL,
    repo_id VARCHAR NOT NULL,
    pr_number VARCHAR NOT NULL,
    title VARCHAR NOT NULL,
    author VARCHAR NOT NULL,
    body VARCHAR NOT NULL,
    merged_at INTEGER NOT NULL,
    url VARCHAR NOT NULL,

    FOREIGN KEY (repo_id) REFERENCES repositories (id) ON DELETE CASCADE ON UPDATE CASCADE
);