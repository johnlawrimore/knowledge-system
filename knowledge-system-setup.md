# Knowledge Management System — Setup Instructions

## Prerequisites

- Docker Desktop installed and running
- Node.js 18+ installed (for npx)
- Claude Code CLI installed
- `yt-dlp` installed (`brew install yt-dlp` or `pip3 install yt-dlp`) — required for video-retriever skill

---

## Step 1: Create and Start the MySQL Container

```bash
docker run -d \
  --name knowledge-db \
  -e MYSQL_ROOT_PASSWORD=knowledge2026 \
  -e MYSQL_DATABASE=knowledge \
  -p 3306:3306 \
  --restart unless-stopped \
  mysql:8.0 \
  --default-authentication-plugin=mysql_native_password
```

Wait ~15 seconds for MySQL to initialize, then verify:

```bash
docker exec -it knowledge-db mysql -uroot -pknowledge2026 -e "SELECT 1;"
```

---

## Step 2: Run the Schema

```bash
docker exec -i knowledge-db mysql -uroot -pknowledge2026 knowledge < knowledge-system-schema.sql
```

Verify:

```bash
docker exec -it knowledge-db mysql -uroot -pknowledge2026 knowledge -e "SHOW TABLES;"
```

You should see 17 tables.

---

## Step 3: Create a Dedicated Database User

```bash
docker exec -it knowledge-db mysql -uroot -pknowledge2026 -e "
CREATE USER 'claude'@'%' IDENTIFIED BY 'claude2026';
GRANT ALL PRIVILEGES ON knowledge.* TO 'claude'@'%';
FLUSH PRIVILEGES;
"
```

---

## Step 3b: Install MySQL Client Config in Container

This lets all `docker exec ... mysql` commands authenticate without passing the password on the command line.

```bash
docker cp .my.cnf knowledge-db:/root/.my.cnf
docker exec knowledge-db chmod 600 /root/.my.cnf
```

Verify (should return `1` with no warnings):

```bash
docker exec knowledge-db mysql knowledge -e "SELECT 1;"
```

> **Note:** The `.my.cnf` lives inside the container filesystem. If you destroy and recreate the container (`docker rm -f knowledge-db`), re-run this step after Step 1.

---

## Step 4: Add the MySQL MCP Server to Claude Code

```bash
claude mcp add mysql \
  -e MYSQL_HOST=127.0.0.1 \
  -e MYSQL_PORT=3306 \
  -e MYSQL_USER=claude \
  -e MYSQL_PASS=claude2026 \
  -e MYSQL_DB=knowledge \
  -e MYSQL_DISABLE_READ_ONLY_TRANSACTIONS=true \
  -e ALLOW_INSERT_OPERATION=true \
  -e ALLOW_UPDATE_OPERATION=true \
  -e ALLOW_DELETE_OPERATION=true \
  -- npx -y @benborla29/mcp-server-mysql
```

---

## Step 5: Verify the MCP Connection

Restart Claude Code, then:

```
Show me all tables in the knowledge database.
```

Should list 17 tables. Then:

```
Run this query: SELECT * FROM v_pipeline_status;
```

Should return an empty result, confirming views work.

---

## Step 6: Verify Write Access

```sql
INSERT INTO contributors (name, affiliation, role)
VALUES ('Martin Fowler', 'Thoughtworks', 'Chief Scientist');
SELECT * FROM contributors;
DELETE FROM contributors WHERE name = 'Martin Fowler';
```

---

## Project Structure

Place these files in your Claude Code project:

```
project-root/
├── CLAUDE.md                          # Master project file
├── knowledge-system-schema.sql        # MySQL DDL
├── knowledge-system-dbml.txt          # dbdiagram.io visualization
├── knowledge-system-setup.md          # This file
└── skills/
    ├── collect/SKILL.md               # Source ingestion
    ├── video-retriever/SKILL.md       # YouTube transcript + attribution
    ├── markdown-formatting/SKILL.md   # Formatting rules
    ├── distill/SKILL.md               # Artifact creation
    ├── decompose/SKILL.md             # Claim + evidence extraction
    ├── cluster/SKILL.md               # Claim grouping
    ├── evaluate/SKILL.md              # Credibility scoring
    ├── manage/SKILL.md                # Topics, themes, tags, editorial
    └── status/SKILL.md                # Dashboard + gap analysis
```

---

## Useful Docker Commands

```bash
docker stop knowledge-db              # Stop (preserves data)
docker start knowledge-db             # Start again
docker logs knowledge-db              # View logs
docker exec -it knowledge-db mysql knowledge  # MySQL shell

# Backup
docker exec knowledge-db mysqldump knowledge > knowledge-backup.sql

# Restore
docker exec -i knowledge-db mysql knowledge < knowledge-backup.sql

# Nuclear: destroy and recreate
docker rm -f knowledge-db
# Re-run Step 1
```

---

## Troubleshooting

**"Connection refused"** — MySQL may not be ready. Check `docker logs knowledge-db` for "ready for connections."

**"Access denied"** — Re-run Step 3. Use `'%'` not `'localhost'` — Docker networking requires it.

**MCP not showing** — Run `claude mcp list`. If listed but not connecting, remove and re-add.

**View errors** — Run the full schema SQL in one pass, not statement by statement.

**Container lost after restart** — `--restart unless-stopped` auto-starts with Docker. Enable Docker Desktop start-on-login.
