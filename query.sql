CREATE EXTENSION vector;
-- Create a table to store git text and embeddings
CREATE TABLE git (
  id bigserial primary key,
  content text,
  embedding vector(1536),
  metadata jsonb  -- Added metadata column
);

-- Create a function to search for git
CREATE OR REPLACE FUNCTION match_git (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id bigint,
  content text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
SELECT
  git.id,
  git.content,
  1 - (git.embedding <=> query_embedding) AS similarity
FROM git
WHERE 1 - (git.embedding <=> query_embedding) > match_threshold
ORDER BY similarity DESC 
LIMIT match_count;
$$;