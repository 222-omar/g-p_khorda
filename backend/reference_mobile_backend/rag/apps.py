from django.apps import AppConfig


class RagConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'rag'
    verbose_name = 'RAG Search Engine'

    def ready(self):
        import rag.signals  # noqa: F401

        # Pre-load product embeddings into RAM in a background thread.
        # This ensures the first vector search request doesn't wait for
        # a Neon DB round-trip to fetch all embeddings.
        try:
            from rag.vector_search import warmup_embedding_cache
            warmup_embedding_cache()
        except Exception:
            pass  # Non-fatal — will load on first request
