'use client';

import { useState, useRef, useEffect } from 'react';
import { Camera, X, RefreshCw, Upload } from 'lucide-react';

type CameraCaptureProps = {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
};

export default function CameraCapture({ isOpen, onClose, onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [hasCamera, setHasCamera] = useState(true);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setHasCamera(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCamera(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const switchCamera = () => {
    stopCamera();
    setFacingMode(facingMode === 'user' ? 'environment' : 'user');
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file);
        onClose();
      }
    }, 'image/jpeg', 0.95);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="bg-black bg-opacity-50 p-4 flex items-center justify-between">
        <button
          onClick={onClose}
          className="text-white p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all"
        >
          <X size={24} />
        </button>
        <h2 className="text-white font-semibold text-lg">ถ่ายรูป</h2>
        <button
          onClick={switchCamera}
          className="text-white p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all"
        >
          <RefreshCw size={24} />
        </button>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative bg-black flex items-center justify-center">
        {hasCamera ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="max-w-full max-h-full"
          />
        ) : (
          <div className="text-white text-center p-8">
            <Camera size={64} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">ไม่สามารถเข้าถึงกล้องได้</p>
            <p className="text-sm opacity-75">กรุณาอนุญาตการใช้งานกล้องในเบราว์เซอร์</p>
          </div>
        )}
      </div>

      {/* Capture Button */}
      {hasCamera && (
        <div className="bg-black bg-opacity-50 p-6 flex justify-center">
          <button
            onClick={capturePhoto}
            className="w-20 h-20 bg-white rounded-full border-4 border-gray-300 hover:border-gray-400 transition-all shadow-lg"
          />
        </div>
      )}

      {/* Hidden Canvas */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
