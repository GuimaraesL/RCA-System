/**
 * Proposta: Serviço de integração com a API de Mídia (anexos).
 * Fluxo: Gerencia o upload de arquivos binários e a recuperação de listas de anexos vinculadas às RCAs.
 */

import { Attachment } from '../types';

const API_URL = '/api/media';

export const mediaService = {
  /**
   * Realiza o upload de um arquivo para uma RCA.
   * Utiliza envio binário bruto para evitar dependências de multipart no backend.
   */
  async upload(rcaId: string, file: File): Promise<Attachment> {
    const arrayBuffer = await file.arrayBuffer();
    
    const response = await fetch(`${API_URL}/upload/${rcaId}`, {
      method: 'POST',
      headers: {
        'Content-Type': file.type,
        'x-filename': file.name,
        // TODO: Adicionar header de autenticação se necessário
      },
      body: arrayBuffer
    });

    if (!response.ok) throw new Error('Falha ao enviar arquivo');
    
    const result = await response.json();
    
    return {
      id: Math.random().toString(36).substr(2, 9), // ID temporário se o backend não gerar um UUID de objeto
      type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'document',
      filename: result.filename,
      url: result.path,
      size: result.size,
      uploaded_at: new Date().toISOString()
    };
  },

  /**
   * Busca a lista de arquivos de uma RCA.
   */
  async getByRcaId(rcaId: string): Promise<Attachment[]> {
    const response = await fetch(`${API_URL}/rca/${rcaId}`);
    if (!response.ok) throw new Error('Falha ao buscar anexos');
    const files = await response.json();
    
    return files.map((f: any) => ({
      id: f.filename,
      type: f.filename.match(/\.(jpg|jpeg|png|gif)$/i) ? 'image' : f.filename.match(/\.(mp4|webm)$/i) ? 'video' : 'document',
      filename: f.filename,
      url: f.url,
      uploaded_at: new Date().toISOString() // Fallback
    }));
  },

  /**
   * Remove um arquivo.
   */
  async delete(rcaId: string, filename: string): Promise<void> {
    const response = await fetch(`${API_URL}/${rcaId}/${filename}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Falha ao excluir arquivo');
  }
};
