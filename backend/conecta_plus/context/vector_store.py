"""
Vector Store - Armazenamento vetorial para busca semântica
"""

import json
import asyncio
import numpy as np
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
import structlog
from dataclasses import dataclass

from ..core.logger import get_logger
from ..services.cache import RedisCache
from .types import VectorSearchResult

logger = get_logger(__name__)


@dataclass
class VectorDocument:
    """Documento com embedding vetorial"""
    doc_id: str
    content: str
    embedding: List[float]
    metadata: Dict[str, Any]
    created_at: datetime = None

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.utcnow()


class VectorStore:
    """Store de vetores para busca semântica eficiente"""

    def __init__(self, redis_cache: RedisCache, dimension: int = 768):
        self.redis = redis_cache
        self.dimension = dimension

        # Índices em memória para performance
        self._documents: Dict[str, VectorDocument] = {}
        self._embeddings_matrix: Optional[np.ndarray] = None
        self._doc_ids: List[str] = []

        # Configuração
        self.similarity_threshold = 0.5
        self.max_results = 100
        self.rebuild_threshold = 1000  # Rebuild índice a cada 1000 docs

        # Estatísticas
        self.total_documents = 0
        self.total_searches = 0

    async def start(self):
        """Inicia o vector store"""
        try:
            logger.info("Starting Vector Store")

            # Carrega documentos do Redis
            await self._load_documents()

            # Reconstrói índice vetorial
            await self._rebuild_vector_index()

            logger.info("Vector Store started",
                       documents=self.total_documents,
                       dimension=self.dimension)

        except Exception as e:
            logger.error("Failed to start Vector Store", error=str(e))
            raise

    async def add_document(self, document: VectorDocument) -> bool:
        """Adiciona um documento ao store"""
        try:
            # Valida embedding
            if len(document.embedding) != self.dimension:
                raise ValueError(f"Embedding dimension mismatch: expected {self.dimension}, got {len(document.embedding)}")

            # Armazena no Redis
            await self.redis.set(
                f"vector_doc:{document.doc_id}",
                {
                    "content": document.content,
                    "embedding": document.embedding,
                    "metadata": document.metadata,
                    "created_at": document.created_at.isoformat()
                },
                ttl=86400  # 24 horas
            )

            # Adiciona ao índice local
            self._documents[document.doc_id] = document
            self.total_documents += 1

            # Reconstrói índice se necessário
            if len(self._documents) % self.rebuild_threshold == 0:
                await self._rebuild_vector_index()
            else:
                # Atualização incremental
                await self._update_vector_index(document)

            logger.info("Document added to vector store",
                       doc_id=document.doc_id,
                       content_length=len(document.content))

            return True

        except Exception as e:
            logger.error("Failed to add document",
                        doc_id=document.doc_id,
                        error=str(e))
            return False

    async def search_similar(self,
                           query_embedding: List[float],
                           max_results: int = None,
                           min_similarity: float = None,
                           filter_metadata: Dict[str, Any] = None) -> List[VectorSearchResult]:
        """Busca documentos similares usando embedding"""
        try:
            max_results = max_results or self.max_results
            min_similarity = min_similarity or self.similarity_threshold

            # Valida query embedding
            if len(query_embedding) != self.dimension:
                raise ValueError(f"Query embedding dimension mismatch")

            # Busca usando matriz de embeddings
            similarities = await self._compute_similarities(query_embedding)

            # Filtra por similaridade mínima
            candidates = [
                (doc_id, similarity)
                for doc_id, similarity in zip(self._doc_ids, similarities)
                if similarity >= min_similarity
            ]

            # Ordena por similaridade
            candidates.sort(key=lambda x: x[1], reverse=True)

            # Aplica filtros de metadata
            if filter_metadata:
                candidates = [
                    (doc_id, similarity)
                    for doc_id, similarity in candidates
                    if self._matches_metadata_filter(doc_id, filter_metadata)
                ]

            # Constrói resultados
            results = []
            for doc_id, similarity in candidates[:max_results]:
                document = self._documents.get(doc_id)
                if document:
                    results.append(VectorSearchResult(
                        memory_id=doc_id,
                        content=document.content,
                        similarity_score=similarity,
                        metadata=document.metadata
                    ))

            self.total_searches += 1

            logger.info("Vector search completed",
                       candidates=len(candidates),
                       results=len(results),
                       min_similarity=min_similarity)

            return results

        except Exception as e:
            logger.error("Failed to search vectors", error=str(e))
            return []

    async def search_by_text(self,
                           query_text: str,
                           embedding_service,
                           max_results: int = None,
                           min_similarity: float = None,
                           filter_metadata: Dict[str, Any] = None) -> List[VectorSearchResult]:
        """Busca por texto (gera embedding automaticamente)"""
        try:
            # Gera embedding para a query
            query_embedding = await embedding_service.embed(query_text)

            return await self.search_similar(
                query_embedding=query_embedding,
                max_results=max_results,
                min_similarity=min_similarity,
                filter_metadata=filter_metadata
            )

        except Exception as e:
            logger.error("Failed to search by text", error=str(e))
            return []

    async def get_document(self, doc_id: str) -> Optional[VectorDocument]:
        """Obtém um documento por ID"""
        try:
            # Verifica cache local
            if doc_id in self._documents:
                return self._documents[doc_id]

            # Busca no Redis
            doc_data = await self.redis.get(f"vector_doc:{doc_id}")
            if not doc_data:
                return None

            document = VectorDocument(
                doc_id=doc_id,
                content=doc_data["content"],
                embedding=doc_data["embedding"],
                metadata=doc_data["metadata"],
                created_at=datetime.fromisoformat(doc_data["created_at"])
            )

            # Adiciona ao cache
            self._documents[doc_id] = document

            return document

        except Exception as e:
            logger.error("Failed to get document",
                        doc_id=doc_id,
                        error=str(e))
            return None

    async def update_document(self,
                            doc_id: str,
                            content: str = None,
                            embedding: List[float] = None,
                            metadata: Dict[str, Any] = None) -> bool:
        """Atualiza um documento existente"""
        try:
            document = await self.get_document(doc_id)
            if not document:
                return False

            # Aplica updates
            if content is not None:
                document.content = content
            if embedding is not None:
                document.embedding = embedding
            if metadata is not None:
                document.metadata.update(metadata)

            # Salva no Redis
            await self.redis.set(
                f"vector_doc:{doc_id}",
                {
                    "content": document.content,
                    "embedding": document.embedding,
                    "metadata": document.metadata,
                    "created_at": document.created_at.isoformat()
                },
                ttl=86400
            )

            # Atualiza cache
            self._documents[doc_id] = document

            # Reconstrói índice se embedding mudou
            if embedding is not None:
                await self._rebuild_vector_index()

            logger.info("Document updated", doc_id=doc_id)
            return True

        except Exception as e:
            logger.error("Failed to update document",
                        doc_id=doc_id,
                        error=str(e))
            return False

    async def delete_document(self, doc_id: str) -> bool:
        """Remove um documento"""
        try:
            # Remove do Redis
            await self.redis.delete(f"vector_doc:{doc_id}")

            # Remove do cache local
            if doc_id in self._documents:
                del self._documents[doc_id]
                self.total_documents -= 1

            # Reconstrói índice
            await self._rebuild_vector_index()

            logger.info("Document deleted", doc_id=doc_id)
            return True

        except Exception as e:
            logger.error("Failed to delete document",
                        doc_id=doc_id,
                        error=str(e))
            return False

    async def get_statistics(self) -> Dict[str, Any]:
        """Obtém estatísticas do vector store"""
        return {
            "total_documents": self.total_documents,
            "total_searches": self.total_searches,
            "dimension": self.dimension,
            "cache_size": len(self._documents),
            "similarity_threshold": self.similarity_threshold,
            "index_size": self._embeddings_matrix.shape if self._embeddings_matrix is not None else None
        }

    async def clear_store(self) -> bool:
        """Limpa todo o store"""
        try:
            # Remove do Redis
            keys = await self.redis.redis.keys("vector_doc:*")
            if keys:
                await self.redis.redis.delete(*keys)

            # Limpa cache local
            self._documents.clear()
            self._doc_ids.clear()
            self._embeddings_matrix = None
            self.total_documents = 0

            logger.info("Vector store cleared")
            return True

        except Exception as e:
            logger.error("Failed to clear store", error=str(e))
            return False

    # Métodos auxiliares
    async def _load_documents(self):
        """Carrega documentos do Redis"""
        try:
            keys = await self.redis.redis.keys("vector_doc:*")
            loaded_count = 0

            for key in keys:
                doc_id = key.decode().split(":", 1)[1]
                document = await self.get_document(doc_id)
                if document:
                    loaded_count += 1

            self.total_documents = loaded_count
            logger.info("Documents loaded from Redis", count=loaded_count)

        except Exception as e:
            logger.error("Failed to load documents", error=str(e))

    async def _rebuild_vector_index(self):
        """Reconstrói o índice vetorial"""
        try:
            if not self._documents:
                self._embeddings_matrix = None
                self._doc_ids = []
                return

            # Extrai embeddings e IDs
            embeddings = []
            doc_ids = []

            for doc_id, document in self._documents.items():
                embeddings.append(document.embedding)
                doc_ids.append(doc_id)

            # Cria matriz numpy
            self._embeddings_matrix = np.array(embeddings, dtype=np.float32)
            self._doc_ids = doc_ids

            logger.info("Vector index rebuilt",
                       documents=len(doc_ids),
                       matrix_shape=self._embeddings_matrix.shape)

        except Exception as e:
            logger.error("Failed to rebuild vector index", error=str(e))

    async def _update_vector_index(self, new_document: VectorDocument):
        """Atualização incremental do índice"""
        try:
            if self._embeddings_matrix is None:
                await self._rebuild_vector_index()
                return

            # Adiciona embedding à matriz
            new_embedding = np.array([new_document.embedding], dtype=np.float32)
            self._embeddings_matrix = np.vstack([self._embeddings_matrix, new_embedding])
            self._doc_ids.append(new_document.doc_id)

        except Exception as e:
            logger.error("Failed to update vector index", error=str(e))
            # Fallback para rebuild completo
            await self._rebuild_vector_index()

    async def _compute_similarities(self, query_embedding: List[float]) -> List[float]:
        """Computa similaridades usando produto escalar otimizado"""
        if self._embeddings_matrix is None or len(self._embeddings_matrix) == 0:
            return []

        # Converte query para numpy
        query_vector = np.array(query_embedding, dtype=np.float32)

        # Normaliza vetores
        query_norm = np.linalg.norm(query_vector)
        if query_norm == 0:
            return [0.0] * len(self._doc_ids)

        embeddings_norms = np.linalg.norm(self._embeddings_matrix, axis=1)
        embeddings_norms[embeddings_norms == 0] = 1  # Evita divisão por zero

        # Calcula similaridade do cosseno
        dot_products = np.dot(self._embeddings_matrix, query_vector)
        similarities = dot_products / (embeddings_norms * query_norm)

        # Converte para lista Python
        return similarities.tolist()

    def _matches_metadata_filter(self, doc_id: str, filter_metadata: Dict[str, Any]) -> bool:
        """Verifica se documento atende filtros de metadata"""
        document = self._documents.get(doc_id)
        if not document:
            return False

        for key, expected_value in filter_metadata.items():
            if key not in document.metadata:
                return False

            actual_value = document.metadata[key]

            # Suporte a diferentes tipos de filtros
            if isinstance(expected_value, list):
                if actual_value not in expected_value:
                    return False
            elif isinstance(expected_value, dict):
                # Filtros complexos (ex: range queries)
                if 'gt' in expected_value and actual_value <= expected_value['gt']:
                    return False
                if 'lt' in expected_value and actual_value >= expected_value['lt']:
                    return False
                if 'eq' in expected_value and actual_value != expected_value['eq']:
                    return False
            else:
                if actual_value != expected_value:
                    return False

        return True


# Serviço de embedding mock para testes
class MockEmbeddingService:
    """Serviço de embedding mock para testes"""

    def __init__(self, dimension: int = 768):
        self.dimension = dimension

    async def embed(self, text: str) -> List[float]:
        """Gera embedding mock baseado no hash do texto"""
        import hashlib
        import random

        # Usa hash do texto como seed para consistência
        hash_value = int(hashlib.md5(text.encode()).hexdigest(), 16)
        random.seed(hash_value)

        # Gera vetor aleatório normalizado
        embedding = [random.gauss(0, 1) for _ in range(self.dimension)]

        # Normaliza
        norm = sum(x * x for x in embedding) ** 0.5
        if norm > 0:
            embedding = [x / norm for x in embedding]

        return embedding


# Exemplo de uso
async def example_usage():
    """Exemplo de como usar o Vector Store"""

    # Setup
    class MockRedis:
        def __init__(self):
            self._data = {}

        async def set(self, key, value, ttl=None):
            self._data[key] = value

        async def get(self, key):
            return self._data.get(key)

        async def delete(self, key):
            return self._data.pop(key, None)

        async def keys(self, pattern):
            return [k for k in self._data.keys() if pattern.replace("*", "") in k]

    redis_cache = MockRedis()
    embedding_service = MockEmbeddingService(dimension=384)
    vector_store = VectorStore(redis_cache, dimension=384)

    try:
        await vector_store.start()

        # Adiciona documentos
        docs = [
            "Como configurar um roteador Mikrotik",
            "Instalação de câmeras Hikvision",
            "Troubleshooting de rede VPN",
            "Configuração de portas de switch",
            "Manual de instalação CCTV"
        ]

        for i, content in enumerate(docs):
            embedding = await embedding_service.embed(content)
            document = VectorDocument(
                doc_id=f"doc_{i}",
                content=content,
                embedding=embedding,
                metadata={"category": "technical", "index": i}
            )
            await vector_store.add_document(document)

        # Busca similar
        query = "configurar equipamento de rede"
        results = await vector_store.search_by_text(
            query_text=query,
            embedding_service=embedding_service,
            max_results=3,
            min_similarity=0.1
        )

        print(f"Busca por: '{query}'")
        for result in results:
            print(f"- {result.content} (score: {result.similarity_score:.3f})")

    except Exception as e:
        logger.error("Example usage failed", error=str(e))