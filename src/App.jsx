import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  UploadCloud, ArrowUp, ArrowDown, RotateCw, Trash2, 
  File as FileIcon, Download, AlertCircle, CheckCircle2, 
  Eye, X, FileCheck2, Settings2, GripVertical
} from 'lucide-react';

export default function App() {
  const [files, setFiles] = useState([]);
  const [outputName, setOutputName] = useState('tai_lieu_da_gop');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pdfLibReady, setPdfLibReady] = useState(false);
  const fileInputRef = useRef(null);

  // Modal Message State
  const [message, setMessage] = useState({ show: false, text: '', type: 'info' });
  // Preview State
  const [previewFile, setPreviewFile] = useState(null);

  // Load PDF-Lib dynamically
  useEffect(() => {
    if (window.PDFLib) {
      setPdfLibReady(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js';
    script.async = true;
    script.onload = () => setPdfLibReady(true);
    script.onerror = () => showMessage('Không thể tải thư viện xử lý PDF. Vui lòng kiểm tra mạng!', 'error');
    document.body.appendChild(script);
  }, []);

  const showMessage = (text, type = 'info') => {
    setMessage({ show: true, text, type });
  };

  const closeMessage = () => setMessage({ show: false, text: '', type: 'info' });

  // Handle File Selection
  const processFiles = (selectedFiles) => {
    const newFiles = Array.from(selectedFiles)
      .filter(file => file.type === 'application/pdf')
      .map(file => ({
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7),
        file,
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(2), // MB
        rotation: 0,
        previewUrl: URL.createObjectURL(file)
      }));

    if (newFiles.length !== selectedFiles.length) {
      showMessage('Chỉ hỗ trợ file định dạng PDF. Các file khác đã bị bỏ qua.', 'error');
    }

    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files?.length > 0) {
      processFiles(e.target.files);
    }
    // Reset input to allow selecting the same file again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Drag and Drop Handlers
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files?.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, []);

  // File Manipulations
  const removeFile = (id) => {
    setFiles(prev => {
      const target = prev.find(f => f.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl); // Cleanup memory
      return prev.filter(f => f.id !== id);
    });
  };

  const moveUp = (index) => {
    if (index === 0) return;
    setFiles(prev => {
      const copy = [...prev];
      [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]];
      return copy;
    });
  };

  const moveDown = (index) => {
    if (index === files.length - 1) return;
    setFiles(prev => {
      const copy = [...prev];
      [copy[index], copy[index + 1]] = [copy[index + 1], copy[index]];
      return copy;
    });
  };

  const rotateFile = (id) => {
    setFiles(prev => prev.map(f => {
      if (f.id === id) {
        return { ...f, rotation: (f.rotation + 90) % 360 };
      }
      return f;
    }));
  };

  // Merge PDFs
  const handleMerge = async () => {
    if (!pdfLibReady || !window.PDFLib) {
      showMessage('Thư viện đang tải, vui lòng đợi trong giây lát...', 'info');
      return;
    }
    if (files.length === 0) {
      showMessage('Bạn cần tải lên ít nhất 1 file PDF để thực hiện.', 'error');
      return;
    }
    if (!outputName.trim()) {
      showMessage('Vui lòng nhập tên cho file xuất ra.', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const { PDFDocument, degrees } = window.PDFLib;
      const mergedPdf = await PDFDocument.create();

      for (let i = 0; i < files.length; i++) {
        const item = files[i];
        const arrayBuffer = await item.file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());

        copiedPages.forEach((page) => {
          // Adjust rotation based on current page rotation + user requested rotation
          const currentRotation = page.getRotation().angle;
          const newRotation = (currentRotation + item.rotation) % 360;
          page.setRotation(degrees(newRotation));
          mergedPdf.addPage(page);
        });
      }

      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = outputName.endsWith('.pdf') ? outputName : `${outputName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url); // Cleanup
      
      showMessage('Tuyệt vời! File của bạn đã được gộp và tải xuống thành công.', 'success');
    } catch (error) {
      console.error(error);
      showMessage('Đã xảy ra lỗi trong quá trình gộp file. Hãy thử tải lại trang hoặc kiểm tra file gốc.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <FileCheck2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">PDF Merger Pro</h1>
              <p className="text-xs text-slate-500 font-medium">Dành riêng cho anh otiz</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center space-x-2 text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
            <Settings2 className="w-4 h-4" />
            <span>Xử lý 100% trên trình duyệt</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Upload Area */}
        <div 
          className={`relative group flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-2xl transition-all duration-200 ease-in-out ${
            isDragging 
              ? 'border-indigo-500 bg-indigo-50' 
              : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-slate-50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="absolute inset-0 w-full h-full cursor-pointer" onClick={() => fileInputRef.current?.click()} />
          <input 
            type="file" 
            multiple 
            accept="application/pdf" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <div className="bg-indigo-100 p-4 rounded-full mb-4 text-indigo-600 group-hover:scale-110 transition-transform">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">Tải file PDF lên tại đây</h3>
          <p className="text-sm text-slate-500 max-w-sm text-center">
            Kéo thả các file PDF của anh otiz vào khu vực này hoặc click để chọn file từ máy tính.
          </p>
        </div>

        {/* Workspace Area */}
        {files.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h2 className="text-base font-semibold text-slate-800">Danh sách file đã chọn ({files.length})</h2>
              <button 
                onClick={() => setFiles([])}
                className="text-sm text-red-600 font-medium hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-md transition-colors"
              >
                Xóa tất cả
              </button>
            </div>
            
            <div className="divide-y divide-slate-100">
              {files.map((file, index) => (
                <div key={file.id} className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:bg-slate-50 transition-colors">
                  
                  {/* Visual Preview / Icon */}
                  <div className="flex-shrink-0 relative w-16 h-20 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden">
                    <div 
                      className="transition-transform duration-300 ease-in-out flex items-center justify-center w-full h-full"
                      style={{ transform: `rotate(${file.rotation}deg)` }}
                    >
                      <FileIcon className="w-8 h-8 text-indigo-400" />
                    </div>
                    {file.rotation !== 0 && (
                      <div className="absolute bottom-1 right-1 bg-indigo-600 text-white text-[10px] font-bold px-1 rounded">
                        {file.rotation}°
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-grow min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{file.size} MB</p>
                    
                    <button 
                      onClick={() => setPreviewFile(file)}
                      className="mt-2 inline-flex items-center text-xs font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      <Eye className="w-3 h-3 mr-1" /> Xem trước file gốc
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-end mt-2 sm:mt-0">
                    <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                      <button 
                        onClick={() => moveUp(index)} 
                        disabled={index === 0}
                        className={`p-2 rounded-md transition-colors ${index === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-white hover:shadow-sm'}`}
                        title="Di chuyển lên"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => moveDown(index)} 
                        disabled={index === files.length - 1}
                        className={`p-2 rounded-md transition-colors ${index === files.length - 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-white hover:shadow-sm'}`}
                        title="Di chuyển xuống"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>

                    <button 
                      onClick={() => rotateFile(file.id)}
                      className="p-2 text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
                      title="Xoay 90 độ"
                    >
                      <RotateCw className="w-4 h-4" />
                      <span className="text-xs font-semibold sm:hidden">Xoay</span>
                    </button>

                    <button 
                      onClick={() => removeFile(file.id)}
                      className="p-2 text-red-600 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-colors"
                      title="Xóa file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Action Area */}
            <div className="bg-slate-50 p-6 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="w-full md:w-1/2">
                <label htmlFor="outputName" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Tên file xuất ra:
                </label>
                <div className="flex shadow-sm rounded-lg">
                  <input
                    type="text"
                    id="outputName"
                    value={outputName}
                    onChange={(e) => setOutputName(e.target.value)}
                    className="flex-grow block w-full min-w-0 rounded-l-lg border-slate-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-indigo-500 border outline-none"
                    placeholder="tai_lieu_da_gop"
                  />
                  <span className="inline-flex items-center rounded-r-lg border border-l-0 border-slate-300 bg-slate-100 px-4 py-2.5 text-slate-500 text-sm font-medium">
                    .pdf
                  </span>
                </div>
              </div>

              <button
                onClick={handleMerge}
                disabled={isProcessing || !pdfLibReady}
                className="w-full md:w-auto mt-4 md:mt-0 flex items-center justify-center px-8 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    Gộp & Tải xuống
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* PDF Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800 truncate pr-4">
                Xem trước: {previewFile.name}
              </h3>
              <button 
                onClick={() => setPreviewFile(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-grow bg-slate-100 p-4 relative overflow-hidden flex items-center justify-center">
              {/* Note about rotation */}
              <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur px-3 py-1.5 rounded-md shadow text-xs font-medium text-slate-600 border border-slate-200">
                Hiển thị file gốc (Góc xoay trên thiết lập: <span className="text-indigo-600 font-bold">{previewFile.rotation}°</span>)
              </div>
              
              <iframe
                src={`${previewFile.previewUrl}#toolbar=0&navpanes=0`}
                className="w-full h-full border-0 bg-white shadow-sm"
                title="PDF Preview"
              />
            </div>
          </div>
        </div>
      )}

      {/* Custom Message Alert */}
      {message.show && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in-up">
          <div className={`rounded-xl shadow-lg border p-4 flex items-start max-w-sm ${
            message.type === 'error' ? 'bg-red-50 border-red-200' : 
            message.type === 'success' ? 'bg-green-50 border-green-200' : 
            'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex-shrink-0 mr-3">
              {message.type === 'error' && <AlertCircle className="w-6 h-6 text-red-500" />}
              {message.type === 'success' && <CheckCircle2 className="w-6 h-6 text-green-500" />}
              {message.type === 'info' && <AlertCircle className="w-6 h-6 text-blue-500" />}
            </div>
            <div className="flex-1 mr-4">
              <p className={`text-sm font-medium ${
                message.type === 'error' ? 'text-red-800' : 
                message.type === 'success' ? 'text-green-800' : 
                'text-blue-800'
              }`}>
                {message.text}
              </p>
            </div>
            <button 
              onClick={closeMessage}
              className={`flex-shrink-0 rounded-md p-1.5 inline-flex focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                message.type === 'error' ? 'text-red-500 hover:bg-red-100 focus:ring-red-600' : 
                message.type === 'success' ? 'text-green-500 hover:bg-green-100 focus:ring-green-600' : 
                'text-blue-500 hover:bg-blue-100 focus:ring-blue-600'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.3s ease-out forwards;
        }
      `}} />
    </div>
  );
}