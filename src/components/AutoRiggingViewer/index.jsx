import React, { useRef, useState, Suspense, useEffect, forwardRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import './styles.css';

const DEFAULT_MODEL_URL = 'store-shelf.glb';

// Sử dụng forwardRef để truy cập model từ component cha
const Model = forwardRef(({ url, type }, ref) => {
  let model;
  
  if (type === 'obj') {
    const obj = useLoader(OBJLoader, url);
    ref.current = obj; // Lưu tham chiếu
    model = <primitive object={obj} />;
  } 
  else if (type === 'fbx') {
    const fbx = useLoader(FBXLoader, url);
    ref.current = fbx; // Lưu tham chiếu
    model = <primitive object={fbx} />;
  }
  else {
    const gltf = useLoader(GLTFLoader, url);
    ref.current = gltf.scene; // Lưu tham chiếu
    model = <primitive object={gltf.scene} />;
  }
  
  return model;
});

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
    type: 'glb',
    name: 'Mô hình mặc định',
    isActive: true
  });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const fileInputRef = useRef();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const modelRef = useRef(null);
  const [, forceUpdate] = useState(); // Dùng để force re-render

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setError('');
    setShowColorPicker(false);

    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const validExtensions = ['.glb', '.gltf', '.fbx', '.obj'];
    
    if (!validExtensions.includes(extension)) {
      setError('Vui lòng tải lên tệp 3D hợp lệ (.glb, .gltf, .fbx, .obj)');
      setLoading(false);
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const blob = new Blob([e.target.result], { type: file.type });
        const url = URL.createObjectURL(blob);
        
        if (modelInfo.url && modelInfo.url !== DEFAULT_MODEL_URL) {
          URL.revokeObjectURL(modelInfo.url);
        }
        
        let modelType;
        if (extension === '.obj') modelType = 'obj';
        else if (extension === '.fbx') modelType = 'fbx';
        else modelType = 'gltf';
        
        setModelInfo({ 
          url, 
          type: modelType,
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
    
    if (extension === '.obj') {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  };

  const applyColorToModel = (color) => {
    if (!modelRef.current) return;
    
    modelRef.current.traverse((child) => {
      if (child.isMesh) {
        // Tạo bản sao của vật liệu hiện tại để tránh thay đổi trực tiếp
        const newMaterial = child.material.clone();
        newMaterial.color = new THREE.Color(color);
        child.material = newMaterial;
      }
    });
    
    // Force re-render để cập nhật thay đổi
    forceUpdate({});
  };

  const handleColorChange = (e) => {
    applyColorToModel(e.target.value);
  };

  const clearModel = () => {
    if (modelInfo.url && modelInfo.url !== DEFAULT_MODEL_URL) {
      URL.revokeObjectURL(modelInfo.url);
    }
    
    setModelInfo(prev => ({
      ...prev,
      isActive: false,
      url: ''
    }));
    setShowColorPicker(false);
  };

  const resetToDefault = () => {
    setModelInfo({ 
      url: DEFAULT_MODEL_URL, 
      type: 'glb',
      name: 'Mô hình mặc định',
      isActive: true
    });
    setShowColorPicker(false);
  };

  return (
    <div className="viewer-wrapper">
      <div className="controls">
        <input
          type="file"
          ref={fileInputRef}
          accept=".glb,.gltf,.fbx,.obj"
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
        
        {modelInfo.isActive && (
          <button 
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="color-toggle"
          >
            {showColorPicker ? 'Ẩn màu' : 'Thay đổi màu'}
          </button>
        )}
        
        {modelInfo.isActive ? (
          <button 
            onClick={clearModel}
            disabled={loading}
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

      {showColorPicker && (
        <div className="color-picker-panel">
          <label>Chọn màu mới:</label>
          <input 
            type="color" 
            defaultValue="#ff0000"
            onChange={handleColorChange}
          />
        </div>
      )}

      {error && <div className="error">{error}</div>}

      <div className="canvas-container">
        <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          
          {modelInfo.isActive && modelInfo.url && (
            <Suspense fallback={<Loader />}>
              <Model 
                key={modelInfo.url} 
                url={modelInfo.url} 
                type={modelInfo.type}
                ref={modelRef}
              />
            </Suspense>
          )}
          
          <OrbitControls enabled={modelInfo.isActive} />
          <gridHelper args={[10, 10]} />
          <axesHelper args={[5]} />
        </Canvas>
      </div>
    </div>
  );
}