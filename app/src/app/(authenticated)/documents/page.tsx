"use client";
import React, { useState, useEffect, useRef } from 'react';
import { FileText, Folder, File, Download, Trash2, Upload, Search, ChevronRight, Home, FolderPlus, Edit, X, Eye } from 'lucide-react';
import { Card, Button, EmptyState, Modal, StatCard } from '@/components/ui';
import { useTenant } from '@/contexts/TenantContext';
import { API_BASE } from '@/lib/api';

const UPLOADS_BASE = API_BASE.replace('/api/v1', '');

interface Documento {
  id: number; nome: string; descricao?: string; arquivo_url?: string;
  tipo_arquivo?: string; tamanho_bytes?: number; pasta_id?: number;
  is_pasta: boolean; created_at: string;
}

interface Stats { total_arquivos: number; total_pastas: number; tamanho_total: number; }
interface Breadcrumb { id: number; nome: string; }

const formatBytes = (bytes: number) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const getFileIcon = (tipo: string | undefined, nome: string) => {
  const ext = nome.split('.').pop()?.toLowerCase();
  if (tipo?.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return '🖼️';
  if (tipo?.includes('pdf') || ext === 'pdf') return '📕';
  if (tipo?.includes('word') || ['doc', 'docx'].includes(ext || '')) return '📘';
  if (tipo?.includes('excel') || ['xls', 'xlsx'].includes(ext || '')) return '📗';
  if (tipo?.includes('video') || ['mp4', 'avi', 'mov'].includes(ext || '')) return '🎬';
  if (tipo?.includes('audio') || ['mp3', 'wav'].includes(ext || '')) return '🎵';
  if (['zip', 'rar', '7z'].includes(ext || '')) return '📦';
  return '📄';
};

export default function DocumentsPage() {
  const { currentTenant } = useTenant();
  const [docs, setDocs] = useState<Documento[]>([]);
  const [stats, setStats] = useState<Stats>({ total_arquivos: 0, total_pastas: 0, tamanho_total: 0 });
  const [loading, setLoading] = useState(true);
  const [pastaAtual, setPastaAtual] = useState<number | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<Breadcrumb[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [createFolderModal, setCreateFolderModal] = useState(false);
  const [uploadModal, setUploadModal] = useState(false);
  const [editModal, setEditModal] = useState<Documento | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Documento | null>(null);
  const [previewModal, setPreviewModal] = useState<Documento | null>(null);
  
  const [folderName, setFolderName] = useState('');
  const [folderDesc, setFolderDesc] = useState('');
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const endpoint = pastaAtual ? `/documentos?pasta_id=${pastaAtual}` : '/documentos';
      const [docsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}${endpoint}${endpoint.includes("?") ? "&" : "?"}tenant_id=${currentTenant?.tenant_id}`),
        fetch(`${API_BASE}/documentos/estatisticas?tenant_id=${currentTenant?.tenant_id}`)
      ]);
      const docsData = await docsRes.json();
      setDocs(docsData.items || []);
      setBreadcrumb(docsData.breadcrumb || []);
      setStats(await statsRes.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (currentTenant) fetchDocs(); }, [pastaAtual, currentTenant]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) { fetchDocs(); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/documentos?tenant_id=${currentTenant?.tenant_id}&busca=${encodeURIComponent(searchTerm)}`);
      const data = await res.json();
      setDocs(data.items || []);
      setBreadcrumb([]);
      setPastaAtual(null);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleCreateFolder = async () => {
    if (!folderName.trim()) { alert('Digite um nome para a pasta'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/documentos?tenant_id=${currentTenant?.tenant_id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: folderName, descricao: folderDesc, pasta_id: pastaAtual, is_pasta: true })
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Erro');
      setCreateFolderModal(false);
      setFolderName(''); setFolderDesc('');
      fetchDocs();
    } catch (e: any) { alert(e.message); }
    setSubmitting(false);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) { alert('Selecione arquivos'); return; }
    setUploading(true);
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        if (!file) continue;
        setUploadProgress(`Enviando ${i + 1} de ${selectedFiles.length}...`);
        const formData = new FormData();
        formData.append('file', file);
        if (pastaAtual) formData.append('pasta_id', pastaAtual.toString());
        
        const res = await fetch(`${API_BASE}/documentos/upload?tenant_id=${currentTenant?.tenant_id}`, { method: 'POST', body: formData });
        if (!res.ok) throw new Error('Erro no upload');
      }
      setUploadModal(false);
      setSelectedFiles([]);
      setUploadProgress('');
      fetchDocs();
    } catch (e: any) { alert(e.message); }
    setUploading(false);
  };

  const handleEdit = async () => {
    if (!editModal || !editName.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/documentos/${editModal.id}?tenant_id=${currentTenant?.tenant_id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: editName, descricao: editDesc })
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Erro');
      setEditModal(null);
      fetchDocs();
    } catch (e: any) { alert(e.message); }
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/documentos/${deleteConfirm.id}?tenant_id=${currentTenant?.tenant_id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao deletar');
      setDeleteConfirm(null);
      fetchDocs();
    } catch (e: any) { alert(e.message); }
    setSubmitting(false);
  };

  const openFolder = (doc: Documento) => {
    if (doc.is_pasta) {
      setPastaAtual(doc.id);
      setSearchTerm('');
    }
  };

  const openEditModal = (doc: Documento) => {
    setEditName(doc.nome);
    setEditDesc(doc.descricao || '');
    setEditModal(doc);
  };

  const downloadFile = (doc: Documento) => {
    if (doc.arquivo_url) {
      window.open(`${UPLOADS_BASE}${doc.arquivo_url}`, '_blank');
    }
  };

  const filtered = docs.filter(d => d.nome.toLowerCase().includes(searchTerm.toLowerCase()));
  const folders = filtered.filter(d => d.is_pasta);
  const files = filtered.filter(d => !d.is_pasta);

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={28} style={{ color: 'var(--accent)' }}/> Documentos
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Gestão de arquivos do condomínio</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button variant="secondary" onClick={() => setCreateFolderModal(true)}><FolderPlus size={16}/> Nova Pasta</Button>
          <Button onClick={() => setUploadModal(true)}><Upload size={16}/> Upload</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard title="Arquivos" value={stats.total_arquivos} icon={<File size={20}/>} color="blue"/>
        <StatCard title="Pastas" value={stats.total_pastas} icon={<Folder size={20}/>} color="yellow"/>
        <StatCard title="Tamanho Total" value={formatBytes(stats.tamanho_total)} icon={<FileText size={20}/>} color="blue"/>
      </div>

      {/* Breadcrumb */}
      <Card style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => { setPastaAtual(null); setSearchTerm(''); }} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 500 }}>
            <Home size={16}/> Início
          </button>
          {breadcrumb.map((item, i) => (
            <React.Fragment key={item.id}>
              <ChevronRight size={14} style={{ color: 'var(--text-muted)' }}/>
              <button onClick={() => setPastaAtual(item.id)} style={{ background: 'none', border: 'none', color: i === breadcrumb.length - 1 ? 'var(--text-primary)' : 'var(--accent)', cursor: 'pointer', fontWeight: i === breadcrumb.length - 1 ? 600 : 500 }}>
                {item.nome}
              </button>
            </React.Fragment>
          ))}
          <div style={{ flex: 1 }}/>
          <div style={{ position: 'relative', minWidth: '200px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}/>
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} placeholder="Buscar..."
              style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2.25rem', borderRadius: '6px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontSize: '0.85rem' }}/>
          </div>
        </div>
      </Card>

      {/* Lista de Documentos */}
      {loading ? (
        <Card padding="lg"><div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Carregando...</div></Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState icon={<Folder size={56} style={{ opacity: 0.5 }}/>} title="Pasta vazia" description="Nenhum arquivo ou pasta aqui"
            action={<div style={{ display: 'flex', gap: '0.5rem' }}><Button variant="secondary" onClick={() => setCreateFolderModal(true)}><FolderPlus size={16}/> Criar Pasta</Button><Button onClick={() => setUploadModal(true)}><Upload size={16}/> Upload</Button></div>}/>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
          {/* Pastas primeiro */}
          {folders.map(doc => (
            <Card key={doc.id} padding="sm" style={{ cursor: 'pointer', textAlign: 'center' }} onClick={() => openFolder(doc)}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📁</div>
              <h4 style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.nome}</h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pasta</p>
              <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center', marginTop: '0.5rem' }} onClick={e => e.stopPropagation()}>
                <Button variant="ghost" size="sm" onClick={() => openEditModal(doc)}><Edit size={12}/></Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(doc)}><Trash2 size={12}/></Button>
              </div>
            </Card>
          ))}
          
          {/* Arquivos */}
          {files.map(doc => (
            <Card key={doc.id} padding="sm" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>{getFileIcon(doc.tipo_arquivo, doc.nome)}</div>
              <h4 style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.nome}>{doc.nome}</h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatBytes(doc.tamanho_bytes || 0)}</p>
              <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center', marginTop: '0.5rem' }}>
                {doc.tipo_arquivo?.includes('image') && <Button variant="ghost" size="sm" onClick={() => setPreviewModal(doc)}><Eye size={12}/></Button>}
                <Button variant="ghost" size="sm" onClick={() => downloadFile(doc)}><Download size={12}/></Button>
                <Button variant="ghost" size="sm" onClick={() => openEditModal(doc)}><Edit size={12}/></Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(doc)}><Trash2 size={12}/></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Criar Pasta */}
      <Modal isOpen={createFolderModal} onClose={() => !submitting && setCreateFolderModal(false)} title="Nova Pasta" size="sm"
        footer={<><Button variant="ghost" onClick={() => setCreateFolderModal(false)} disabled={submitting}>Cancelar</Button><Button onClick={handleCreateFolder} loading={submitting}>Criar</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Nome da Pasta *</label>
            <input value={folderName} onChange={e => setFolderName(e.target.value)} placeholder="Ex: Atas de Reunião"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}/>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Descrição</label>
            <input value={folderDesc} onChange={e => setFolderDesc(e.target.value)} placeholder="Opcional"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}/>
          </div>
        </div>
      </Modal>

      {/* Modal Upload */}
      <Modal isOpen={uploadModal} onClose={() => !uploading && setUploadModal(false)} title="Upload de Arquivos" size="md"
        footer={<><Button variant="ghost" onClick={() => setUploadModal(false)} disabled={uploading}>Cancelar</Button><Button onClick={handleUpload} loading={uploading}>{uploadProgress || 'Enviar'}</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ border: '2px dashed var(--border-default)', borderRadius: '8px', padding: '2rem', textAlign: 'center', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
            <input ref={fileInputRef} type="file" multiple onChange={e => e.target.files && setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)])} style={{ display: 'none' }}/>
            <Upload size={40} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}/>
            <p style={{ color: 'var(--text-muted)' }}>Clique ou arraste arquivos aqui</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sem limite de tamanho ou quantidade</p>
          </div>
          {selectedFiles.length > 0 && (
            <div style={{ maxHeight: '200px', overflow: 'auto' }}>
              {selectedFiles.map((f, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: '4px', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                  <button onClick={() => setSelectedFiles(selectedFiles.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)' }}><X size={14}/></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Modal Editar */}
      <Modal isOpen={!!editModal} onClose={() => !submitting && setEditModal(null)} title="Editar" size="sm"
        footer={<><Button variant="ghost" onClick={() => setEditModal(null)} disabled={submitting}>Cancelar</Button><Button onClick={handleEdit} loading={submitting}>Salvar</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Nome *</label>
            <input value={editName} onChange={e => setEditName(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}/>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Descrição</label>
            <input value={editDesc} onChange={e => setEditDesc(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}/>
          </div>
        </div>
      </Modal>

      {/* Modal Confirmar Delete */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Confirmar Exclusão" size="sm"
        footer={<><Button variant="ghost" onClick={() => setDeleteConfirm(null)} disabled={submitting}>Cancelar</Button><Button variant="primary" onClick={handleDelete} loading={submitting} style={{ background: 'var(--error)' }}>Excluir</Button></>}>
        <p>Tem certeza que deseja excluir <strong>{deleteConfirm?.nome}</strong>?</p>
        {deleteConfirm?.is_pasta && <p style={{ color: 'var(--warning)', marginTop: '0.5rem', fontSize: '0.9rem' }}>⚠️ Todo o conteúdo da pasta será excluído!</p>}
      </Modal>

      {/* Modal Preview Imagem */}
      <Modal isOpen={!!previewModal} onClose={() => setPreviewModal(null)} title={previewModal?.nome || ''} size="lg">
        {previewModal?.arquivo_url && (
          <div style={{ textAlign: 'center' }}>
            <img src={`${UPLOADS_BASE}${previewModal.arquivo_url}`} alt={previewModal.nome} style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '8px' }}/>
          </div>
        )}
      </Modal>
    </div>
  );
}
