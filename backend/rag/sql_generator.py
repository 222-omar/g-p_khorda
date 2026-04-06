"""
Track B: Text-to-SQL generation using Google Gemini.

1. Takes a user query in Egyptian Arabic.
2. Uses Gemini LLM to generate a safe SQL SELECT statement.
3. Validates the SQL against a strict whitelist.
4. Executes on the database (read-only).
5. Returns structured results.
"""

import os
import re
import logging
from openai import OpenAI
from django.db import connection

logger = logging.getLogger(__name__)

# ── SQL Safety ──────────────────────────────────────────────
ALLOWED_TABLES = {'products', 'auctions', 'bids', 'product_images'}

FORBIDDEN_KEYWORDS = [
    'DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'TRUNCATE',
    'CREATE', 'REPLACE', 'GRANT', 'REVOKE', 'EXEC', 'EXECUTE',
    'MERGE', 'CALL', 'SET', 'COMMIT', 'ROLLBACK', 'SAVEPOINT',
    '--', ';', 'pg_', 'information_schema', 'auth_user',
]

MAX_ROWS = 15


def validate_sql(sql: str) -> tuple[bool, str]:
    """Validate that the generated SQL is safe to execute."""
    if not sql or not sql.strip():
        return False, "Empty SQL"

    # Strip trailing semicolon (LLMs often add it) before validation
    sql = sql.strip().rstrip(';').strip()

    sql_upper = sql.upper()

    if not sql_upper.startswith('SELECT'):
        return False, "Only SELECT statements are allowed"

    for keyword in FORBIDDEN_KEYWORDS:
        if keyword.startswith('-') or keyword == ';':
            if keyword in sql:
                return False, f"Forbidden pattern: {keyword}"
        else:
            pattern = r'\b' + re.escape(keyword) + r'\b'
            if re.search(pattern, sql_upper):
                return False, f"Forbidden keyword: {keyword}"

    table_pattern = r'(?:FROM|JOIN)\s+([a-zA-Z_][a-zA-Z0-9_]*)'
    referenced_tables = set(
        match.lower() for match in re.findall(table_pattern, sql, re.IGNORECASE)
    )
    illegal_tables = referenced_tables - ALLOWED_TABLES
    if illegal_tables:
        return False, f"Illegal tables: {illegal_tables}"

    return True, ""


# ── LLM ────────────────────────────────────────────────────

DB_SCHEMA = """
You have access to these PostgreSQL tables:

TABLE products (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200),
    description TEXT,
    price DECIMAL(10,2),       -- EGP (Egyptian Pounds)
    category VARCHAR(20),      -- 'scrap_metals','electronics','furniture','cars','real_estate','books','other'
    condition VARCHAR(10),     -- 'new','like-new','good','fair'
    status VARCHAR(10),        -- 'active','sold','pending','inactive'
    location VARCHAR(200),
    is_auction BOOLEAN,
    detected_item VARCHAR(100),
    views_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
)

TABLE auctions (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    starting_bid DECIMAL(10,2),
    current_bid DECIMAL(10,2),
    highest_bidder_id INTEGER,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN
)

TABLE bids (
    id SERIAL PRIMARY KEY,
    auction_id INTEGER REFERENCES auctions(id),
    bidder_id INTEGER,
    amount DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE
)

Egyptian slang mappings:
- "تلاجة"/"تلاجه" = refrigerator (category='electronics')
- "غسالة"/"غساله" = washing_machine (category='electronics')
- "خردة"/"خرده" = scrap (category='scrap_metals')
- "عربية"/"سيارة" = car (category='cars')
- "لابتوب"/"لاب" = laptop
- "تكييف" = ac_unit
- "لقطة"/"رخيصة" = cheap/bargain = low price
- "نص اتوماتيك" = half-automatic washing machine
"""

SYSTEM_PROMPT = f"""You are a SQL expert for "4sale", an Egyptian scrap & used-items marketplace.
Convert the user's question (often Egyptian Arabic slang) into a single PostgreSQL SELECT.

{DB_SCHEMA}

RULES:
1. Output ONLY raw SQL. No markdown, no explanation, no backticks.
2. Always include WHERE status = 'active' unless user asks for sold/history.
3. If user mentions price/budget, add price filters.
4. If user asks about auctions, JOIN auctions and filter is_active=true.
5. LIMIT 15 always.
6. Use ILIKE for Arabic text searches.
7. NEVER use DELETE, UPDATE, INSERT, DROP, or any write operation.
"""


def generate_sql(user_query: str) -> str:
    """Use Groq to convert user's Egyptian Arabic query into SQL."""
    try:
        api_key = os.environ.get("GROQ_API_KEY", "").strip('"').strip("'")
        _client = OpenAI(
            api_key=api_key,
            base_url="https://api.groq.com/openai/v1",
        )
        response = _client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_query},
            ],
            temperature=0,
            max_tokens=500,
        )
        sql = response.choices[0].message.content.strip()
        sql = sql.replace("```sql", "").replace("```", "").strip()
        logger.info(f"[RAG/SQL] Generated: {sql[:120]}")
        return sql
    except Exception as e:
        logger.error(f"[RAG/SQL] Grok SQL generation failed: {e}")
        return ""


def execute_safe_sql(sql: str) -> tuple[list[dict], str]:
    """Validate and execute the generated SQL."""
    is_valid, error = validate_sql(sql)
    if not is_valid:
        logger.warning(f"[RAG/SQL] Rejected SQL: {error}")
        return [], f"SQL validation failed: {error}"

    if 'LIMIT' not in sql.upper():
        sql = sql.rstrip().rstrip(';') + f" LIMIT {MAX_ROWS}"

    try:
        with connection.cursor() as cursor:
            cursor.execute(sql)
            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()

        results = []
        for row in rows:
            item = dict(zip(columns, row))
            for k, v in item.items():
                if hasattr(v, 'as_integer_ratio'):
                    item[k] = float(v)
            item['source'] = 'sql'
            results.append(item)

        logger.info(f"[RAG/SQL] Executed OK, {len(results)} rows")
        return results, ""

    except Exception as e:
        logger.error(f"[RAG/SQL] Execution failed: {e}")
        return [], str(e)


def sql_search(user_query: str) -> tuple[list[dict], str]:
    """Full pipeline: generate SQL -> validate -> execute."""
    sql = generate_sql(user_query)
    if not sql:
        return [], ""

    results, error = execute_safe_sql(sql)
    if error:
        logger.warning(f"[RAG/SQL] Error: {error}")
        return [], sql

    return results, sql
