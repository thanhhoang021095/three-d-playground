import React, { useRef, useState, Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { useLoader } from '@react-three/fiber';
import './styles.css';

const DEFAULT_MODEL_URL = 'store-shelf.glb';

function Model({ url = DEFAULT_MODEL_URL }) {
  // Sử dụng key để force re-render khi url thay đổi
  const gltf = useLoader(GLTFLoader, url);
  return <primitive object={gltf.scene} />;
}

function Loader() {
  return (
    <Html center>
      <div className="loader">Đang tải mô hình...</div>
    </Html>
  );
}

export default function AutoRiggingViewer() {
  const [modelInfo, setModelInfo] = useState({ 
    url: DEFAULT_MODEL_URL, 
    type: 'default',
    name: 'Mô hình mặc định',
    isActive: true
  });
  const fileInputRef = useRef();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setError('');

    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const validExtensions = ['.glb', '.gltf', '.fbx'];
    
    if (!validExtensions.includes(extension)) {
      setError('Vui lòng tải lên tệp 3D hợp lệ (.glb, .gltf, .fbx)');
      setLoading(false);
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const blob = new Blob([e.target.result], { type: file.type });
        const url = URL.createObjectURL(blob);
        
        // Giải phóng model cũ nếu có
        if (modelInfo.url && modelInfo.url !== DEFAULT_MODEL_URL) {
          URL.revokeObjectURL(modelInfo.url);
        }
        
        setModelInfo({ 
          url, 
          type: 'uploaded',
          name: file.name,
          isActive: true
        });
        setLoading(false);
      } catch (err) {
        setError(`Lỗi khi xử lý tệp: ${err.message}`);
        setLoading(false);
      }
    };
    
    reader.onerror = () => {
      setError('Lỗi khi đọc tệp');
      setLoading(false);
    };
    
    reader.readAsArrayBuffer(file);
  };

  const clearModel = () => {
    // Giải phóng bộ nhớ nếu không phải model mặc định
    if (modelInfo.url !== DEFAULT_MODEL_URL) {
      URL.revokeObjectURL(modelInfo.url);
    }
    
    // Xóa hoàn toàn model (kể cả mặc định)
    setModelInfo(prev => ({
      ...prev,
      isActive: false,
      url: '' // Xóa URL để không render model
    }));
  };

  const resetToDefault = () => {
    // Giải phóng model đang có nếu không phải mặc định
    if (modelInfo.url !== DEFAULT_MODEL_URL) {
      URL.revokeObjectURL(modelInfo.url);
    }
    
    // Reset về model mặc định
    setModelInfo({ 
      url: DEFAULT_MODEL_URL, 
      type: 'default',
      name: 'Mô hình mặc định',
      isActive: true
    });
  };

  // Giải phóng bộ nhớ khi component unmount hoặc model thay đổi
  useEffect(() => {
    return () => {
      if (modelInfo.url && modelInfo.url !== DEFAULT_MODEL_URL) {
        URL.revokeObjectURL(modelInfo.url);
      }
    };
  }, [modelInfo.url]);

  return (
    <div className="viewer-wrapper">
      <div className="controls">
        <input
          type="file"
          ref={fileInputRef}
          accept=".glb,.gltf,.fbx"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
        <button 
          onClick={() => fileInputRef.current.click()} 
          disabled={loading}
          className="upload-button"
        >
          {loading ? 'Đang tải...' : 'Tải lên mô hình'}
        </button>
        
        {modelInfo.isActive ? (
          <button 
            onClick={clearModel}
            disabled={loading || !modelInfo.isActive}
            className="clear-button"
          >
            Xóa mô hình
          </button>
        ) : (
          <button 
            onClick={resetToDefault}
            disabled={loading}
            className="reset-button"
          >
            Hiện mô hình mặc định
          </button>
        )}
      </div>

      {error && <div className="error">{error}</div>}

      <div className="model-info">
        {modelInfo.isActive ? (
          <>
            <span className="model-name">{modelInfo.name}</span>
            <span className="model-type">
              {modelInfo.type === 'default' ? 'Mặc định' : 'Đã tải lên'}
            </span>
          </>
        ) : (
          <span className="no-model">Không có mô hình nào được hiển thị</span>
        )}
      </div>

      <div className="canvas-container">
        <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          
          {modelInfo.isActive && modelInfo.url && (
            <Suspense fallback={<Loader />}>
              <Model key={modelInfo.url} url={modelInfo.url} />
            </Suspense>
          )}
          
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            enabled={modelInfo.isActive} // Vô hiệu hóa controls khi không có model
          />
          <gridHelper args={[10, 10]} />
          <axesHelper args={[5]} />
        </Canvas>
      </div>
    </div>
  );
}