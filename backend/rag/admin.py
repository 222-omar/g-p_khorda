from django.contrib import admin
from .models import ProductEmbedding, RAGQueryLog


@admin.register(ProductEmbedding)
class ProductEmbeddingAdmin(admin.ModelAdmin):
    list_display = ['product', 'model_name', 'updated_at']
    readonly_fields = ['product', 'embedded_text', 'model_name', 'created_at', 'updated_at']
    search_fields = ['product__title', 'embedded_text']


@admin.register(RAGQueryLog)
class RAGQueryLogAdmin(admin.ModelAdmin):
    list_display = ['query_text_short', 'user', 'merged_results_count', 'latency_ms', 'created_at']
    list_filter = ['created_at']
    readonly_fields = [
        'user', 'query_text', 'generated_sql', 'sql_results_count',
        'vector_results_count', 'merged_results_count', 'final_answer',
        'latency_ms', 'error', 'created_at'
    ]
    search_fields = ['query_text', 'final_answer']

    def query_text_short(self, obj):
        return obj.query_text[:60]
    query_text_short.short_description = 'Query'
