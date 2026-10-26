'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  ScanLine,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Zap,
  Sliders,
  Keyboard,
  ArrowLeft,
  Activity,
  Cpu
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useDeviceStore } from '@/store/device.store';
import { playScanSuccessBeep } from '@/lib/audio-feedback';

interface ScanEventRecord {
  id: string;
  code: string;
  length: number;
  durationMs: number;
  hasEnterSuffix: boolean;
  timestamp: string;
  isHardwareScanner: boolean;
}

export default function BarcodeScannersPage() {
  const [inputValue, setInputValue] = useState('');
  const [scanHistory, setScanHistory] = useState<ScanEventRecord[]>([]);
  const [testResult, setTestResult] = useState<string | null>(null);

  const {
    globalScannerListening,
    audioBeepEnabled,
    setGlobalScannerListening,
    setAudioBeepEnabled,
    recordScan,
  } = useDeviceStore();

  // Timing measurement
  const firstKeyTime = useRef<number | null>(null);
  const lastKeyTime = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const now = performance.now();
    if (!firstKeyTime.current) {
      firstKeyTime.current = now;
    }
    lastKeyTime.current = now;

    if (e.key === 'Enter') {
      e.preventDefault();
      const code = inputValue.trim();
      if (!code) return;

      const duration = firstKeyTime.current ? Math.round(now - firstKeyTime.current) : 10;
      // Optical scanners typically enter 12-14 characters in under 80ms
      const isOptical = duration < 120 && code.length >= 4;

      const record: ScanEventRecord = {
        id: 'scan-' + Date.now(),
        code,
        length: code.length,
        durationMs: duration,
        hasEnterSuffix: true,
        timestamp: new Date().toLocaleTimeString(),
        isHardwareScanner: isOptical,
      };

      setScanHistory((prev) => [record, ...prev.slice(0, 9)]);
      setTestResult(isOptical ? 'VALID_HARDWARE' : 'MANUAL_TYPED');
      recordScan(code, duration);
      setInputValue('');
      firstKeyTime.current = null;
      lastKeyTime.current = null;

      if (audioBeepEnabled) {
        playScanSuccessBeep();
      }

      if (isOptical) {
        toast.success(`Hardware scan detected: "${code}" (${duration} ms)`);
      } else {
        toast.info(`Manual key entry detected: "${code}" (${duration} ms)`);
      }
    }
  };

  const clearHistory = () => {
    setScanHistory([]);
    setTestResult(null);
    setInputValue('');
    firstKeyTime.current = null;
    inputRef.current?.focus();
    toast.info('Test bench cleared');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hardware Scanner Diagnostics & Calibration Bench"
        description="Verify optical USB & wireless 2.4GHz barcode scanners, measure input velocity, and test Enter-key termination"
        action={
          <Link href="/settings">
            <Button variant="outline" className="rounded-xl">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Settings
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Test Bench Interactive Input */}
        <div className="lg:col-span-7 space-y-5">
          <Card className="border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <ScanLine className="h-4 w-4 text-blue-600" />
                    Interactive Scanner Test Target
                  </CardTitle>
                  <CardDescription>
                    Aim your physical optical scanner at any barcode and trigger a scan below
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={clearHistory} className="h-8 text-xs rounded-lg">
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Clear
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    ref={inputRef}
                    placeholder="Focus here and pull scanner trigger..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="h-12 text-base font-mono pl-4 pr-12 rounded-xl border-blue-300 dark:border-blue-800 focus-visible:ring-2 focus-visible:ring-blue-500 bg-blue-50/20"
                    autoFocus
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-[10px] font-mono text-emerald-600 font-semibold">READY</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  Tip: A properly configured scanner will instantly populate the barcode and send an <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-blue-600">[ENTER]</code> suffix.
                </p>
              </div>

              {/* Real-Time Result Alert */}
              {testResult && (
                <div
                  className={`p-4 rounded-xl border flex items-start gap-3 ${
                    testResult === 'VALID_HARDWARE'
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                      : 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                  }`}
                >
                  {testResult === 'VALID_HARDWARE' ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-sm">
                      {testResult === 'VALID_HARDWARE'
                        ? 'High-Speed Optical Scanner Confirmed!'
                        : 'Slow Input Velocity / Manual Keystroke Detected'}
                    </p>
                    <p>
                      {testResult === 'VALID_HARDWARE'
                        ? 'Input was received under 120ms with proper carriage return. This workstation is ready for high-volume POS checkout.'
                        : 'Characters were entered over >150ms. If using a physical scanner, ensure it is set to HID Keyboard Mode and baud rate is nominal.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Scan Telemetry Log */}
              <div className="space-y-2 pt-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Recent Scan Telemetry Log
                </Label>
                {scanHistory.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center border border-dashed rounded-xl">
                    No scans registered yet. Scan a test item above.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {scanHistory.map((rec) => (
                      <div
                        key={rec.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <Badge
                            className={
                              rec.isHardwareScanner
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]'
                                : 'bg-slate-100 text-slate-600 border-slate-200 text-[10px]'
                            }
                          >
                            {rec.isHardwareScanner ? 'OPTICAL' : 'KEYBOARD'}
                          </Badge>
                          <div>
                            <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                              {rec.code}
                            </span>
                            <span className="text-slate-400 ml-2">({rec.length} chars)</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 font-mono text-slate-500">
                          <span className="flex items-center gap-1">
                            <Activity className="h-3 w-3 text-blue-500" />
                            {rec.durationMs} ms
                          </span>
                          <span>{rec.timestamp}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Hardware Troubleshooting Guide */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Cpu className="h-4 w-4 text-purple-600" />
                Workstation Calibration Guide
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5 pt-4 text-xs text-slate-600 dark:text-slate-300">
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 dark:text-white">1. Enter Key Suffix (Carriage Return)</h4>
                <p>
                  POS and Goods Receiving require an automatic <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-blue-600">[ENTER]</code> suffix after every scan. Scan the <em>"Add CR/LF Suffix"</em> barcode from your scanner user manual.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 dark:text-white">2. Keyboard Language Mapping</h4>
                <p>
                  If scanned numbers output special characters (e.g. <code className="bg-slate-100 px-1 rounded">!@#$</code> instead of <code className="bg-slate-100 px-1 rounded">1234</code>), verify that Caps Lock is off and your Windows input method is set to standard US English.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 dark:text-white">3. Supported Symbologies</h4>
                <p>
                  InventoryOS decodes <strong>Code-128, EAN-13, UPC-A, QR Code, and DataMatrix</strong> natively at POS checkouts and warehouse terminals.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* POS Hardware Preferences */}
          <Card className="border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-600" />
                POS Hardware Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 text-xs">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold">Global Auto-Scan</Label>
                  <p className="text-[11px] text-slate-500">Capture scans anywhere on POS screen</p>
                </div>
                <Switch
                  checked={globalScannerListening}
                  onCheckedChange={setGlobalScannerListening}
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold">POS Optical Scanner Beep</Label>
                  <p className="text-[11px] text-slate-500">Synthesizes 1850Hz POS audio tone on scan</p>
                </div>
                <Switch
                  checked={audioBeepEnabled}
                  onCheckedChange={setAudioBeepEnabled}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
