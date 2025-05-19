import React from 'react';
import { useDropzone } from 'react-dropzone';

interface Props {
  onFileSelected: (file: File) => void;
}

const FileUploadBox: React.FC<Props> = ({ onFileSelected }) => {
  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelected(acceptedFiles[0]);
    }
  };

  const { getRootProps, getInputProps, open, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    noClick: true,
    noKeyboard: true,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed p-10 text-center cursor-pointer mb-4 transition-all duration-300 rounded-lg ${
        isDragActive
          ? 'border-green-500 bg-green-50 text-green-700 shadow-md'
          : 'border-gray-400 bg-white text-gray-700 hover:border-blue-500'
      }`}
    >
      <input {...getInputProps()} />
      {isDragActive ? (
        <p className="text-lg font-semibold">여기에 파일을 놓아 업로드하세요 📂</p>
      ) : (
        <>
          <p className="mb-2">이 영역에 파일을 드래그하거나,</p>
          <button
            type="button"
            onClick={open} // ✅ Dropzone에서 제공하는 open 함수 사용
            className="px-4 py-2 border rounded bg-white hover:bg-gray-50"
          >
            파일을 선택하세요
          </button>
          <p className="text-sm mt-4 text-gray-500">
            허용 확장자: .pdf, .doc, .docx | 최대 10MB
          </p>
        </>
      )}
    </div>
  );
};

export default FileUploadBox;
