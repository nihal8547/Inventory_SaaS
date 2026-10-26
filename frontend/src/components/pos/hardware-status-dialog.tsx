'use client';

import React, { useState, useRef } from 'react';
import {
  Printer,
  ScanLine,
  Zap,
  Volume2,
  VolumeX,
  CheckCircle2,
  Sliders,
  DollarSign,
  Radio,
  RotateCcw,
  Sparkles,
  Layers,
  ChevronRight,
  Settings2,
  FileText,
  BadgeCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDeviceStore } from '@/store/device.store';
import { printTestReceipt, kickCashDrawer } from '@/lib/hardware-printer';
import { playScanSuccessBeep, playSaleCompleteChime } from '@/lib/audio-feedback';

interface HardwareStatusDialogProps {
  storeName?: string;
  branchName?: string;
}

export function HardwareStatusDialog({ storeName, branchName }: HardwareStatusDialogProps) {
  const [open, setOpen] = useState(false);
  const [testingPrinter, setTestingPrinter] = useState(false);
  const [kickingDrawer, setKickingDrawer] = useState(false);

  // Scanner test bench state
  const [testInputValue, setTestInputValue] = useState('');
  const [testResult, setTestResult] = useState<{ code: string; duration: number } | null>(null);
  const firstKeyRef = useRef<number | null>(null);

  const {
    printerConnectionType,
    paperSize,
    autoPrintReceipt,
    autoCutPaper,
    autoKickDrawer,
    lastTestPrintAt,
    printerStatus,
    scannerMode,
    globalScannerListening,
    audioBeepEnabled,
    lastScannedBarcode,
    lastScannedDurationMs,
    lastScannedAt,
    scannerStatus,
    cashDrawerConnected,
    setPrinterConnectionType,
    setPaperSize,
    setAutoPrintReceipt,
    setAutoCutPaper,
    setAutoKickDrawer,
    setGlobalScannerListening,
    setAudioBeepEnabled,
    recordTestPrint,
    recordDrawerKick,
    resetDeviceDefaults,
  } = useDeviceStore();

  const handleTestPrint = async () => {
    setTestingPrinter(true);
    try {
      const ok = await printTestReceipt({
        paperSize,
        storeName: storeName || 'InventoryOS Qatar Store',
        branchName: branchName || 'Retail Checkout #1',
      });
      if (ok) {
        recordTestPrint();
        toast.success(`Test receipt sent to ${paperSize} thermal printer!`);
      }
    } catch (e) {
      toast.error('Print spooler error. Verify system printer connection.');
    } finally {
      setTestingPrinter(false);
    }
  };

  const handleKickDrawer = async () => {
    setKickingDrawer(true);
    try {
      await kickCashDrawer();
      recordDrawerKick();
      playSaleCompleteChime();
      toast.success('Cash drawer RJ12 kick pulse signal transmitted!');
    } catch {
      toast.error('Cash drawer signal error.');
    } finally {
      setKickingDrawer(false);
    }
  };

  const handleTestScanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const now = performance.now();
    if (!firstKeyRef.current) {
      firstKeyRef.current = now;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const code = testInputValue.trim();
      if (!code) return;

      const duration = firstKeyRef.current ? Math.round(now - firstKeyRef.current) : 10;
      setTestResult({ code, duration });
      setTestInputValue('');
      firstKeyRef.current = null;

      if (audioBeepEnabled) {
        playScanSuccessBeep();
      }

      if (duration < 120) {
        toast.success(`Optical hardware scan validated: "${code}" in ${duration}ms`);
      } else {
        toast.info(`Manual key entry detected: "${code}" in ${duration}ms`);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 shadow-2xs hover:shadow-xs transition-all text-xs group"
          title="Hardware Peripherals: Thermal Printer, Barcode Scanner & Cash Drawer"
        >
          {/* Thermal Printer Status */}
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Printer className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300 group-hover:text-blue-600 transition-colors" />
            <span className="font-semibold text-slate-700 dark:text-slate-300 hidden xl:inline">
              Thermal {paperSize}
            </span>
          </div>

          <div className="h-3 w-[1px] bg-slate-200 dark:bg-slate-800" />

          {/* Barcode Scanner Status */}
          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
            <ScanLine className="h-3.5 w-3.5 text-blue-600" />
            <span className="font-medium text-[11px] hidden sm:inline">
              {globalScannerListening ? 'Scanner: Active' : 'Scanner: Paused'}
            </span>
          </div>

          <div className="h-3 w-[1px] bg-slate-200 dark:bg-slate-800" />

          {/* Settings gear */}
          <Settings2 className="h-3.5 w-3.5 text-slate-400 group-hover:rotate-45 transition-transform" />
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                POS Hardware & Peripheral Connections
              </DialogTitle>
              <DialogDescription className="text-xs">
                Manage thermal receipt printers, optical barcode scanners, and cash drawer triggers
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="printer" className="w-full mt-2">
          <TabsList className="grid grid-cols-3 w-full bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
            <TabsTrigger value="printer" className="rounded-lg text-xs font-semibold gap-1.5">
              <Printer className="h-3.5 w-3.5" />
              <span>Thermal Printer</span>
            </TabsTrigger>
            <TabsTrigger value="scanner" className="rounded-lg text-xs font-semibold gap-1.5">
              <ScanLine className="h-3.5 w-3.5" />
              <span>Barcode Scanner</span>
            </TabsTrigger>
            <TabsTrigger value="drawer" className="rounded-lg text-xs font-semibold gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              <span>Cash Drawer</span>
            </TabsTrigger>
          </TabsList>

          {/* ======================================================== */}
          {/* TAB 1: THERMAL RECEIPT PRINTER                           */}
          {/* ======================================================== */}
          <TabsContent value="printer" className="space-y-4 pt-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Printer className="h-4 w-4 text-emerald-600" />
                    Thermal Receipt Spooler
                  </h4>
                  <p className="text-xs text-slate-500">
                    High-speed receipt printing via standard OS print driver or silent POS spooler
                  </p>
                </div>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Ready
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Paper Roll Size */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Thermal Paper Standard</Label>
                  <Select
                    value={paperSize}
                    onValueChange={(val: any) => setPaperSize(val)}
                  >
                    <SelectTrigger className="rounded-lg text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="80mm">Thermal 80mm Roll (Standard Supermarket)</SelectItem>
                      <SelectItem value="58mm">Thermal 58mm Roll (Compact Retail)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Connection Protocol */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Printer Connection Protocol</Label>
                  <Select
                    value={printerConnectionType}
                    onValueChange={(val: any) => setPrinterConnectionType(val)}
                  >
                    <SelectTrigger className="rounded-lg text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SYSTEM_PRINT">System Printer Spooler (Default)</SelectItem>
                      <SelectItem value="WEB_USB">Direct WebUSB (ESC/POS)</SelectItem>
                      <SelectItem value="WEB_SERIAL">Direct Web Serial / COM</SelectItem>
                      <SelectItem value="NETWORK_IP">Network IP / Ethernet (Port 9100)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-medium">Auto-Print Receipt Upon Checkout</Label>
                    <p className="text-[11px] text-slate-400">
                      Instantly sends receipt to printer when sale is completed
                    </p>
                  </div>
                  <Switch
                    checked={autoPrintReceipt}
                    onCheckedChange={setAutoPrintReceipt}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-medium">Auto Paper Cut (ESC/POS)</Label>
                    <p className="text-[11px] text-slate-400">
                      Executes guillotine paper feed & cut command after print
                    </p>
                  </div>
                  <Switch
                    checked={autoCutPaper}
                    onCheckedChange={setAutoCutPaper}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-400">
                  {lastTestPrintAt
                    ? `Last test: ${new Date(lastTestPrintAt).toLocaleTimeString()}`
                    : 'No test prints executed yet'}
                </span>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleTestPrint}
                  disabled={testingPrinter}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs rounded-lg"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>{testingPrinter ? 'Printing...' : 'Send Test Receipt'}</span>
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ======================================================== */}
          {/* TAB 2: BARCODE SCANNER                                   */}
          {/* ======================================================== */}
          <TabsContent value="scanner" className="space-y-4 pt-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <ScanLine className="h-4 w-4 text-blue-600" />
                    Optical Barcode Scanner Engine
                  </h4>
                  <p className="text-xs text-slate-500">
                    Supports handheld USB, Bluetooth & 2.4GHz wireless laser/2D imagers
                  </p>
                </div>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
                  {globalScannerListening ? 'Listening' : 'Paused'}
                </Badge>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-medium">Global Keyboard-Wedge Auto-Scan</Label>
                    <p className="text-[11px] text-slate-400">
                      Captures scanned barcodes anywhere on the screen without clicking the search box
                    </p>
                  </div>
                  <Switch
                    checked={globalScannerListening}
                    onCheckedChange={setGlobalScannerListening}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      {audioBeepEnabled ? <Volume2 className="h-3.5 w-3.5 text-blue-600" /> : <VolumeX className="h-3.5 w-3.5 text-slate-400" />}
                      POS Optical Scanner Beep (Audio Feedback)
                    </Label>
                    <p className="text-[11px] text-slate-400">
                      Plays high-pitched 1850Hz POS hardware chime on successful barcode scan
                    </p>
                  </div>
                  <Switch
                    checked={audioBeepEnabled}
                    onCheckedChange={setAudioBeepEnabled}
                  />
                </div>
              </div>

              {/* Scanner Diagnostics Test Zone */}
              <div className="p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Scanner Live Diagnostics Test Input
                  </Label>
                  <span className="text-[10px] text-slate-400">Pull scanner trigger here</span>
                </div>
                <Input
                  value={testInputValue}
                  onChange={(e) => setTestInputValue(e.target.value)}
                  onKeyDown={handleTestScanKeyDown}
                  placeholder="Scan any product barcode to test velocity..."
                  className="h-9 text-xs font-mono rounded-lg"
                />

                {testResult && (
                  <div className="flex items-center justify-between p-2 rounded-md bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {testResult.code}
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      {testResult.duration} ms
                    </Badge>
                  </div>
                )}
              </div>

              {/* Last Scanned info */}
              {lastScannedBarcode && (
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>Last scanned: <code className="font-mono font-bold">{lastScannedBarcode}</code></span>
                  <span>{lastScannedAt ? new Date(lastScannedAt).toLocaleTimeString() : ''}</span>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ======================================================== */}
          {/* TAB 3: CASH DRAWER                                       */}
          {/* ======================================================== */}
          <TabsContent value="drawer" className="space-y-4 pt-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-amber-600" />
                    Electronic Cash Drawer (RJ12)
                  </h4>
                  <p className="text-xs text-slate-500">
                    Connected to POS thermal printer kick port for automated cash opening
                  </p>
                </div>
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
                  Ready
                </Badge>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-medium">Auto-Pop Cash Drawer on Cash Sale</Label>
                    <p className="text-[11px] text-slate-400">
                      Triggers drawer kick pulse upon confirming cash transactions
                    </p>
                  </div>
                  <Switch
                    checked={autoKickDrawer}
                    onCheckedChange={setAutoKickDrawer}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-400">
                  Standard ESC/POS RJ12 kick pulse
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleKickDrawer}
                  disabled={kickingDrawer}
                  className="gap-1.5 text-xs rounded-lg border-amber-200 hover:bg-amber-50 dark:border-amber-900 dark:hover:bg-amber-950/40 text-amber-700 dark:text-amber-300"
                >
                  <DollarSign className="h-3.5 w-3.5" />
                  <span>{kickingDrawer ? 'Kicking...' : 'Test Drawer Kick'}</span>
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex sm:justify-between items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetDeviceDefaults}
            className="text-xs text-slate-500 hover:text-slate-900 gap-1"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset Defaults</span>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setOpen(false)}
            className="text-xs bg-slate-900 hover:bg-slate-800 text-white rounded-lg"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
