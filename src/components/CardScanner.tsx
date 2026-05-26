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
  const [detectedCandidates, setDetectedCandidates] = useState<string[]>([]);

  // Start Camera Stream
  useEffect(() => {
    setupCamera();

    return () => {
      stopCamera();
    };
  }, [selectedCameraId]);

  // Attach stream to video element when it mounts and is visible
  useEffect(() => {
    if (!isInitializing && hasPermission && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(err => {
        console.error("Error playing camera video stream:", err);
      });
    }
  }, [isInitializing, hasPermission]);

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
    setDetectedCandidates([]);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      setIsScanning(false);
      return;
    }

    // Set canvas dimensions by calculating the exact card name area inside the viewfinder
    const viewfinder = document.querySelector('.scanner-viewfinder');
    const videoRect = video.getBoundingClientRect();
    
    if (viewfinder && videoRect.width > 0) {
      const vfRect = viewfinder.getBoundingClientRect();
      
      // Card name is in the top-middle region of the viewfinder
      // Crop a rectangle relative to the viewfinder bounds
      const cropX = vfRect.left - videoRect.left + (vfRect.width * 0.05);
      const cropY = vfRect.top - videoRect.top + (vfRect.height * 0.02);
      const cropWidth = vfRect.width * 0.9;
      const cropHeight = vfRect.height * 0.25; // upper 25% area containing the title strip
      
      // Translate display scales to actual resolution dimensions
      const scaleX = video.videoWidth / videoRect.width;
      const scaleY = video.videoHeight / videoRect.height;
      
      const sourceX = Math.max(0, cropX * scaleX);
      const sourceY = Math.max(0, cropY * scaleY);
      const sourceWidth = Math.min(video.videoWidth - sourceX, cropWidth * scaleX);
      const sourceHeight = Math.min(video.videoHeight - sourceY, cropHeight * scaleY);
      
      canvas.width = sourceWidth;
      canvas.height = sourceHeight;
      
      ctx.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, sourceWidth, sourceHeight);
    } else {
      // Fallback: Crop center horizontal third if viewfinder element is missing
      const fallbackW = video.videoWidth * 0.6;
      const fallbackH = video.videoHeight * 0.15;
      const fallbackX = (video.videoWidth - fallbackW) / 2;
      const fallbackY = video.videoHeight * 0.25; // upper quadrant
      
      canvas.width = fallbackW;
      canvas.height = fallbackH;
      ctx.drawImage(video, fallbackX, fallbackY, fallbackW, fallbackH, 0, 0, fallbackW, fallbackH);
    }

    // Pre-processing: Convert to black-and-white high contrast image for optimal OCR success rate
    try {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const grayscale = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        // Adaptive thresholding: if brighter than 115, make it pure white, else pure black
        const finalVal = grayscale > 115 ? 255 : 0;
        d[i] = finalVal;
        d[i + 1] = finalVal;
        d[i + 2] = finalVal;
      }
      ctx.putImageData(imgData, 0, 0);
    } catch (e) {
      console.warn("Failed canvas pixel preprocessing, falling back to raw crop:", e);
    }

    try {
      // Initialize Tesseract worker
      // We load English trained data for commander titles
      const worker = await createWorker('eng');
      
      const { data: { text } } = await worker.recognize(canvas);
      await worker.terminate();

      if (!text || !text.trim()) {
        throw new Error('No text recognized. Align card title inside the top section of the blue box.');
      }

      // Filter and score detected words
      const candidates = extractCardNameCandidates(text);
      if (candidates.length === 0) {
        throw new Error('No card name candidates identified. Ensure the card is aligned and text is sharp.');
      }

      setScanStatus(`Searching candidates: "${candidates.slice(0, 2).join(', ')}"`);
      setDetectedCandidates(candidates);

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

      throw new Error(`Scryfall found no matches for scanned words: "${candidates.join(', ')}". Choose manually or retry.`);
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
        <div className="scanner-footer" style={{ background: 'rgba(12,12,14,0.92)', borderRadius: '18px 18px 0 0', padding: '16px 20px 24px 20px', width: '100%', position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          {ocrError && (
            <div className="glass-panel" style={{ padding: '8px 14px', borderRadius: '12px', borderLeft: '4px solid #ff6b6b', background: 'rgba(255, 107, 107, 0.1)', fontSize: '12px', color: '#ff8b8b', width: '100%', textAlign: 'center', marginBottom: '10px' }}>
              {ocrError}
            </div>
          )}

          {detectedCandidates.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Tap detected name to search:</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', maxHeight: '80px', overflowY: 'auto', width: '100%', padding: '2px' }}>
                {detectedCandidates.map((candidate) => (
                  <button
                    key={candidate}
                    type="button"
                    className="tag-pill"
                    style={{ border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', cursor: 'pointer', outline: 'none', padding: '6px 12px', fontSize: '12px', borderRadius: '6px', color: '#fff', fontWeight: 600 }}
                    onClick={async () => {
                      setScanStatus(`Searching Scryfall for "${candidate}"...`);
                      try {
                        const results = await scryfallClient.searchCommanderCandidates(candidate);
                        if (results.length > 0) {
                          onSelectScannedCommander(results);
                          stopCamera();
                        } else {
                          alert(`Scryfall found no exact commander matches for "${candidate}". Try correcting name inside the search box.`);
                        }
                      } catch (err) {
                        alert(`Search failed: ${err instanceof Error ? err.message : String(err)}`);
                      }
                    }}
                  >
                    {candidate}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="scanner-prompt glass-material" style={{ marginBottom: '12px', width: '100%', textAlign: 'center' }}>
            {scanStatus}
          </div>

          <button
            type="button"
            className="scanner-btn-capture"
            onClick={captureAndRecognize}
            disabled={isScanning}
            aria-label="Capture and scan card"
            style={{ margin: '0 auto' }}
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
