import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { useLoader, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import './styles.css';

function PoseModel({ url, frame, animationData, isPlaying }) {
  const gltf = useLoader(GLTFLoader, url);
  const mixer = useRef();
  const modelRef = useRef();
  
  // Khởi tạo animation mixer nếu có animation trong file
  useEffect(() => {
    if (gltf.animations && gltf.animations.length > 0) {
      mixer.current = new THREE.AnimationMixer(gltf.scene);
      const action = mixer.current.clipAction(gltf.animations[0]);
      action.play();
    }
  }, [gltf]);
  
  // Áp dụng pose từ dữ liệu JSON nếu có
  useEffect(() => {
    if (animationData && animationData.frames && animationData.frames[frame]) {
      const frameData = animationData.frames[frame];
      
      // Áp dụng dữ liệu cho các bone
      gltf.scene.traverse((child) => {
        if (child.isBone && frameData[child.name]) {
          const { position, rotation, scale } = frameData[child.name];
          child.position.set(position.x, position.y, position.z);
          child.rotation.set(rotation.x, rotation.y, rotation.z);
          if (scale) child.scale.set(scale.x, scale.y, scale.z);
        }
      });
    }
  }, [frame, animationData, gltf]);
  
  // Cập nhật animation khi isPlaying thay đổi
  useFrame((_, delta) => {
    if (mixer.current && isPlaying) {
      mixer.current.update(delta);
    }
  });
  
  return <primitive ref={modelRef} object={gltf.scene} />;
}

function Loader() {
  return (
    <Html center>
      <div className="loader">Đang tải mô hình...</div>
    </Html>
  );
}

export default function PoseEstimationViewer() {
  const [modelData, setModelData] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef();
  const animationRef = useRef();
  const lastTimeRef = useRef(0);

  // Xử lý tải file lên
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setError('');
    setIsPlaying(false);
    setCurrentFrame(0);

    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (extension === '.json') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          
          // Kiểm tra cấu trúc JSON
          if (!data.modelUrl || !data.frames || !Array.isArray(data.frames)) {
            throw new Error('Cấu trúc JSON không hợp lệ. Cần có modelUrl và frames');
          }
          
          setModelData({
            type: 'json',
            animationData: data,
            modelUrl: data.modelUrl
          });
          setLoading(false);
        } catch (err) {
          setError(`Lỗi JSON: ${err.message}`);
          setLoading(false);
        }
      };
      reader.onerror = () => {
        setError('Lỗi khi đọc tệp');
        setLoading(false);
      };
      reader.readAsText(file);
    } else if (['.glb', '.gltf'].includes(extension)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const blob = new Blob([e.target.result], { type: file.type });
          const url = URL.createObjectURL(blob);
          setModelData({
            type: 'glb',
            modelUrl: url
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
    } else {
      setError('Vui lòng tải lên tệp hợp lệ (.json, .glb, .gltf)');
      setLoading(false);
    }
  };

  // Vòng lặp animation
  useEffect(() => {
    if (!isPlaying || !modelData) return;
    
    const totalFrames = modelData.type === 'json' 
      ? modelData.animationData.frames.length 
      : 100;
    
    const frameRate = 30; // FPS
    let animationFrameId;
    
    const animate = (time) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const delta = (time - lastTimeRef.current) / 1000;
      
      if (delta > 1 / frameRate) {
        setCurrentFrame(prev => {
          const nextFrame = (prev + 1) % totalFrames;
          return nextFrame;
        });
        lastTimeRef.current = time;
      }
      
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animationFrameId = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isPlaying, modelData]);

  // Xử lý thay đổi frame từ timeline
  const handleFrameChange = (e) => {
    setCurrentFrame(parseInt(e.target.value));
  };

  // Xóa model và giải phóng bộ nhớ
  const clearModel = () => {
    if (modelData) {
      URL.revokeObjectURL(modelData.modelUrl);
    }
    setModelData(null);
    setIsPlaying(false);
    setCurrentFrame(0);
    lastTimeRef.current = 0;
  };

  // Xử lý pause animation
  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="viewer-wrapper">
      <div className="controls">
        <input
          type="file"
          ref={fileInputRef}
          accept=".json,.glb,.gltf"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
        <button 
          onClick={() => fileInputRef.current.click()} 
          disabled={loading}
        >
          {loading ? 'Đang tải...' : 'Tải lên dữ liệu Pose'}
        </button>
        {modelData && (
          <>
            <button 
              onClick={togglePlayPause}
              disabled={loading}
              className={isPlaying ? 'pause-button' : 'play-button'}
            >
              {isPlaying ? (
                <>
                  <i className="icon-pause"></i> Tạm dừng
                </>
              ) : (
                <>
                  <i className="icon-play"></i> Phát
                </>
              )}
            </button>
            <button 
              onClick={clearModel}
              disabled={loading}
              className="clear-button"
            >
              <i className="icon-clear"></i> Xóa
            </button>
          </>
        )}
      </div>

      {error && <div className="error">{error}</div>}

      <div className="canvas-container">
        <Canvas camera={{ position: [0, 1.5, 5], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <Suspense fallback={<Loader />}>
            {modelData && (
              <PoseModel 
                url={modelData.modelUrl} 
                frame={currentFrame}
                animationData={modelData.type === 'json' ? modelData.animationData : null}
                isPlaying={isPlaying}
              />
            )}
          </Suspense>
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
          />
          <gridHelper args={[10, 10]} />
          <axesHelper args={[5]} />
        </Canvas>
      </div>

      {modelData && (
        <div className="timeline">
          <input
            type="range"
            min="0"
            max={modelData.type === 'json' ? modelData.animationData.frames.length - 1 : 100}
            value={currentFrame}
            onChange={handleFrameChange}
            style={{ width: '100%' }}
          />
          <div className="frame-info">
            <span>Frame: {currentFrame}</span>
            {modelData.type === 'json' && (
              <span>Tổng: {modelData.animationData.frames.length}</span>
            )}
            <span>Trạng thái: {isPlaying ? 'Đang phát' : 'Tạm dừng'}</span>
          </div>
        </div>
      )}
    </div>
  );
}