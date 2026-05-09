const SVG_NS = 'http://www.w3.org/2000/svg';

export type ManualWriterPoint = {
    x: number;
    y: number;
    t: number; // ms from stroke start
};

export type ManualWriterStroke = {
    points: ManualWriterPoint[];
    startedAt: number;
    endedAt: number;
    sourceWidth?: number;
    sourceHeight?: number;
    sourceDrawingWidth?: number;
};

export type ManualWriterAnimateOptions = {
    onComplete?: () => void;
};

export type ManualWriterQuizOptions = {
    onCorrectStroke?: (data: { strokeIndex: number; stroke: ManualWriterStroke }) => void;
    onMistake?: () => void;
    [key: string]: unknown;
};

export type ManualWriterOptions = {
    width?: number;
    height?: number;
    padding?: number;
    strokeAnimationSpeed?: number;
    delayBetweenStrokes?: number;
    delayBetweenLoops?: number;
    drawingWidth?: number;
    drawingColor?: string;
    showCharacter?: boolean;
    showOutline?: boolean;
    showControls?: boolean;
    onComplete?: () => void;
    onNext?: () => void;
    [key: string]: unknown;
};

const defaultOptions: Required<Pick<ManualWriterOptions,
    | 'padding'
    | 'strokeAnimationSpeed'
    | 'delayBetweenStrokes'
    | 'delayBetweenLoops'
    | 'drawingWidth'
    | 'drawingColor'
    | 'showCharacter'
    | 'showOutline'
    | 'showControls'
>> = {
    padding: 5,
    strokeAnimationSpeed: 1,
    delayBetweenStrokes: 1000,
    delayBetweenLoops: 2000,
    drawingWidth: 20,
    drawingColor: '#555',
    showCharacter: true,
    showOutline: false,
    showControls: true,
};

type ControlButton = {
    group: SVGGElement;
    rect: SVGRectElement;
    label: SVGTextElement;
    enabled: boolean;
};

function cloneStroke(stroke: ManualWriterStroke): ManualWriterStroke {
    return {
        startedAt: stroke.startedAt,
        endedAt: stroke.endedAt,
        sourceWidth: stroke.sourceWidth,
        sourceHeight: stroke.sourceHeight,
        sourceDrawingWidth: stroke.sourceDrawingWidth,
        points: stroke.points.map((point) => ({ ...point })),
    };
}

export default class ManualWriter {
    static create(target: string | Element, character = '', options: ManualWriterOptions = {}): ManualWriter {
        return new ManualWriter(target, character, options);
    }

    private svg: SVGSVGElement;
    private character: string;
    private options: ManualWriterOptions;

    private layer: SVGGElement;
    private outlineGroup: SVGGElement;
    private drawingGroup: SVGGElement;
    private animationGroup: SVGGElement;
    private controlsGroup: SVGGElement;

    private undoButton: ControlButton | null = null;
    private redoButton: ControlButton | null = null;
    private nextButton: ControlButton | null = null;

    private strokes: ManualWriterStroke[] = [];
    private strokePaths: SVGPathElement[] = [];
    private redoStack: ManualWriterStroke[] = [];

    private activeStroke: ManualWriterStroke | null = null;
    private activePath: SVGPathElement | null = null;
    private activeStrokePerfStart = 0;

    private quizOptions: ManualWriterQuizOptions = {};
    private isQuizActive = false;
    private isDestroyed = false;

    private isCharacterVisible = true;
    private isOutlineVisible = false;

    private pointerId: number | null = null;

    private animationAbortController: AbortController | null = null;
    private loopAbortController: AbortController | null = null;

    private readonly onPointerDownBound: (event: PointerEvent) => void;
    private readonly onPointerMoveBound: (event: PointerEvent) => void;
    private readonly onPointerUpBound: (event: PointerEvent) => void;
    private readonly onPointerCancelBound: (event: PointerEvent) => void;

    constructor(target: string | Element, character = '', options: ManualWriterOptions = {}) {
        this.svg = ManualWriter.resolveTarget(target);
        this.character = character;
        this.options = {
            ...defaultOptions,
            ...options,
        };

        this.layer = document.createElementNS(SVG_NS, 'g');
        this.layer.setAttribute('class', 'manual-writer-layer');

        this.outlineGroup = document.createElementNS(SVG_NS, 'g');
        this.outlineGroup.setAttribute('class', 'manual-writer-outline');

        this.drawingGroup = document.createElementNS(SVG_NS, 'g');
        this.drawingGroup.setAttribute('class', 'manual-writer-drawing');

        this.animationGroup = document.createElementNS(SVG_NS, 'g');
        this.animationGroup.setAttribute('class', 'manual-writer-animation');

        this.controlsGroup = document.createElementNS(SVG_NS, 'g');
        this.controlsGroup.setAttribute('class', 'manual-writer-controls');

        this.layer.append(this.outlineGroup, this.drawingGroup, this.animationGroup, this.controlsGroup);
        this.svg.appendChild(this.layer);

        this.onPointerDownBound = this.onPointerDown.bind(this);
        this.onPointerMoveBound = this.onPointerMove.bind(this);
        this.onPointerUpBound = this.onPointerUp.bind(this);
        this.onPointerCancelBound = this.onPointerCancel.bind(this);

        this.setupListeners();
        this.applyOptionsToDom();

        if (this.options.showCharacter ?? true) {
            this.showCharacter();
        } else {
            this.hideCharacter();
        }

        if (this.options.showOutline ?? false) {
            this.showOutline();
        } else {
            this.hideOutline();
        }
    }

    quiz(options: ManualWriterQuizOptions = {}): void {
        this.quizOptions = {
            ...this.quizOptions,
            ...options,
        };
        if (!this.layer.isConnected) {
            this.svg.appendChild(this.layer);
        }
        this.isQuizActive = true;
    }

    putLayerOnTop(): void {
        if (this.layer.isConnected) {
            this.svg.appendChild(this.layer);
        }
    }

    cancelQuiz(): void {
        this.isQuizActive = false;
        this.endActiveStroke();
        this.stopCharacterAnimation();
        this.stopLoopCharacterAnimation();
        this.layer.remove();
    }

    showCharacter(): void {
        this.isCharacterVisible = true;
        this.drawingGroup.setAttribute('display', 'inline');
    }

    hideCharacter(): void {
        this.isCharacterVisible = false;
        this.drawingGroup.setAttribute('display', 'none');
    }

    showOutline(): void {
        this.isOutlineVisible = true;
        this.outlineGroup.setAttribute('display', 'inline');
    }

    hideOutline(): void {
        this.isOutlineVisible = false;
        this.outlineGroup.setAttribute('display', 'none');
    }

    setCharacter(character: string): void {
        this.character = character;
    }

    updateDimensions(options: { width?: number; height?: number; padding?: number } = {}): void {
        this._assignOptions(options);
    }

    _assignOptions(options: Partial<ManualWriterOptions>): void {
        this.options = {
            ...this.options,
            ...options,
        };
        this.applyOptionsToDom();
    }

    pauseAnimation(): void {
        this.stopCharacterAnimation();
    }

    resumeAnimation(): void {
        // API parity with HanziWriter.
        // Call animateCharacter() to restart.
    }

    async animateCharacter(options: ManualWriterAnimateOptions = {}): Promise<void> {
        if (this.isDestroyed) return;
        if (this.strokes.length === 0) {
            options.onComplete?.();
            this.options.onComplete?.();
            return;
        }

        this.stopCharacterAnimation();

        const controller = new AbortController();
        this.animationAbortController = controller;
        const signal = controller.signal;

        this.animationGroup.replaceChildren();
        this.drawingGroup.setAttribute('display', 'none');

        try {
            for (let i = 0; i < this.strokes.length; i++) {
                if (signal.aborted) return;
                await this.animateStroke(this.strokes[i], signal);

                if (i < this.strokes.length - 1) {
                    await this.delay(this.options.delayBetweenStrokes ?? defaultOptions.delayBetweenStrokes, signal);
                }
            }

            if (signal.aborted) return;
            options.onComplete?.();
            this.options.onComplete?.();
        } finally {
            if (this.animationAbortController === controller) {
                this.animationAbortController = null;
            }
            this.animationGroup.replaceChildren();
            if (this.isCharacterVisible) {
                this.drawingGroup.setAttribute('display', 'inline');
            }
        }
    }

    async loopCharacterAnimation(): Promise<void> {
        if (this.isDestroyed) return;
        this.stopLoopCharacterAnimation();

        const controller = new AbortController();
        this.loopAbortController = controller;
        const signal = controller.signal;

        while (!signal.aborted && !this.isDestroyed) {
            await this.animateCharacter();
            if (signal.aborted || this.isDestroyed) break;
            await this.delay(this.options.delayBetweenLoops ?? defaultOptions.delayBetweenLoops, signal).catch(() => undefined);
        }
    }

    stopLoopCharacterAnimation(): void {
        if (!this.loopAbortController) return;
        this.loopAbortController.abort();
        this.loopAbortController = null;
    }

    clearUserStrokes(): void {
        this.endActiveStroke();
        this.stopCharacterAnimation();
        this.strokes = [];
        this.strokePaths = [];
        this.redoStack = [];
        this.drawingGroup.replaceChildren();
        this.animationGroup.replaceChildren();
        this.updateControlStates();
    }

    getUserStrokes(): ManualWriterStroke[] {
        return this.strokes.map((stroke) => cloneStroke(stroke));
    }

    setUserStrokes(strokes: ManualWriterStroke[]): void {
        this.clearUserStrokes();
        for (const stroke of strokes) {
            const copy = this.scaleStrokeToCurrentSvg(cloneStroke(stroke));
            if (copy.points.length === 0) continue;
            this.strokes.push(copy);
            const path = this.createPathEl(
                this.pointsToPath(copy.points),
                this.getStrokeDrawingWidth(copy),
            );
            this.drawingGroup.appendChild(path);
            this.strokePaths.push(path);
        }
        this.updateControlStates();
    }

    undoStroke(): boolean {
        this.endActiveStroke();

        const removedStroke = this.strokes.pop();
        const removedPath = this.strokePaths.pop();
        if (!removedStroke) {
            if (removedPath) removedPath.remove();
            this.updateControlStates();
            return false;
        }

        removedPath?.remove();
        this.redoStack.push(cloneStroke(removedStroke));
        this.updateControlStates();
        return true;
    }

    redoStroke(): boolean {
        this.endActiveStroke();

        const stroke = this.redoStack.pop();
        if (!stroke) {
            this.updateControlStates();
            return false;
        }

        this.strokes.push(stroke);
        const path = this.createPathEl(
            this.pointsToPath(stroke.points),
            this.getStrokeDrawingWidth(stroke),
        );
        this.drawingGroup.appendChild(path);
        this.strokePaths.push(path);

        this.updateControlStates();
        return true;
    }

    destroy(): void {
        if (this.isDestroyed) return;
        this.isDestroyed = true;

        this.stopLoopCharacterAnimation();
        this.stopCharacterAnimation();
        this.cancelQuiz();

        this.svg.removeEventListener('pointerdown', this.onPointerDownBound);
        this.svg.removeEventListener('pointermove', this.onPointerMoveBound);
        this.svg.removeEventListener('pointerup', this.onPointerUpBound);
        this.svg.removeEventListener('pointercancel', this.onPointerCancelBound);

        this.layer.remove();
    }

    private static resolveTarget(target: string | Element): SVGSVGElement {
        const el = typeof target === 'string'
            ? document.getElementById(target.startsWith('#') ? target.slice(1) : target)
            : target;

        if (!el) {
            throw new Error(`ManualWriter target not found: ${String(target)}`);
        }

        if (el instanceof SVGSVGElement) {
            return el;
        }

        const nestedSvg = el.querySelector?.('svg');
        if (nestedSvg instanceof SVGSVGElement) {
            return nestedSvg;
        }

        throw new Error('ManualWriter target must be an SVG element or contain one');
    }

    private setupListeners(): void {
        this.svg.style.touchAction = 'none';
        this.svg.style.setProperty('-webkit-user-select', 'none');
        this.svg.style.setProperty('-webkit-touch-callout', 'none');

        this.svg.addEventListener('pointerdown', this.onPointerDownBound);
        this.svg.addEventListener('pointermove', this.onPointerMoveBound);
        this.svg.addEventListener('pointerup', this.onPointerUpBound);
        this.svg.addEventListener('pointercancel', this.onPointerCancelBound);
    }

    private applyOptionsToDom(): void {
        if (typeof this.options.width === 'number') {
            this.svg.setAttribute('width', `${this.options.width}`);
        }
        if (typeof this.options.height === 'number') {
            this.svg.setAttribute('height', `${this.options.height}`);
        }

        const drawingColor = this.options.drawingColor ?? defaultOptions.drawingColor;
        const drawingWidth = this.options.drawingWidth ?? defaultOptions.drawingWidth;

        for (let i = 0; i < this.strokePaths.length; i++) {
            const path = this.strokePaths[i];
            if (!path) continue;
            const stroke = this.strokes[i];
            this.applyPathStyle(path, drawingColor, this.getStrokeDrawingWidth(stroke));
        }
        if (this.activePath) {
            this.applyPathStyle(this.activePath, drawingColor, this.activeStroke?.sourceDrawingWidth ?? drawingWidth);
        }

        const showControls = this.options.showControls ?? defaultOptions.showControls;
        if (showControls) {
            this.renderControls();
            this.updateControlStates();
        } else {
            this.controlsGroup.replaceChildren();
            this.undoButton = null;
            this.redoButton = null;
            this.nextButton = null;
        }
    }

    private renderControls(): void {
        this.controlsGroup.replaceChildren();
        this.undoButton = null;
        this.redoButton = null;
        this.nextButton = null;

        const w = this.getSvgWidth();
        const h = this.getSvgHeight();
        if (w <= 0 || h <= 0) return;

        const margin = 8;
        const hBtn = 32;
        const smallW = 42;
        const nextW = 64;
        const gap = 8;
        const y = Math.max(0, h - margin - hBtn);
        const clampX = (x: number, btnWidth: number) => Math.max(0, Math.min(x, Math.max(0, w - btnWidth)));

        this.undoButton = this.createControlButton({
            x: clampX(margin, smallW),
            y,
            width: smallW,
            height: hBtn,
            text: '↶',
            onPress: () => this.undoStroke(),
            ariaLabel: 'Undo stroke',
        });
        this.redoButton = this.createControlButton({
            x: clampX(margin + smallW + gap, smallW),
            y,
            width: smallW,
            height: hBtn,
            text: '↷',
            onPress: () => this.redoStroke(),
            ariaLabel: 'Redo stroke',
        });
        this.nextButton = this.createControlButton({
            x: clampX(w - margin - nextW, nextW),
            y,
            width: nextW,
            height: hBtn,
            text: 'Next',
            onPress: () => this.options.onNext?.(),
            ariaLabel: 'Next character',
        });

        this.controlsGroup.append(this.undoButton.group, this.redoButton.group, this.nextButton.group);
    }

    private createControlButton({
        x,
        y,
        width,
        height,
        text,
        onPress,
        ariaLabel,
    }: {
        x: number;
        y: number;
        width: number;
        height: number;
        text: string;
        onPress: () => void;
        ariaLabel: string;
    }): ControlButton {
        const group = document.createElementNS(SVG_NS, 'g');
        group.setAttribute('transform', `translate(${x}, ${y})`);
        group.setAttribute('data-manual-writer-control', 'true');
        group.setAttribute('role', 'button');
        group.setAttribute('tabindex', '0');
        group.setAttribute('aria-label', ariaLabel);
        group.setAttribute('aria-disabled', 'false');
        group.style.cursor = 'pointer';

        const rect = document.createElementNS(SVG_NS, 'rect');
        rect.setAttribute('width', `${width}`);
        rect.setAttribute('height', `${height}`);
        rect.setAttribute('rx', '8');
        rect.setAttribute('ry', '8');
        rect.setAttribute('stroke', '#888888');
        rect.setAttribute('stroke-width', '1');

        const label = document.createElementNS(SVG_NS, 'text');
        label.setAttribute('x', `${width / 2}`);
        label.setAttribute('y', `${height / 2}`);
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('dominant-baseline', 'middle');
        label.setAttribute('font-size', text === 'Next' ? '15' : '20');
        label.setAttribute('font-weight', text === 'Next' ? '700' : '600');
        label.setAttribute('fill', '#2b2b2b');
        label.textContent = text;

        group.append(rect, label);

        const control: ControlButton = { group, rect, label, enabled: true };

        group.addEventListener('pointerdown', (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (!control.enabled) return;
            onPress();
        });
        group.addEventListener('pointerup', (event) => {
            event.preventDefault();
            event.stopPropagation();
        });
        group.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
        });
        group.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            event.stopPropagation();
            if (!control.enabled) return;
            onPress();
        });

        return control;
    }

    private updateControlStates(): void {
        this.setControlEnabled(this.undoButton, this.strokes.length > 0);
        this.setControlEnabled(this.redoButton, this.redoStack.length > 0);
        this.setControlEnabled(this.nextButton, typeof this.options.onNext === 'function');
    }

    private setControlEnabled(control: ControlButton | null, enabled: boolean): void {
        if (!control) return;
        control.enabled = enabled;
        control.group.style.pointerEvents = 'auto';
        control.group.style.cursor = enabled ? 'pointer' : 'default';
        control.group.style.opacity = enabled ? '1' : '0.45';
        control.group.setAttribute('aria-disabled', enabled ? 'false' : 'true');
        control.group.setAttribute('tabindex', enabled ? '0' : '-1');
        control.rect.setAttribute('fill', enabled ? '#ececec' : '#d9d9d9');
        control.label.setAttribute('fill', enabled ? '#2b2b2b' : '#8f8f8f');
    }

    private getSvgWidth(): number {
        const fromOptions = this.asNumber(this.options.width);
        if (fromOptions > 0) return fromOptions;

        const fromAttr = this.asNumber(this.svg.getAttribute('width'));
        if (fromAttr > 0) return fromAttr;

        const fromViewBox = this.svg.viewBox?.baseVal?.width ?? 0;
        if (fromViewBox > 0) return fromViewBox;

        return this.svg.getBoundingClientRect().width;
    }

    private getSvgHeight(): number {
        const fromOptions = this.asNumber(this.options.height);
        if (fromOptions > 0) return fromOptions;

        const fromAttr = this.asNumber(this.svg.getAttribute('height'));
        if (fromAttr > 0) return fromAttr;

        const fromViewBox = this.svg.viewBox?.baseVal?.height ?? 0;
        if (fromViewBox > 0) return fromViewBox;

        return this.svg.getBoundingClientRect().height;
    }

    private asNumber(value: unknown): number {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
            const n = Number.parseFloat(value);
            if (Number.isFinite(n)) return n;
        }
        return 0;
    }

    private onPointerDown(event: PointerEvent): void {
        if (this.isDestroyed) return;
        if (!this.isQuizActive) return;
        if (this.animationAbortController) return;
        if (event.button !== 0 && event.pointerType !== 'touch' && event.pointerType !== 'pen') return;

        const target = event.target as Element | null;
        if (target?.closest('[data-manual-writer-control="true"]')) return;

        event.preventDefault();

        this.pointerId = event.pointerId;
        this.svg.setPointerCapture(event.pointerId);

        const now = Date.now();
        this.activeStrokePerfStart = performance.now();
        const firstPoint = this.getPointFromEvent(event);

        this.activeStroke = {
            startedAt: now,
            endedAt: now,
            sourceWidth: this.getSvgWidth(),
            sourceHeight: this.getSvgHeight(),
            sourceDrawingWidth: this.options.drawingWidth ?? defaultOptions.drawingWidth,
            points: [{ ...firstPoint, t: 0 }],
        };

        this.activePath = this.createPathEl(
            this.pointsToPath(this.activeStroke.points),
            this.activeStroke.sourceDrawingWidth,
        );
        this.drawingGroup.appendChild(this.activePath);
    }

    private onPointerMove(event: PointerEvent): void {
        if (this.pointerId !== event.pointerId) return;
        if (!this.activeStroke || !this.activePath) return;

        event.preventDefault();

        const point = this.getPointFromEvent(event);
        const last = this.activeStroke.points[this.activeStroke.points.length - 1];
        const dx = point.x - last.x;
        const dy = point.y - last.y;
        if ((dx * dx + dy * dy) < 0.25) return;

        this.activeStroke.points.push(point);
        this.activePath.setAttribute('d', this.pointsToPath(this.activeStroke.points));
    }

    private onPointerUp(event: PointerEvent): void {
        if (this.pointerId !== event.pointerId) return;
        event.preventDefault();
        this.finishStroke(event);
    }

    private onPointerCancel(event: PointerEvent): void {
        if (this.pointerId !== event.pointerId) return;
        event.preventDefault();
        this.finishStroke(event);
    }

    private finishStroke(event: PointerEvent): void {
        const releasePointer = this.pointerId;
        this.pointerId = null;

        if (releasePointer !== null && this.svg.hasPointerCapture(releasePointer)) {
            this.svg.releasePointerCapture(releasePointer);
        }

        if (!this.activeStroke) return;

        const finalPoint = this.getPointFromEvent(event);
        const last = this.activeStroke.points[this.activeStroke.points.length - 1];
        const dx = finalPoint.x - last.x;
        const dy = finalPoint.y - last.y;
        if ((dx * dx + dy * dy) >= 0.25) {
            this.activeStroke.points.push(finalPoint);
        }

        this.activeStroke.endedAt = Date.now();

        if (this.activeStroke.points.length > 0) {
            this.strokes.push(this.activeStroke);
            this.redoStack = [];
            if (this.activePath) {
                this.strokePaths.push(this.activePath);
            }
            this.quizOptions.onCorrectStroke?.({
                strokeIndex: this.strokes.length - 1,
                stroke: this.activeStroke,
            });
        } else {
            this.activePath?.remove();
        }

        this.activeStroke = null;
        this.activePath = null;
        this.updateControlStates();
    }

    private endActiveStroke(): void {
        if (this.pointerId !== null && this.svg.hasPointerCapture(this.pointerId)) {
            this.svg.releasePointerCapture(this.pointerId);
        }
        this.pointerId = null;

        if (this.activePath) {
            this.activePath.remove();
        }

        this.activePath = null;
        this.activeStroke = null;
    }

    private stopCharacterAnimation(): void {
        if (!this.animationAbortController) return;
        this.animationAbortController.abort();
        this.animationAbortController = null;
        this.animationGroup.replaceChildren();
        if (this.isCharacterVisible) {
            this.drawingGroup.setAttribute('display', 'inline');
        }
    }

    private getPointFromEvent(event: PointerEvent): ManualWriterPoint {
        const ctm = this.svg.getScreenCTM();
        if (!ctm) {
            return { x: 0, y: 0, t: this.getStrokeElapsedMs() };
        }

        const pt = this.svg.createSVGPoint();
        pt.x = event.clientX;
        pt.y = event.clientY;

        const localPoint = pt.matrixTransform(ctm.inverse());
        return {
            x: localPoint.x,
            y: localPoint.y,
            t: this.getStrokeElapsedMs(),
        };
    }

    private getStrokeElapsedMs(): number {
        return Math.max(0, performance.now() - this.activeStrokePerfStart);
    }

    private createPathEl(d: string, width?: number): SVGPathElement {
        const path = document.createElementNS(SVG_NS, 'path');
        path.setAttribute('fill', 'none');
        path.setAttribute('d', d);
        this.applyPathStyle(
            path,
            this.options.drawingColor ?? defaultOptions.drawingColor,
            width ?? this.options.drawingWidth ?? defaultOptions.drawingWidth,
        );
        return path;
    }

    private applyPathStyle(path: SVGPathElement, color: string, width: number): void {
        path.setAttribute('stroke', color);
        path.setAttribute('stroke-width', `${width}`);
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
    }

    private pointsToPath(points: ManualWriterPoint[]): string {
        if (points.length === 0) return '';
        if (points.length === 1) {
            const p = points[0];
            return `M ${p.x} ${p.y} L ${p.x} ${p.y}`;
        }
        let d = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
            d += ` L ${points[i].x} ${points[i].y}`;
        }
        return d;
    }

    private pointsToPartialPath(points: ManualWriterPoint[], progress: number): string {
        if (points.length === 0) return '';
        if (points.length === 1) {
            const p = points[0];
            return `M ${p.x} ${p.y} L ${p.x} ${p.y}`;
        }

        const clamped = Math.max(0, Math.min(1, progress));
        if (clamped <= 0) {
            const p = points[0];
            return `M ${p.x} ${p.y} L ${p.x} ${p.y}`;
        }

        const segmentCount = points.length - 1;
        const scaled = clamped * segmentCount;
        const wholeSegments = Math.floor(scaled);
        const remainder = scaled - wholeSegments;

        let d = `M ${points[0].x} ${points[0].y}`;

        for (let i = 1; i <= wholeSegments; i++) {
            const p = points[i];
            if (!p) break;
            d += ` L ${p.x} ${p.y}`;
        }

        if (wholeSegments < segmentCount) {
            const p0 = points[wholeSegments];
            const p1 = points[wholeSegments + 1];
            if (p0 && p1) {
                const x = p0.x + (p1.x - p0.x) * remainder;
                const y = p0.y + (p1.y - p0.y) * remainder;
                d += ` L ${x} ${y}`;
            }
        }

        return d;
    }

    private getStrokeDrawingWidth(stroke: ManualWriterStroke | undefined): number {
        if (!stroke) return this.options.drawingWidth ?? defaultOptions.drawingWidth;
        return stroke.sourceDrawingWidth ?? this.options.drawingWidth ?? defaultOptions.drawingWidth;
    }

    private scaleStrokeToCurrentSvg(stroke: ManualWriterStroke): ManualWriterStroke {
        const targetWidth = this.getSvgWidth();
        const targetHeight = this.getSvgHeight();
        const sourceWidth = stroke.sourceWidth && stroke.sourceWidth > 0
            ? stroke.sourceWidth
            : targetWidth;
        const sourceHeight = stroke.sourceHeight && stroke.sourceHeight > 0
            ? stroke.sourceHeight
            : targetHeight;

        if (sourceWidth <= 0 || sourceHeight <= 0 || targetWidth <= 0 || targetHeight <= 0) {
            return stroke;
        }

        const scaleX = targetWidth / sourceWidth;
        const scaleY = targetHeight / sourceHeight;
        const widthScale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2;
        const baseDrawingWidth = stroke.sourceDrawingWidth ?? this.options.drawingWidth ?? defaultOptions.drawingWidth;

        return {
            ...stroke,
            sourceWidth: targetWidth,
            sourceHeight: targetHeight,
            sourceDrawingWidth: baseDrawingWidth * widthScale,
            points: stroke.points.map((point) => ({
                ...point,
                x: point.x * scaleX,
                y: point.y * scaleY,
            })),
        };
    }

    private getStrokeLength(stroke: ManualWriterStroke): number {
        const points = stroke.points;
        if (points.length < 2) return 0;

        let length = 0;
        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const cur = points[i];
            if (!prev || !cur) continue;
            const dx = cur.x - prev.x;
            const dy = cur.y - prev.y;
            length += Math.hypot(dx, dy);
        }

        return length;
    }

    private getStrokePlaybackDuration(stroke: ManualWriterStroke): number {
        const speed = Math.max(0.1, this.options.strokeAnimationSpeed ?? defaultOptions.strokeAnimationSpeed);
        const length = this.getStrokeLength(stroke);
        // Match HanziWriter timing model:
        // duration = (strokeLength + 600) / (3 * speed)
        return Math.max(30, (length + 600) / (3 * speed));
    }

    private async animateStroke(stroke: ManualWriterStroke, signal: AbortSignal): Promise<void> {
        if (stroke.points.length === 0) return;

        const path = this.createPathEl('', this.getStrokeDrawingWidth(stroke));
        this.animationGroup.appendChild(path);

        const duration = this.getStrokePlaybackDuration(stroke);
        const start = performance.now();

        while (!signal.aborted) {
            const now = await this.nextFrame(signal);
            const progress = Math.min(1, (now - start) / duration);
            path.setAttribute('d', this.pointsToPartialPath(stroke.points, progress));
            if (progress >= 1) break;
        }

        path.setAttribute('d', this.pointsToPath(stroke.points));
    }

    private nextFrame(signal: AbortSignal): Promise<number> {
        return new Promise((resolve, reject) => {
            if (signal.aborted) {
                reject(new Error('ManualWriter animation aborted'));
                return;
            }

            const frameId = requestAnimationFrame((timestamp) => {
                signal.removeEventListener('abort', onAbort);
                resolve(timestamp);
            });

            const onAbort = () => {
                cancelAnimationFrame(frameId);
                signal.removeEventListener('abort', onAbort);
                reject(new Error('ManualWriter animation aborted'));
            };

            signal.addEventListener('abort', onAbort, { once: true });
        });
    }

    private delay(ms: number, signal: AbortSignal): Promise<void> {
        return new Promise((resolve, reject) => {
            if (signal.aborted) {
                reject(new Error('ManualWriter animation aborted'));
                return;
            }

            const timeoutId = window.setTimeout(() => {
                signal.removeEventListener('abort', onAbort);
                resolve();
            }, ms);

            const onAbort = () => {
                clearTimeout(timeoutId);
                signal.removeEventListener('abort', onAbort);
                reject(new Error('ManualWriter animation aborted'));
            };

            signal.addEventListener('abort', onAbort, { once: true });
        });
    }
}
