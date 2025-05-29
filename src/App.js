import { useState } from 'react'
import AutoRiggingViewer from './components/AutoRiggingViewer'
import PoseEstimationViewer from './components/PoseEstimationViewer'
import './App.css'

export default function App() {
  const [activeTab, setActiveTab] = useState('auto-rigging')

  return (
    <div className="app-container">
      <div className="tabs">
        <button 
          className={activeTab === 'auto-rigging' ? 'active' : ''}
          onClick={() => setActiveTab('auto-rigging')}
        >
          Auto Rigging Viewer
        </button>
        <button 
          className={activeTab === 'pose-estimation' ? 'active' : ''}
          onClick={() => setActiveTab('pose-estimation')}
        >
          Pose Estimation Viewer
        </button>
      </div>

      <div className="viewer-container">
        {activeTab === 'auto-rigging' ? <AutoRiggingViewer /> : <PoseEstimationViewer />}
      </div>
    </div>
  )
}