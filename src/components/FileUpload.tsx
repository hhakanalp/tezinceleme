import React, { useRef } from "react";

interface FileUploadProps {
  onFileSelected: (file: File) => void;
  loading: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelected,
  loading
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (file.type !== "application/pdf") {
      alert("Lütfen sadece PDF dosyası yükleyin.");
      event.target.value = "";
      return;
    }
    onFileSelected(file);
  };

  return (
    <div className="upload-container">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        style={{ display: "none" }}
        onChange={handleChange}
      />
      <button
        type="button"
        className="primary-button"
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? "Analiz ediliyor..." : "Tez PDF'i seç"}
      </button>
      <p className="upload-hint">
        Sadece PDF formatındaki dosyalar desteklenmektedir.
      </p>
    </div>
  );
};

