import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Stage, Layer, Rect, Line, Text as KonvaText, Group, Circle } from 'react-konva';
import type Konva from 'konva';
import { useWorkOrder } from '@/hooks/use-work-order';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Home,
  Minus,
  MapPin,
  Type,
  Ruler,
  MousePointer,
  Trash2,
  Undo2,
  Redo2,
  Save,
  FileDown,
  ArrowLeft,
  Plus,
} from 'lucide-react';
import type { FenceSegmentData } from '@fencetastic/shared';
import { FenceStyle } from '@fencetastic/shared';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GRID_SIZE = 20; // 1 foot = 20px
const MIN_SCALE = 0.3;
const MAX_SCALE = 3;
const TOOLBAR_WIDTH = 56;
const PANEL_WIDTH = 320;
const TOPBAR_HEIGHT = 56;
const MAX_UNDO = 20;

type ToolType = 'select' | 'house' | 'fence' | 'gate' | 'label' | 'measure' | 'delete';

interface CanvasElement {
  id: string;
  type: 'house' | 'fence' | 'gate' | 'property' | 'text' | 'measure';
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: number[];
  text?: string;
  rotation?: number;
  gateType?: string;
  gateWidth?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function snapToGrid(val: number): number {
  return Math.round(val / GRID_SIZE) * GRID_SIZE;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function distanceBetweenPoints(points: number[]): number {
  let total = 0;
  for (let i = 0; i < points.length - 2; i += 2) {
    const dx = points[i + 2] - points[i];
    const dy = points[i + 3] - points[i + 1];
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total;
}

function pxToFeet(px: number): number {
  return Math.round((px / GRID_SIZE) * 10) / 10;
}

const FENCE_TYPE_OPTIONS = [
  'Wood B/B',
  'Wood S/S',
  'Wood Raw',
  'Iron',
  'Chain Link',
  'Vinyl',
] as const;

const ADDITION_OPTIONS = [
  'Top Cap',
  'Double Trim',
  'Single Trim',
  'Kickboard',
  'Boxed Post Covers',
  'Corbels',
  'Retaining Wall',
  'Gate Operator',
] as const;

const GATE_TYPES = ['Single Swing', 'Double Swing', 'Sliding', 'Walk Gate', 'Drive Gate'];

// ---------------------------------------------------------------------------
// Tool buttons
// ---------------------------------------------------------------------------

const TOOLS: { type: ToolType; icon: typeof MousePointer; label: string }[] = [
  { type: 'select', icon: MousePointer, label: 'Select' },
  { type: 'house', icon: Home, label: 'House' },
  { type: 'fence', icon: Minus, label: 'Fence' },
  { type: 'gate', icon: MapPin, label: 'Gate' },
  { type: 'label', icon: Type, label: 'Label' },
  { type: 'measure', icon: Ruler, label: 'Measure' },
  { type: 'delete', icon: Trash2, label: 'Delete' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WorkOrderPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { workOrder, isLoading, create, update, generatePdf } = useWorkOrder(projectId ?? '');

  // Canvas state
  const stageRef = useRef<Konva.Stage>(null);
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [segments, setSegments] = useState<FenceSegmentData[]>([]);
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [propertyNotes, setPropertyNotes] = useState('');

  // Fence drawing state
  const [fencePoints, setFencePoints] = useState<number[]>([]);
  const [isDrawingFence, setIsDrawingFence] = useState(false);

  // Measure tool state
  const [measureStart, setMeasureStart] = useState<{ x: number; y: number } | null>(null);

  // Inline input state (replaces prompt() popups)
  const [pendingLabel, setPendingLabel] = useState<{ x: number; y: number } | null>(null);
  const [labelText, setLabelText] = useState('');
  const [customAdditionText, setCustomAdditionText] = useState('');
  const [showCustomAdditionInput, setShowCustomAdditionInput] = useState(false);

  // Undo / redo
  const [, setUndoStack] = useState<CanvasElement[][]>([]);
  const [, setRedoStack] = useState<CanvasElement[][]>([]);

  // Canvas sizing
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  // ------ resize ------
  useEffect(() => {
    function handleResize() {
      setCanvasSize({
        width: Math.max(400, window.innerWidth - TOOLBAR_WIDTH - PANEL_WIDTH),
        height: Math.max(300, window.innerHeight - TOPBAR_HEIGHT - 48),
      });
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ------ load existing work order ------
  useEffect(() => {
    if (workOrder) {
      const drawing = workOrder.drawingData as {
        elements?: CanvasElement[];
        stagePos?: { x: number; y: number };
        scale?: number;
      };
      if (drawing.elements) setElements(drawing.elements);
      if (drawing.stagePos) setStagePos(drawing.stagePos);
      if (drawing.scale) setScale(drawing.scale);
      if (workOrder.propertyNotes) setPropertyNotes(workOrder.propertyNotes);

      // Re-link segment IDs to canvas element IDs so clicking a fence
      // line on canvas correctly selects the matching segment.
      if (workOrder.segments && drawing.elements) {
        const fenceElements = drawing.elements.filter((e) => e.type === 'fence');
        const relinked = workOrder.segments.map((seg, i) => ({
          ...seg,
          id: fenceElements[i]?.id ?? seg.id,
        }));
        setSegments(relinked);
      } else if (workOrder.segments) {
        setSegments(workOrder.segments);
      }
    }
  }, [workOrder]);

  // ------ undo helpers ------
  const pushUndo = useCallback(() => {
    setUndoStack((prev) => {
      const next = [...prev, elements];
      return next.length > MAX_UNDO ? next.slice(next.length - MAX_UNDO) : next;
    });
    setRedoStack([]);
  }, [elements]);

  const handleUndo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const stack = [...prev];
      const last = stack.pop()!;
      setRedoStack((r) => [...r, elements]);
      setElements(last);
      return stack;
    });
  }, [elements]);

  const handleRedo = useCallback(() => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const stack = [...prev];
      const last = stack.pop()!;
      setUndoStack((u) => [...u, elements]);
      setElements(last);
      return stack;
    });
  }, [elements]);

  // ------ canvas events ------
  function getRelativePointerPosition(): { x: number; y: number } | null {
    const stage = stageRef.current;
    if (!stage) return null;
    const pos = stage.getPointerPosition();
    if (!pos) return null;
    return {
      x: (pos.x - stagePos.x) / scale,
      y: (pos.y - stagePos.y) / scale,
    };
  }

  function handleStageClick(e: Konva.KonvaEventObject<MouseEvent>) {
    // Ignore clicks on existing shapes for delete / select
    const clickedOnEmpty = e.target === e.target.getStage();

    const pos = getRelativePointerPosition();
    if (!pos) return;

    const snappedX = snapToGrid(pos.x);
    const snappedY = snapToGrid(pos.y);

    switch (activeTool) {
      case 'select':
        if (clickedOnEmpty) setSelectedId(null);
        break;

      case 'house': {
        pushUndo();
        const el: CanvasElement = {
          id: uid(),
          type: 'house',
          x: snappedX,
          y: snappedY,
          width: 8 * GRID_SIZE,
          height: 6 * GRID_SIZE,
        };
        setElements((prev) => [...prev, el]);
        break;
      }

      case 'fence': {
        if (!isDrawingFence) {
          setIsDrawingFence(true);
          setFencePoints([snappedX, snappedY]);
        } else {
          setFencePoints((prev) => [...prev, snappedX, snappedY]);
        }
        break;
      }

      case 'gate': {
        pushUndo();
        const el: CanvasElement = {
          id: uid(),
          type: 'gate',
          x: snappedX,
          y: snappedY,
          gateType: 'Single Swing',
          gateWidth: 4,
        };
        setElements((prev) => [...prev, el]);
        setSelectedId(el.id);
        setActiveTool('select');
        break;
      }

      case 'measure': {
        if (!measureStart) {
          setMeasureStart({ x: snappedX, y: snappedY });
        } else {
          pushUndo();
          const pts = [measureStart.x, measureStart.y, snappedX, snappedY];
          const dx = snappedX - measureStart.x;
          const dy = snappedY - measureStart.y;
          const distPx = Math.sqrt(dx * dx + dy * dy);
          const distFt = pxToFeet(distPx);
          const el: CanvasElement = {
            id: uid(),
            type: 'measure',
            x: 0,
            y: 0,
            points: pts,
            text: `${distFt}'`,
          };
          setElements((prev) => [...prev, el]);
          setMeasureStart(null);
        }
        break;
      }

      case 'label': {
        setPendingLabel({ x: snappedX, y: snappedY });
        setLabelText('');
        break;
      }

      case 'delete': {
        // handled on element click
        if (clickedOnEmpty) break;
        break;
      }

      default:
        break;
    }
  }

  function handleStageDoubleClick() {
    if (activeTool === 'fence' && isDrawingFence && fencePoints.length >= 4) {
      pushUndo();
      const elId = uid();
      const el: CanvasElement = {
        id: elId,
        type: 'fence',
        x: 0,
        y: 0,
        points: [...fencePoints],
      };
      setElements((prev) => [...prev, el]);

      const linearFeet = pxToFeet(distanceBetweenPoints(fencePoints));
      const segNum = segments.length + 1;
      const seg: FenceSegmentData = {
        segmentNumber: segNum,
        fenceType: 'Wood B/B',
        style: FenceStyle.NORMAL,
        height: 6,
        linearFeet,
        steps: null,
        additions: [],
        customAdditions: [],
        notes: null,
      };
      setSegments((prev) => [...prev, { ...seg, id: elId }]);
      setSelectedId(elId);
      setActiveTool('select');

      setFencePoints([]);
      setIsDrawingFence(false);
    }
  }

  function handleElementClick(elId: string) {
    if (activeTool === 'delete') {
      pushUndo();
      setElements((prev) => prev.filter((el) => el.id !== elId));
      setSegments((prev) => prev.filter((s) => s.id !== elId));
      if (selectedId === elId) setSelectedId(null);
    } else if (activeTool === 'select') {
      setSelectedId(elId);
    }
  }

  function handleElementDragEnd(elId: string, x: number, y: number) {
    setElements((prev) =>
      prev.map((el) => (el.id === elId ? { ...el, x: snapToGrid(x), y: snapToGrid(y) } : el)),
    );
  }

  function handleWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = scale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const scaleBy = 1.05;
    const newScale =
      e.evt.deltaY < 0
        ? Math.min(oldScale * scaleBy, MAX_SCALE)
        : Math.max(oldScale / scaleBy, MIN_SCALE);
    setScale(newScale);
    setStagePos({
      x: pointer.x - ((pointer.x - stagePos.x) / oldScale) * newScale,
      y: pointer.y - ((pointer.y - stagePos.y) / oldScale) * newScale,
    });
  }

  // ------ save ------
  async function handleSave() {
    if (!projectId) {
      alert('No project ID found. Cannot save work order.');
      return;
    }
    const drawingData = {
      elements,
      stagePos,
      scale,
    };
    const segPayload = segments.map(({ id: _id, ...rest }) => rest);

    try {
      if (workOrder) {
        await update(workOrder.id, {
          drawingData,
          propertyNotes: propertyNotes || null,
          segments: segPayload,
        });
      } else {
        await create({
          drawingData,
          propertyNotes: propertyNotes || null,
          segments: segPayload,
        });
      }
      alert('Work order saved!');
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save work order.');
    }
  }

  // ------ pdf ------
  async function handlePdf() {
    if (!workOrder) {
      alert('Please save the work order first.');
      return;
    }
    const stage = stageRef.current;
    if (!stage) return;
    const drawingImage = stage.toDataURL({ pixelRatio: 2 });
    try {
      await generatePdf(workOrder.id, drawingImage);
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('Failed to generate PDF.');
    }
  }

  // ------ segment editing helpers ------
  const selectedSegment = segments.find((s) => s.id === selectedId);
  const selectedGate = elements.find((e) => e.id === selectedId && e.type === 'gate') ?? null;

  function updateElement(elId: string, patch: Partial<CanvasElement>) {
    setElements((prev) => prev.map((e) => e.id === elId ? { ...e, ...patch } : e));
  }

  function updateSelectedSegment(patch: Partial<FenceSegmentData>) {
    if (!selectedId) return;
    setSegments((prev) =>
      prev.map((s) => (s.id === selectedId ? { ...s, ...patch } : s)),
    );
  }

  function toggleAddition(addition: string) {
    if (!selectedSegment) return;
    const current = selectedSegment.additions;
    const next = current.includes(addition)
      ? current.filter((a) => a !== addition)
      : [...current, addition];
    updateSelectedSegment({ additions: next });
  }

  function addCustomAddition() {
    if (!selectedSegment) return;
    setShowCustomAdditionInput(true);
    setCustomAdditionText('');
  }

  function confirmCustomAddition() {
    if (!selectedSegment || !customAdditionText.trim()) return;
    updateSelectedSegment({
      customAdditions: [...selectedSegment.customAdditions, customAdditionText.trim()],
    });
    setCustomAdditionText('');
    setShowCustomAdditionInput(false);
  }

  function addStep() {
    if (!selectedSegment) return;
    const steps = selectedSegment.steps ?? [];
    updateSelectedSegment({
      steps: [...steps, { position: 0, height: 6 }],
    });
  }

  function updateStep(idx: number, field: 'position' | 'height', val: number) {
    if (!selectedSegment) return;
    const steps = [...(selectedSegment.steps ?? [])];
    steps[idx] = { ...steps[idx], [field]: val };
    updateSelectedSegment({ steps });
  }

  // ------ grid lines ------
  function renderGrid() {
    const lines: React.ReactNode[] = [];
    const gridWidth = canvasSize.width * 3;
    const gridHeight = canvasSize.height * 3;
    const startX = -gridWidth / 2;
    const startY = -gridHeight / 2;

    for (let x = startX; x < gridWidth; x += GRID_SIZE) {
      lines.push(
        <Line key={`v${x}`} points={[x, startY, x, gridHeight]} stroke="#e5e7eb" strokeWidth={0.5} />,
      );
    }
    for (let y = startY; y < gridHeight; y += GRID_SIZE) {
      lines.push(
        <Line key={`h${y}`} points={[startX, y, gridWidth, y]} stroke="#e5e7eb" strokeWidth={0.5} />,
      );
    }
    return lines;
  }

  // ------ render elements ------
  function renderElements() {
    return elements.map((el) => {
      const isSelected = el.id === selectedId;
      switch (el.type) {
        case 'house':
          return (
            <Group
              key={el.id}
              x={el.x}
              y={el.y}
              draggable={activeTool === 'select'}
              onClick={() => handleElementClick(el.id)}
              onTap={() => handleElementClick(el.id)}
              onDragEnd={(e) =>
                handleElementDragEnd(el.id, e.target.x(), e.target.y())
              }
            >
              <Rect
                width={el.width ?? 160}
                height={el.height ?? 120}
                fill="#d1d5db"
                stroke={isSelected ? '#7c3aed' : '#6b7280'}
                strokeWidth={isSelected ? 2 : 1}
              />
              <KonvaText
                text="HOUSE"
                x={10}
                y={10}
                fontSize={14}
                fontStyle="bold"
                fill="#374151"
              />
              <KonvaText
                text={`${((el.width ?? 160) / GRID_SIZE).toFixed(0)}' x ${((el.height ?? 120) / GRID_SIZE).toFixed(0)}'`}
                x={10}
                y={30}
                fontSize={11}
                fill="#6b7280"
              />
            </Group>
          );

        case 'fence':
          return (
            <Group key={el.id}>
              <Line
                points={el.points ?? []}
                stroke={isSelected ? '#7c3aed' : '#92400e'}
                strokeWidth={isSelected ? 4 : 3}
                hitStrokeWidth={20}
                lineCap="round"
                lineJoin="round"
                onClick={() => handleElementClick(el.id)}
                onTap={() => handleElementClick(el.id)}
              />
              {(el.points ?? []).length >= 2 &&
                Array.from({ length: (el.points ?? []).length / 2 }).map((_, i) => {
                  const pts = el.points!;
                  return (
                    <Circle
                      key={`${el.id}-pt${i}`}
                      x={pts[i * 2]}
                      y={pts[i * 2 + 1]}
                      radius={4}
                      fill={isSelected ? '#7c3aed' : '#92400e'}
                      onClick={() => handleElementClick(el.id)}
                      onTap={() => handleElementClick(el.id)}
                    />
                  );
                })}
            </Group>
          );

        case 'gate':
          return (
            <Group
              key={el.id}
              x={el.x}
              y={el.y}
              draggable={activeTool === 'select'}
              onClick={() => handleElementClick(el.id)}
              onTap={() => handleElementClick(el.id)}
              onDragEnd={(e) =>
                handleElementDragEnd(el.id, e.target.x(), e.target.y())
              }
            >
              <Circle
                radius={14}
                fill={isSelected ? '#7c3aed' : '#dc2626'}
                stroke={isSelected ? '#5b21b6' : '#991b1b'}
                strokeWidth={1.5}
              />
              <KonvaText
                text="G"
                x={-5}
                y={-6}
                fontSize={12}
                fontStyle="bold"
                fill="white"
              />
              <KonvaText
                text={el.gateType ?? 'Gate'}
                x={-20}
                y={18}
                fontSize={9}
                fill="#666"
                align="center"
                width={40}
              />
            </Group>
          );

        case 'measure': {
          const pts = el.points ?? [];
          if (pts.length < 4) return null;
          const midX = (pts[0] + pts[2]) / 2;
          const midY = (pts[1] + pts[3]) / 2;
          return (
            <Group
              key={el.id}
              onClick={() => handleElementClick(el.id)}
              onTap={() => handleElementClick(el.id)}
            >
              <Line
                points={pts}
                stroke={isSelected ? '#7c3aed' : '#2563eb'}
                strokeWidth={1.5}
                dash={[6, 4]}
                lineCap="round"
                hitStrokeWidth={12}
              />
              <Circle
                x={pts[0]}
                y={pts[1]}
                radius={3}
                fill={isSelected ? '#7c3aed' : '#2563eb'}
              />
              <Circle
                x={pts[2]}
                y={pts[3]}
                radius={3}
                fill={isSelected ? '#7c3aed' : '#2563eb'}
              />
              <KonvaText
                text={el.text ?? ''}
                x={midX - 15}
                y={midY - 18}
                fontSize={12}
                fontStyle="bold"
                fill={isSelected ? '#7c3aed' : '#2563eb'}
                padding={2}
              />
            </Group>
          );
        }

        case 'text':
          return (
            <KonvaText
              key={el.id}
              x={el.x}
              y={el.y}
              text={el.text ?? ''}
              fontSize={14}
              fill={isSelected ? '#7c3aed' : '#111827'}
              draggable={activeTool === 'select'}
              onClick={() => handleElementClick(el.id)}
              onTap={() => handleElementClick(el.id)}
              onDragEnd={(e) =>
                handleElementDragEnd(el.id, e.target.x(), e.target.y())
              }
            />
          );

        default:
          return null;
      }
    });
  }

  // ------ drawing preview (fence in progress) ------
  function renderFencePreview() {
    if (!isDrawingFence || fencePoints.length < 2) return null;
    return (
      <Line
        points={fencePoints}
        stroke="#7c3aed"
        strokeWidth={2}
        dash={[6, 3]}
        lineCap="round"
        lineJoin="round"
      />
    );
  }

  // ------ measure tool preview (first point placed) ------
  function renderMeasurePreview() {
    if (activeTool !== 'measure' || !measureStart) return null;
    return (
      <Circle
        x={measureStart.x}
        y={measureStart.y}
        radius={5}
        fill="#2563eb"
        opacity={0.5}
      />
    );
  }

  // ------ summary ------
  const totalLinearFeet = segments.reduce((sum, s) => sum + s.linearFeet, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading work order...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* ---- Top Bar ---- */}
      <div
        className="flex items-center justify-between border-b px-4 shrink-0"
        style={{ height: TOPBAR_HEIGHT }}
      >
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold">Work Order</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleUndo} title="Undo">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleRedo} title="Redo">
            <Redo2 className="h-4 w-4" />
          </Button>
          <Button size="sm" className="rounded-2xl bg-slate-950 px-5 text-white hover:bg-slate-800" onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
          <Button size="sm" className="rounded-2xl border-black/10 bg-white/70" variant="outline" onClick={handlePdf}>
            <FileDown className="h-4 w-4 mr-1" />
            PDF
          </Button>
        </div>
      </div>

      {/* ---- Body ---- */}
      <div className="flex flex-1 min-h-0">
        {/* ---- Left Toolbar ---- */}
        <div
          className="flex flex-col border-r bg-muted/30 shrink-0 py-2 gap-1 items-center"
          style={{ width: TOOLBAR_WIDTH }}
        >
          {TOOLS.map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              title={label}
              onClick={() => {
                // Auto-commit in-progress fence when switching tools
                if (type !== 'fence' && isDrawingFence && fencePoints.length >= 4) {
                  const elId = uid();
                  const el: CanvasElement = { id: elId, type: 'fence', x: 0, y: 0, points: [...fencePoints] };
                  setElements((prev) => [...prev, el]);
                  const linearFeet = pxToFeet(distanceBetweenPoints(fencePoints));
                  const seg: FenceSegmentData = {
                    segmentNumber: segments.length + 1, fenceType: 'Wood B/B', style: FenceStyle.NORMAL,
                    height: 6, linearFeet, steps: null, additions: [], customAdditions: [], notes: null,
                  };
                  setSegments((prev) => [...prev, { ...seg, id: elId }]);
                  setSelectedId(elId);
                } else if (type !== 'fence' && isDrawingFence) {
                  setFencePoints([]);
                }
                setIsDrawingFence(false);
                setFencePoints([]);
                if (type !== 'measure') setMeasureStart(null);
                setActiveTool(type);
              }}
              className={`flex items-center justify-center w-10 h-10 rounded-md transition-colors ${
                activeTool === type
                  ? 'bg-purple-600 text-white'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <Icon className="h-5 w-5" />
            </button>
          ))}
        </div>

        {/* ---- Canvas ---- */}
        <div className="flex-1 min-w-0 bg-white relative">
          <Stage
            ref={stageRef}
            width={canvasSize.width}
            height={canvasSize.height}
            scaleX={scale}
            scaleY={scale}
            x={stagePos.x}
            y={stagePos.y}
            draggable={activeTool === 'select'}
            onClick={handleStageClick}
            onTap={handleStageClick}
            onDblClick={handleStageDoubleClick}
            onDblTap={handleStageDoubleClick}
            onWheel={handleWheel}
            onDragEnd={(e) => {
              if (e.target === stageRef.current) {
                setStagePos({ x: e.target.x(), y: e.target.y() });
              }
            }}
          >
            <Layer>
              {renderGrid()}
              {renderElements()}
              {renderFencePreview()}
              {renderMeasurePreview()}
            </Layer>
          </Stage>
          {/* Label inline input */}
          {pendingLabel && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex gap-1 bg-white border border-black/10 rounded-2xl shadow-lg p-2">
              <Input
                autoFocus
                className="h-8 w-48 text-sm rounded-2xl border-black/10 bg-white shadow-sm"
                placeholder="Enter label text..."
                value={labelText}
                onChange={(e) => setLabelText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && labelText.trim()) {
                    pushUndo();
                    setElements((prev) => [...prev, { id: uid(), type: 'text' as const, x: pendingLabel.x, y: pendingLabel.y, text: labelText.trim() }]);
                    setPendingLabel(null);
                    setLabelText('');
                  }
                  if (e.key === 'Escape') { setPendingLabel(null); setLabelText(''); }
                }}
              />
              <Button size="sm" className="h-8 rounded-2xl bg-slate-950 text-white hover:bg-slate-800" disabled={!labelText.trim()} onClick={() => {
                pushUndo();
                setElements((prev) => [...prev, { id: uid(), type: 'text' as const, x: pendingLabel.x, y: pendingLabel.y, text: labelText.trim() }]);
                setPendingLabel(null); setLabelText('');
              }}>Add</Button>
              <Button size="sm" variant="outline" className="h-8 rounded-2xl border-black/10 bg-white/70" onClick={() => { setPendingLabel(null); setLabelText(''); }}>Cancel</Button>
            </div>
          )}
          {/* Zoom indicator */}
          <div className="absolute bottom-3 left-3 text-xs text-muted-foreground bg-white/80 rounded px-2 py-1">
            {Math.round(scale * 100)}%
          </div>
        </div>

        {/* ---- Right Panel ---- */}
        <div
          className="border-l bg-muted/10 overflow-y-auto shrink-0"
          style={{ width: PANEL_WIDTH }}
        >
          <div className="p-4 space-y-4">
            {/* Segment properties */}
            {selectedSegment ? (
              <section className="shell-panel rounded-[28px] p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Fence</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-slate-950">
                  Segment {selectedSegment.segmentNumber}
                </h2>
                <div className="mt-4 space-y-3">
                  {/* Fence Type */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Fence Type
                    </label>
                    <Select
                      value={selectedSegment.fenceType}
                      onValueChange={(v) => updateSelectedSegment({ fenceType: v })}
                    >
                      <SelectTrigger className="mt-1 rounded-2xl border-black/10 bg-white shadow-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FENCE_TYPE_OPTIONS.map((ft) => (
                          <SelectItem key={ft} value={ft}>
                            {ft}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Style */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Style
                    </label>
                    <div className="flex gap-1 mt-1">
                      {[FenceStyle.NORMAL, FenceStyle.STEPPED].map((st) => (
                        <Button
                          key={st}
                          size="sm"
                          variant={
                            selectedSegment.style === st ? 'default' : 'outline'
                          }
                          onClick={() => updateSelectedSegment({ style: st })}
                          className={`flex-1 rounded-2xl ${selectedSegment.style === st ? 'bg-slate-950 text-white hover:bg-slate-800' : 'border-black/10 bg-white/70'}`}
                        >
                          {st === FenceStyle.NORMAL ? 'Normal' : 'Stepped'}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Height */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Height (ft)
                    </label>
                    <Input
                      type="number"
                      className="mt-1 rounded-2xl border-black/10 bg-white shadow-sm"
                      value={selectedSegment.height}
                      onChange={(e) =>
                        updateSelectedSegment({
                          height: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>

                  {/* Linear Feet */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Linear Feet
                    </label>
                    <Input
                      type="number"
                      className="mt-1 rounded-2xl border-black/10 bg-white shadow-sm"
                      value={selectedSegment.linearFeet}
                      onChange={(e) =>
                        updateSelectedSegment({
                          linearFeet: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>

                  {/* Steps (when stepped) */}
                  {selectedSegment.style === FenceStyle.STEPPED && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        Steps
                      </label>
                      {(selectedSegment.steps ?? []).map((step, idx) => (
                        <div key={idx} className="flex gap-2 mt-1">
                          <Input
                            type="number"
                            placeholder="Position"
                            className="flex-1 rounded-2xl border-black/10 bg-white shadow-sm"
                            value={step.position}
                            onChange={(e) =>
                              updateStep(
                                idx,
                                'position',
                                parseFloat(e.target.value) || 0,
                              )
                            }
                          />
                          <Input
                            type="number"
                            placeholder="Height"
                            className="flex-1 rounded-2xl border-black/10 bg-white shadow-sm"
                            value={step.height}
                            onChange={(e) =>
                              updateStep(
                                idx,
                                'height',
                                parseFloat(e.target.value) || 0,
                              )
                            }
                          />
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-1"
                        onClick={addStep}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Step
                      </Button>
                    </div>
                  )}

                  {/* Additions */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Additions
                    </label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {ADDITION_OPTIONS.map((a) => (
                        <Badge
                          key={a}
                          variant={
                            selectedSegment.additions.includes(a)
                              ? 'default'
                              : 'outline'
                          }
                          className="cursor-pointer text-xs"
                          onClick={() => toggleAddition(a)}
                        >
                          {a}
                        </Badge>
                      ))}
                      {selectedSegment.customAdditions.map((ca) => (
                        <Badge key={ca} variant="default" className="text-xs">
                          {ca}
                        </Badge>
                      ))}
                    </div>
                    {showCustomAdditionInput ? (
                      <div className="flex gap-1 mt-1">
                        <Input
                          autoFocus
                          className="h-7 text-xs flex-1 rounded-2xl border-black/10 bg-white shadow-sm"
                          placeholder="Custom addition..."
                          value={customAdditionText}
                          onChange={(e) => setCustomAdditionText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') confirmCustomAddition();
                            if (e.key === 'Escape') { setShowCustomAdditionInput(false); setCustomAdditionText(''); }
                          }}
                        />
                        <Button size="sm" className="h-7 text-xs rounded-2xl bg-slate-950 text-white hover:bg-slate-800" disabled={!customAdditionText.trim()} onClick={confirmCustomAddition}>Add</Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs rounded-2xl border-black/10 bg-white/70" onClick={() => { setShowCustomAdditionInput(false); setCustomAdditionText(''); }}>Cancel</Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-1"
                        onClick={addCustomAddition}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Custom
                      </Button>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Notes
                    </label>
                    <Textarea
                      className="mt-1 rounded-2xl border-black/10 bg-white shadow-sm"
                      rows={2}
                      value={selectedSegment.notes ?? ''}
                      onChange={(e) =>
                        updateSelectedSegment({
                          notes: e.target.value || null,
                        })
                      }
                    />
                  </div>
                </div>
              </section>
            ) : selectedGate ? (
              <section className="shell-panel rounded-[28px] p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Gate</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-slate-950">Gate Properties</h2>
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Gate Type
                    </label>
                    <Select
                      value={selectedGate.gateType ?? 'Single Swing'}
                      onValueChange={(v) => updateElement(selectedGate.id, { gateType: v })}
                    >
                      <SelectTrigger className="mt-1 rounded-2xl border-black/10 bg-white shadow-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GATE_TYPES.map((gt) => (
                          <SelectItem key={gt} value={gt}>
                            {gt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Width (ft)
                    </label>
                    <Input
                      type="number"
                      className="mt-1 rounded-2xl border-black/10 bg-white shadow-sm"
                      value={selectedGate.gateWidth ?? 4}
                      onChange={(e) =>
                        updateElement(selectedGate.id, {
                          gateWidth: parseFloat(e.target.value) || 4,
                        })
                      }
                    />
                  </div>
                </div>
              </section>
            ) : (
              <section className="shell-panel rounded-[28px] p-6 text-center text-sm text-slate-600">
                Select a fence segment to edit properties
              </section>
            )}

            {/* Property Notes */}
            <section className="shell-panel rounded-[28px] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Notes</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-slate-950">Property Notes</h2>
              <div className="mt-4">
                <Textarea
                  rows={3}
                  placeholder="General property notes..."
                  value={propertyNotes}
                  onChange={(e) => setPropertyNotes(e.target.value)}
                  className="rounded-2xl border-black/10 bg-white shadow-sm"
                />
              </div>
            </section>

            {/* Summary */}
            <section className="shell-panel rounded-[28px] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Overview</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-slate-950">Summary</h2>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Segments</span>
                  <span className="font-medium">{segments.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Linear Feet</span>
                  <span className="font-medium">{totalLinearFeet.toFixed(1)}</span>
                </div>
                {segments.length > 0 && (
                  <div className="border-t pt-2 mt-2 space-y-1">
                    {segments.map((s) => (
                      <div
                        key={s.id ?? s.segmentNumber}
                        className="flex justify-between text-xs"
                      >
                        <span>
                          Seg {s.segmentNumber} ({s.fenceType})
                        </span>
                        <span>{s.linearFeet.toFixed(1)} ft</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
