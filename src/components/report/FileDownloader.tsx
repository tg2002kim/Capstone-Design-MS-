// src/components/FileDownloader.tsx
import React from 'react';
import axios from 'axios';

interface FileDownloaderProps {
  reportId: string;          // 🔄 파일 ID 기반으로 요청
  filename: string;          // 다운로드 파일 이름
  label?: string;            // 버튼 라벨 (기본값: 다운로드)
}

const FileDownloader: React.FC<FileDownloaderProps> = ({ reportId, filename, label = '다운로드' }) => {
  const handleDownload = async () => {
    try {
      // ✅ 다운로드 카운트 비동기 기록
      axios.post('/api/download-log', {
        reportId,
        filename,
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
      }).catch(err => {
        console.warn('📉 다운로드 기록 실패:', err);
      });

      // ✅ 파일 다운로드 처리
      const response = await axios.get(`/api/report/download/${reportId}`, {
        responseType: 'blob',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });

      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('❗ 파일 다운로드 실패:', error);
      alert('파일을 다운로드할 수 없습니다. 다시 시도해주세요.');
    }
  };

  return (
    <button
      onClick={handleDownload}
      className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
    >
      {label}
    </button>
  );
};

export default FileDownloader;
