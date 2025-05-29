import  { useRef, useState, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF, Html } from '@react-three/drei'
import './styles.css'

function Model({ url }) {

   // Temporary use local example url for demo
  const { scene } = useGLTF(url)
  return <primitive object={scene} />
}

function Loader() {
  return (
    <Html center>
      <div className="loader">Loading...</div>
    </Html>
  )
}

export default function AutoRiggingViewer() {
   // Temporary use local example url for demo
  const [modelUrl, setModelUrl] = useState(null)
  const fileInputRef = useRef()

  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (!file) return

    const validExtensions = ['.glb', '.gltf', '.fbx']
    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    
    if (!validExtensions.includes(extension)) {
      alert('Please upload a valid 3D model file (.glb, .gltf, .fbx)')
      return
    }

    const url = URL.createObjectURL(file)
    setModelUrl(url)
  }

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
        <button onClick={() => fileInputRef.current.click()}>
          Upload 3D Model
        </button>
        {modelUrl && (
          <button onClick={() => setModelUrl(null)}>
            Clear Model
          </button>
        )}
      </div>

      <div className="canvas-container">
        <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <Suspense fallback={<Loader />}>
            {modelUrl && <Model url={modelUrl} />}
          </Suspense>
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
          />
          <gridHelper args={[10, 10]} />
        </Canvas>
      </div>
    </div>
  )
}