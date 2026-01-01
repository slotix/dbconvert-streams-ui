# Multi‑S3 Queries (User Guide)

Use this feature to query files from multiple S3-compatible providers (AWS S3, DigitalOcean Spaces, MinIO, etc.) in a single SQL query.

The key idea is simple: you give each S3 connection an **alias**, and then use that alias as the **URL scheme** in your SQL.

Example: `read_parquet('aws://my-bucket/path/*.parquet')`

## Before you start

- You need one or more **S3 connections** configured in the app (Connections → Add Connection → S3).
- You need the SQL Console (Explorer → SQL Console).

## Step 1 — Create (or verify) your S3 connections

Create one S3 connection per provider you want to query.

Common setups:

- **AWS S3**: Region is required; endpoint is usually empty.
- **DigitalOcean Spaces**: Endpoint is required (e.g., `nyc3.digitaloceanspaces.com`).
- **MinIO / custom S3**: Endpoint is required; you may need path-style URLs.

If your bucket is private, ensure the connection has valid credentials.

## Step 2 — Select data sources and set aliases

In the SQL Console:

1. Open the **Sources** panel.
2. Select the S3 connection(s) you want to use.
3. Assign each connection an **alias** (the UI shows an “as …” field when selected).

Alias rules:

- Must start with a letter
- Use only letters, numbers, and underscores
- Keep them short and readable (examples: `aws`, `do`, `minio`, `s31`)

## Step 3 — Use the alias in SQL

Use the alias as the scheme in your file functions:

```sql
SELECT *
FROM read_parquet('aws://my-bucket/path/to/data/*.parquet')
LIMIT 100;
```

You can use any DuckDB-supported file readers that accept a URL string, for example:

- `read_parquet('alias://bucket/path/*.parquet')`
- `read_csv_auto('alias://bucket/path/*.csv')`
- `read_json_auto('alias://bucket/path/*.json')`

## Examples

### Query two providers in the same query

```sql
SELECT a.actor_id, a.first_name AS aws_name, b.first_name AS do_name
FROM read_parquet('aws://my-bucket/sakila/actor/*.parquet') a
JOIN read_parquet('do://my-bucket/sakila/actor/*.parquet') b
  ON a.actor_id = b.actor_id
LIMIT 50;
```

### Mix database + S3

```sql
SELECT c.id, c.email, o.total
FROM pg1.public.customers c
JOIN read_parquet('aws://analytics/orders/*.parquet') o
  ON c.id = o.customer_id
LIMIT 100;
```

### Same bucket name across providers

This is supported. If two providers use the same bucket name, prefer using distinct prefixes per provider (e.g., `aws://shared-bucket/aws_data/...` and `do://shared-bucket/do_data/...`).

## More examples (copy/paste)

The examples below use aliases like `s31` and `s32`. Your aliases may be different.

### 1) Simple query from each provider

```sql
-- Query actors from AWS S3
SELECT *
FROM read_parquet('s31://dbconvert-streams-test/stream_37a385NUNMXili3gFtPEEF3mrE5/pg1_actor/*.parquet')
LIMIT 10;

-- Query actors from DigitalOcean
SELECT *
FROM read_parquet('s32://dbconvert-streams-test/sakila/actor/*.parquet')
LIMIT 10;
```

### 2) JOIN across both S3 providers

```sql
SELECT
  aws.actor_id,
  aws.first_name AS aws_first_name,
  do.first_name AS do_first_name
FROM read_parquet('s31://dbconvert-streams-test/stream_37a385NUNMXili3gFtPEEF3mrE5/pg1_actor/*.parquet') aws
JOIN read_parquet('s32://dbconvert-streams-test/sakila/actor/*.parquet') do
  ON aws.actor_id = do.actor_id
LIMIT 100;
```

### 3) UNION from both providers

```sql
SELECT 'AWS' AS source, actor_id, first_name, last_name
FROM read_parquet('s31://dbconvert-streams-test/stream_37a385NUNMXili3gFtPEEF3mrE5/pg1_actor/*.parquet')
UNION ALL
SELECT 'DO' AS source, actor_id, first_name, last_name
FROM read_parquet('s32://dbconvert-streams-test/sakila/actor/*.parquet')
ORDER BY actor_id
LIMIT 100;
```

### 4) Cross-provider analytics (films + rentals)

```sql
SELECT
  f.title,
  COUNT(r.rental_id) AS rental_count
FROM read_parquet('s31://dbconvert-streams-test/stream_37a385NUNMXili3gFtPEEF3mrE5/my1_film/*.parquet') f
JOIN read_parquet('s31://dbconvert-streams-test/stream_37a385NUNMXili3gFtPEEF3mrE5/my1_inventory/*.parquet') i
  ON f.film_id = i.film_id
JOIN read_parquet('s32://dbconvert-streams-test/sakila/rental/*.parquet') r
  ON i.inventory_id = r.inventory_id
GROUP BY f.title
ORDER BY rental_count DESC
LIMIT 20;
```

## Templates

The SQL Console includes templates like:

- “Query S3 with alias”
- “JOIN across S3 providers”
- “Database + S3 JOIN”

These templates assume you selected S3 connections and assigned aliases first.

## Troubleshooting

### “unknown S3 alias(es) in query”

Cause: Your SQL uses a scheme like `aws://...`, but you did not select a source with alias `aws`.

Fix:

- In Sources, select the S3 connection and set its alias to match your query.

### Access denied / 403 / signature errors

Cause: Credentials or region/endpoint mismatch.

Fix:

- Verify the S3 connection credentials.
- For DigitalOcean/MinIO/custom endpoints, ensure the endpoint is set correctly.
- For AWS, ensure the region matches the bucket’s region.

### Works for AWS, fails for Spaces/MinIO

Cause: Endpoint + URL style differences.

Fix:

- Confirm your connection’s endpoint is set (Spaces/MinIO usually require it).
- If your provider requires path-style access, ensure the connection is configured accordingly.

## Notes and limitations

- This guide covers **S3** connections. Other cloud providers (GCS/Azure) are not currently supported with alias routing in federated queries.
- Local file queries still work as before (e.g., `read_parquet('/path/file.parquet')`).

## See also

- SQL Console templates (Query S3 with alias, JOIN across S3 providers)
