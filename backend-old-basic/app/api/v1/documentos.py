"""
API de Documentos - Gestão de arquivos e pastas
"""

import os
import shutil
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import UPLOAD_BASE_DIR
from app.database import get_db

router = APIRouter(prefix="/documentos", tags=["Documentos"])

UPLOAD_DIR = os.path.join(UPLOAD_BASE_DIR, "documentos")
os.makedirs(UPLOAD_DIR, exist_ok=True)


# Schemas
class DocumentoCreate(BaseModel):
    nome: str
    descricao: Optional[str] = None
    pasta_id: Optional[int] = None
    is_pasta: bool = False


class DocumentoUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    pasta_id: Optional[int] = None


class DocumentoResponse(BaseModel):
    id: int
    nome: str
    descricao: Optional[str] = None
    arquivo_url: Optional[str] = None
    tipo_arquivo: Optional[str] = None
    tamanho_bytes: Optional[int] = None
    pasta_id: Optional[int] = None
    is_pasta: bool
    created_at: datetime

    class Config:
        from_attributes = True


class DocumentoListResponse(BaseModel):
    items: List[DocumentoResponse]
    total: int
    pasta_atual: Optional[dict] = None
    breadcrumb: List[dict] = []


async def get_breadcrumb(db: AsyncSession, pasta_id: int, tenant_id: int) -> List[dict]:
    """Retorna o caminho até a pasta atual"""
    breadcrumb = []
    current_id = pasta_id

    while current_id:
        query = text("SELECT id, nome, pasta_id FROM documentos WHERE id = :id AND tenant_id = :tenant_id")
        result = await db.execute(query, {"id": current_id, "tenant_id": tenant_id})
        row = result.fetchone()
        if row:
            breadcrumb.insert(0, {"id": row.id, "nome": row.nome})
            current_id = row.pasta_id
        else:
            break

    return breadcrumb


@router.get("", response_model=DocumentoListResponse)
async def listar_documentos(
    tenant_id: int = Query(1, description="ID do condomínio"),
    pasta_id: Optional[int] = None,
    busca: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Lista documentos e pastas"""
    pasta_atual = None
    breadcrumb = []

    if pasta_id:
        # Buscar info da pasta atual
        query = text(
            "SELECT id, nome, descricao FROM documentos WHERE id = :id AND tenant_id = :tenant_id AND is_pasta = true"
        )
        result = await db.execute(query, {"id": pasta_id, "tenant_id": tenant_id})
        row = result.fetchone()
        if row:
            pasta_atual = {"id": row.id, "nome": row.nome, "descricao": row.descricao}
            breadcrumb = await get_breadcrumb(db, pasta_id, tenant_id)

        # ✅ PERFORMANCE: Especificar campos necessários ao invés de SELECT *
        query = text(
            """
            SELECT id, nome, descricao, pasta_id, is_pasta, tipo_arquivo,
                   tamanho_bytes, caminho_arquivo, created_at, updated_at
            FROM documentos
            WHERE tenant_id = :tenant_id AND pasta_id = :pasta_id
            ORDER BY is_pasta DESC, nome
        """
        )
        result = await db.execute(query, {"tenant_id": tenant_id, "pasta_id": pasta_id})
    elif busca:
        query = text(
            """
            SELECT * FROM documentos 
            WHERE tenant_id = :tenant_id AND LOWER(nome) LIKE LOWER(:busca)
            ORDER BY is_pasta DESC, nome
        """
        )
        result = await db.execute(query, {"tenant_id": tenant_id, "busca": f"%{busca}%"})
    else:
        query = text(
            """
            SELECT * FROM documentos 
            WHERE tenant_id = :tenant_id AND pasta_id IS NULL 
            ORDER BY is_pasta DESC, nome
        """
        )
        result = await db.execute(query, {"tenant_id": tenant_id})

    rows = result.fetchall()
    items = [
        DocumentoResponse(
            id=r.id,
            nome=r.nome,
            descricao=r.descricao,
            arquivo_url=r.arquivo_url,
            tipo_arquivo=r.tipo_arquivo,
            tamanho_bytes=r.tamanho_bytes,
            pasta_id=r.pasta_id,
            is_pasta=r.is_pasta,
            created_at=r.created_at,
        )
        for r in rows
    ]

    return DocumentoListResponse(items=items, total=len(items), pasta_atual=pasta_atual, breadcrumb=breadcrumb)


@router.get("/estatisticas")
async def estatisticas(tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)):
    """Estatísticas de documentos"""
    total_q = text("SELECT COUNT(*) FROM documentos WHERE tenant_id = :tenant_id AND is_pasta = false")
    pastas_q = text("SELECT COUNT(*) FROM documentos WHERE tenant_id = :tenant_id AND is_pasta = true")
    tamanho_q = text("SELECT COALESCE(SUM(tamanho_bytes), 0) FROM documentos WHERE tenant_id = :tenant_id")

    total = (await db.execute(total_q, {"tenant_id": tenant_id})).scalar() or 0
    pastas = (await db.execute(pastas_q, {"tenant_id": tenant_id})).scalar() or 0
    tamanho = (await db.execute(tamanho_q, {"tenant_id": tenant_id})).scalar() or 0

    return {"total_arquivos": total, "total_pastas": pastas, "tamanho_total": tamanho}


@router.get("/{doc_id}", response_model=DocumentoResponse)
async def detalhe_documento(
    doc_id: int, tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    query = text("SELECT * FROM documentos WHERE id = :id AND tenant_id = :tenant_id")
    result = await db.execute(query, {"id": doc_id, "tenant_id": tenant_id})
    r = result.fetchone()
    if not r:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    return DocumentoResponse(
        id=r.id,
        nome=r.nome,
        descricao=r.descricao,
        arquivo_url=r.arquivo_url,
        tipo_arquivo=r.tipo_arquivo,
        tamanho_bytes=r.tamanho_bytes,
        pasta_id=r.pasta_id,
        is_pasta=r.is_pasta,
        created_at=r.created_at,
    )


@router.post("", response_model=DocumentoResponse, status_code=status.HTTP_201_CREATED)
async def criar_documento(
    dados: DocumentoCreate,
    tenant_id: int = Query(1, description="ID do condomínio"),
    user_id: int = Query(1, description="ID do usuário autenticado"),
    db: AsyncSession = Depends(get_db),
):
    """Criar pasta ou documento (sem arquivo)"""
    query = text(
        """
        INSERT INTO documentos (nome, descricao, pasta_id, is_pasta, tenant_id, created_by_id, created_at, updated_at)
        VALUES (:nome, :descricao, :pasta_id, :is_pasta, :tenant_id, :user_id, NOW(), NOW()) RETURNING *
    """
    )
    result = await db.execute(
        query,
        {
            "nome": dados.nome,
            "descricao": dados.descricao,
            "pasta_id": dados.pasta_id,
            "is_pasta": dados.is_pasta,
            "tenant_id": tenant_id,
            "user_id": user_id,
        },
    )
    await db.commit()
    r = result.fetchone()
    return DocumentoResponse(
        id=r.id,
        nome=r.nome,
        descricao=r.descricao,
        arquivo_url=r.arquivo_url,
        tipo_arquivo=r.tipo_arquivo,
        tamanho_bytes=r.tamanho_bytes,
        pasta_id=r.pasta_id,
        is_pasta=r.is_pasta,
        created_at=r.created_at,
    )


@router.post("/upload", response_model=DocumentoResponse)
async def upload_documento(
    tenant_id: int = Query(1, description="ID do condomínio"),
    user_id: int = Query(1, description="ID do usuário autenticado"),
    pasta_id: Optional[int] = Form(None),
    descricao: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload de arquivo"""
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    # Gerar nome único
    ext = file.filename.split(".")[-1] if "." in file.filename else ""
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    # Salvar arquivo
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    url = f"/uploads/documentos/{filename}"
    tamanho = len(content)
    tipo = file.content_type or ext

    query = text(
        """
        INSERT INTO documentos (nome, descricao, arquivo_url, tipo_arquivo, tamanho_bytes, pasta_id, is_pasta, tenant_id, created_by_id, created_at, updated_at)
        VALUES (:nome, :descricao, :arquivo_url, :tipo_arquivo, :tamanho_bytes, :pasta_id, false, :tenant_id, :user_id, NOW(), NOW()) RETURNING *
    """
    )
    result = await db.execute(
        query,
        {
            "nome": file.filename,
            "descricao": descricao,
            "arquivo_url": url,
            "tipo_arquivo": tipo,
            "tamanho_bytes": tamanho,
            "pasta_id": pasta_id,
            "tenant_id": tenant_id,
            "user_id": user_id,
        },
    )
    await db.commit()
    r = result.fetchone()

    return DocumentoResponse(
        id=r.id,
        nome=r.nome,
        descricao=r.descricao,
        arquivo_url=r.arquivo_url,
        tipo_arquivo=r.tipo_arquivo,
        tamanho_bytes=r.tamanho_bytes,
        pasta_id=r.pasta_id,
        is_pasta=r.is_pasta,
        created_at=r.created_at,
    )


@router.post("/upload-multiplo")
async def upload_multiplo(
    tenant_id: int = Query(1, description="ID do condomínio"),
    user_id: int = Query(1, description="ID do usuário autenticado"),
    pasta_id: Optional[int] = Form(None),
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload de múltiplos arquivos"""
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    uploaded = []

    for file in files:
        ext = file.filename.split(".")[-1] if "." in file.filename else ""
        filename = f"{uuid.uuid4()}.{ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)

        content = await file.read()
        with open(filepath, "wb") as f:
            f.write(content)

        url = f"/uploads/documentos/{filename}"

        query = text(
            """
            INSERT INTO documentos (nome, arquivo_url, tipo_arquivo, tamanho_bytes, pasta_id, is_pasta, tenant_id, created_by_id, created_at, updated_at)
            VALUES (:nome, :arquivo_url, :tipo_arquivo, :tamanho_bytes, :pasta_id, false, :tenant_id, :user_id, NOW(), NOW()) RETURNING id, nome
        """
        )
        result = await db.execute(
            query,
            {
                "nome": file.filename,
                "arquivo_url": url,
                "tipo_arquivo": file.content_type or ext,
                "tamanho_bytes": len(content),
                "pasta_id": pasta_id,
                "tenant_id": tenant_id,
                "user_id": user_id,
            },
        )
        r = result.fetchone()
        uploaded.append({"id": r.id, "nome": r.nome})

    await db.commit()
    return {"uploaded": len(uploaded), "files": uploaded}


@router.put("/{doc_id}", response_model=DocumentoResponse)
async def atualizar_documento(
    doc_id: int,
    dados: DocumentoUpdate,
    tenant_id: int = Query(1, description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
):
    """Atualizar documento/pasta"""
    # Verificar existência
    check = text("SELECT id FROM documentos WHERE id = :id AND tenant_id = :tenant_id")
    exists = (await db.execute(check, {"id": doc_id, "tenant_id": tenant_id})).fetchone()
    if not exists:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    # ✅ SEGURANÇA: Updates são construídos de forma controlada (hardcoded)
    updates = []
    params = {"id": doc_id, "tenant_id": tenant_id}

    if dados.nome is not None:
        updates.append("nome = :nome")  # ✅ Hardcoded field name
        params["nome"] = dados.nome
    if dados.descricao is not None:
        updates.append("descricao = :descricao")  # ✅ Hardcoded field name
        params["descricao"] = dados.descricao
    if dados.pasta_id is not None:
        updates.append("pasta_id = :pasta_id")  # ✅ Hardcoded field name
        params["pasta_id"] = dados.pasta_id if dados.pasta_id > 0 else None

    if updates:
        updates.append("updated_at = NOW()")
        query = text(
            f"UPDATE documentos SET {', '.join(updates)} WHERE id = :id AND tenant_id = :tenant_id RETURNING *"
        )
        result = await db.execute(query, params)
        await db.commit()
        r = result.fetchone()
    else:
        query = text("SELECT * FROM documentos WHERE id = :id AND tenant_id = :tenant_id")
        r = (await db.execute(query, {"id": doc_id, "tenant_id": tenant_id})).fetchone()

    return DocumentoResponse(
        id=r.id,
        nome=r.nome,
        descricao=r.descricao,
        arquivo_url=r.arquivo_url,
        tipo_arquivo=r.tipo_arquivo,
        tamanho_bytes=r.tamanho_bytes,
        pasta_id=r.pasta_id,
        is_pasta=r.is_pasta,
        created_at=r.created_at,
    )


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deletar_documento(
    doc_id: int, tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    """Deletar documento ou pasta (e conteúdo)"""
    # Buscar documento
    query = text("SELECT * FROM documentos WHERE id = :id AND tenant_id = :tenant_id")
    result = await db.execute(query, {"id": doc_id, "tenant_id": tenant_id})
    doc = result.fetchone()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    # Se for pasta, deletar conteúdo recursivamente
    if doc.is_pasta:
        await deletar_conteudo_pasta(db, doc_id, tenant_id)

    # Deletar arquivo físico se existir
    if doc.arquivo_url:
        filepath = os.path.join(UPLOAD_BASE_DIR, doc.arquivo_url.lstrip("/uploads/"))
        if os.path.exists(filepath):
            os.remove(filepath)

    # Deletar registro
    delete_q = text("DELETE FROM documentos WHERE id = :id AND tenant_id = :tenant_id")
    await db.execute(delete_q, {"id": doc_id, "tenant_id": tenant_id})
    await db.commit()


async def deletar_conteudo_pasta(db: AsyncSession, pasta_id: int, tenant_id: int):
    """Deleta recursivamente o conteúdo de uma pasta"""
    query = text("SELECT * FROM documentos WHERE pasta_id = :pasta_id AND tenant_id = :tenant_id")
    result = await db.execute(query, {"pasta_id": pasta_id, "tenant_id": tenant_id})
    items = result.fetchall()

    for item in items:
        if item.is_pasta:
            await deletar_conteudo_pasta(db, item.id, tenant_id)
        elif item.arquivo_url:
            filepath = os.path.join(UPLOAD_BASE_DIR, item.arquivo_url.lstrip("/uploads/"))
            if os.path.exists(filepath):
                os.remove(filepath)

        delete_q = text("DELETE FROM documentos WHERE id = :id")
        await db.execute(delete_q, {"id": item.id})


@router.post("/{doc_id}/mover")
async def mover_documento(
    doc_id: int,
    nova_pasta_id: Optional[int] = None,
    tenant_id: int = Query(1, description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
):
    """Mover documento/pasta para outra pasta"""
    # Verificar existência
    check = text("SELECT id, is_pasta FROM documentos WHERE id = :id AND tenant_id = :tenant_id")
    doc = (await db.execute(check, {"id": doc_id, "tenant_id": tenant_id})).fetchone()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    # Se for mover para uma pasta, verificar se existe
    if nova_pasta_id:
        pasta_check = text("SELECT id FROM documentos WHERE id = :id AND tenant_id = :tenant_id AND is_pasta = true")
        pasta = (await db.execute(pasta_check, {"id": nova_pasta_id, "tenant_id": tenant_id})).fetchone()
        if not pasta:
            raise HTTPException(status_code=400, detail="Pasta de destino não encontrada")

        # Evitar mover pasta para dentro dela mesma
        if doc.is_pasta and doc_id == nova_pasta_id:
            raise HTTPException(status_code=400, detail="Não é possível mover uma pasta para dentro dela mesma")

    query = text("UPDATE documentos SET pasta_id = :pasta_id, updated_at = NOW() WHERE id = :id")
    await db.execute(query, {"id": doc_id, "pasta_id": nova_pasta_id})
    await db.commit()

    return {"message": "Documento movido com sucesso"}
