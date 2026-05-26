//
//  CardScanner.tsx
//  WUBRG-web
//
//  Created by Codex on 2026-05-26.
//

import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, RefreshCw, AlertTriangle } from 'lucide-react';
import { createWorker } from 'tesseract.js';
import { scryfallClient, ScryfallCard } from '../services/scryfall';

interface CardScannerProps {
  onClose: () => void;
  onSelectScannedCommander: (candidates: ScryfallCard[]) => void;
}

export const CardScanner: React.FC<CardScannerProps> = ({ onClose, onSelectScannedCommander }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<string>('Align card title inside the blue box');
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');

  // Start Camera Stream
  useEffect(() => {
    setupCamera();

    return () => {
      stopCamera();
    };
  }, [selectedCameraId]);

  const setupCamera = async () => {
    setIsInitializing(true);
    setOcrError(null);
    stopCamera();

    try {
      // Find back cameras specifically if available
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((device) => device.kind === 'videoinput');
      setCameras(videoDevices);

      let constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'environment', // prefer back camera
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      if (selectedCameraId) {
        constraints = {
          video: {
            deviceId: { exact: selectedCameraId },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        };
      } else if (videoDevices.length > 0) {
        // default to first back camera if possible
        const backCamera = videoDevices.find((device) => device.label.toLowerCase().includes('back') || device.label.toLowerCase().includes('rear'));
        if (backCamera) {
          setSelectedCameraId(backCamera.deviceId);
          return;
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasPermission(true);
    } catch (err) {
      console.error('Camera stream access failed:', err);
      setHasPermission(false);
      setOcrError('Camera access denied or unavailable. Grant camera permission in settings.');
    } finally {
      setIsInitializing(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const switchCamera = () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex((c) => c.deviceId === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    setSelectedCameraId(cameras[nextIndex].deviceId);
  };

  // Snaps viewport and processes OCR
  const captureAndRecognize = async () => {
    if (!videoRef.current || !canvasRef.current || isScanning) return;

    setIsScanning(true);
    setScanStatus('Scanning card name...');
    setOcrError(null);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      setIsScanning(false);
      return;
    }

    // Set canvas dimensions matching video resolution
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Crop coordinates (corresponding to center blue viewfinder)
    // The viewfinder is 260px wide by 360px tall in CSS, centered.
    // Let's translate this relative crop to video coordinate space
    const vWidth = video.videoWidth;
    const vHeight = video.videoHeight;

    // Capture the entire frame or crop around the center
    // Let's capture the center part containing the title
    ctx.drawImage(video, 0, 0, vWidth, vHeight);

    try {
      // Initialize Tesseract worker
      // We load English trained data for commander titles
      const worker = await createWorker('eng');
      
      const { data: { text } } = await worker.recognize(canvas);
      await worker.terminate();

      if (!text || !text.trim()) {
        throw new Error('No text detected. Try holding the card steady under better lighting.');
      }

      // Filter and score detected words
      const candidates = extractCardNameCandidates(text);
      if (candidates.length === 0) {
        throw new Error('Could not identify a clear card name. Ensure the card is aligned and text is sharp.');
      }

      setScanStatus(`Searching candidates: "${candidates.slice(0, 2).join(', ')}"`);

      // Try searching Scryfall with our best scored candidate names
      for (const name of candidates) {
        try {
          const results = await scryfallClient.searchCommanderCandidates(name);
          if (results.length > 0) {
            onSelectScannedCommander(results);
            stopCamera();
            return;
          }
        } catch (scryfallErr) {
          // continue to next candidate if not found
          continue;
        }
      }

      throw new Error(`Scryfall found no matches for scanned words: "${candidates.join(', ')}"`);
    } catch (err) {
      console.error('OCR Process failed:', err);
      setOcrError(err instanceof Error ? err.message : 'Recognition failed.');
      setScanStatus('Alignment active. Hold steady and tap Scan.');
    } finally {
      setIsScanning(false);
    }
  };

  // Replicate Swift candidate heuristic and scoring:
  const extractCardNameCandidates = (transcript: string): string[] => {
    const lines = transcript.split('\n');
    const cleaned = lines
      .map((line) => cleanCandidate(line))
      .filter((line) => isLikelyCardName(line));

    // Remove duplicates
    const unique = Array.from(new Set(cleaned));

    // Sort by descending score
    return unique.sort((a, b) => scoreCandidate(b) - scoreCandidate(a));
  };

  const cleanCandidate = (text: string): string => {
    return text
      .trim()
      .replace(/^[•·*#0-9]+/g, '') // remove leading symbols/bullets/digits
      .replace(/[•·*#0-9]+$/g, '') // remove trailing
      .trim();
  };

  const isLikelyCardName = (text: string): boolean => {
    if (text.length < 3 || text.length > 48) return false;

    const lower = text.toLowerCase();
    const blockedTerms = [
      '©', '™', 'wizards', 'coast', 'illustrated', 'illus',
      'artist', 'collector', 'not for sale', 'made in', 'printed',
      'legendary', 'creature', 'commander', 'token', 'deckmaster',
      'magic:', 'the gathering', 'www.', 'en '
    ];

    // Reject lines containing license details or type lines
    if (blockedTerms.some((term) => lower.includes(term))) {
      return false;
    }

    // Must have letters
    const letters = text.replace(/[^a-zA-Z]/g, '');
    if (letters.length < 3) return false;

    // Should not have multiple numerical digits
    const digits = text.replace(/[^0-9]/g, '');
    if (digits.length > 0) return false;

    return true;
  };

  const scoreCandidate = (text: string): number => {
    // Score based on distance from ideal MTG card name character count (around 18 letters)
    let value = 60 - Math.abs(text.length - 18);

    if (text.includes(',')) {
      value += 12; // High probability of legendary titles (e.g. "Atraxa, Praetors' Voice")
    }

    if (text.includes("'")) {
      value += 4;  // E.g. "Kraum, Ludevic's Opus"
    }

    if (text.split(' ').length >= 2) {
      value += 8;  // Card names are usually multiple words
    }

    if (text === text.toUpperCase()) {
      value -= 20; // Title card names are usually mixed case, all-caps are likely section headers or type lines
    }

    return value;
  };

  return (
    <div className="scanner-screen">
      {/* Scanner Header with Close and Camera Switch buttons */}
      <div className="scanner-header">
        <button
          type="button"
          className="btn btn-icon glass-material"
          onClick={() => {
            stopCamera();
            onClose();
          }}
          aria-label="Close scanner"
        >
          <X size={18} />
        </button>

        <span className="scanner-title">Scan Commander</span>

        {cameras.length > 1 ? (
          <button
            type="button"
            className="btn btn-icon glass-material"
            onClick={switchCamera}
            aria-label="Switch camera"
            title="Switch camera lens"
          >
            <RefreshCw size={18} />
          </button>
        ) : (
          <div style={{ width: '40px' }} />
        )}
      </div>

      {/* Video Viewport Stream */}
      <div className="scanner-video-wrapper">
        {hasPermission === false ? (
          <div className="empty-state" style={{ padding: '24px', zIndex: 5 }}>
            <AlertTriangle className="empty-icon" style={{ color: '#ff4a5a' }} />
            <span className="empty-title">Camera Unavailable</span>
            <p className="empty-desc" style={{ color: 'var(--text-secondary)' }}>
              {ocrError || 'Please enable camera permissions in your device settings to use the card scanner.'}
            </p>
            <button type="button" className="btn btn-primary" onClick={setupCamera} style={{ marginTop: '16px' }}>
              Retry Camera Permission
            </button>
          </div>
        ) : isInitializing ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div className="spinner" style={{ border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid var(--color-accent)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }}></div>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Configuring camera lens...</span>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="scanner-video"
            />
            {/* Transparent layout with blue viewfinder overlay */}
            <div className="scanner-viewfinder" />
          </>
        )}
      </div>

      {/* Bottom control panel */}
      {hasPermission && !isInitializing && (
        <div className="scanner-footer">
          {ocrError && (
            <div className="glass-panel" style={{ padding: '8px 14px', borderRadius: '12px', borderLeft: '4px solid #ff6b6b', background: 'rgba(255, 107, 107, 0.1)', fontSize: '12px', color: '#ff8b8b', maxWidth: '90%', textAlign: 'center' }}>
              {ocrError}
            </div>
          )}

          <div className="scanner-prompt glass-material">
            {scanStatus}
          </div>

          <button
            type="button"
            className="scanner-btn-capture"
            onClick={captureAndRecognize}
            disabled={isScanning}
            aria-label="Capture and scan card"
          >
            {isScanning ? (
              <RefreshCw size={24} style={{ animation: 'spin 1.2s linear infinite' }} />
            ) : (
              <Camera size={26} />
            )}
          </button>
        </div>
      )}

      {/* Offscreen Canvas for Snapshot Crops */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};
