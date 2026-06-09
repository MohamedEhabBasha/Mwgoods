import {
  Component,
  ElementRef,
  viewChild,
  AfterViewInit,
  OnDestroy,
  input,
  effect,
} from '@angular/core';
import { Application, Graphics, Sprite, Assets, Text, TextStyle } from 'pixi.js';

@Component({
  selector: 'app-pixi-web',
  imports: [],
  templateUrl: './pixi-web.html',
  styleUrl: './pixi-web.css',
})
export class PixiWeb implements AfterViewInit, OnDestroy {
  public gridCanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('gridCanvas');

  public squareSize = input<number>(80);
  public thickness = input<number>(0.8);
  public gridColor = input<string>('#e4e4e7'); // Accepts hex string like '#E4E4E7'
  public backgroundColor = input<string>('transparent');

  private pixiApp!: Application;
  private gridGraphics!: Graphics;

  // Structural Engine Trackers
  private dynamicGraphics!: Graphics;
  private activeCellFlashInterval!: any;

  // Add these configuration arrays to your class properties
  public dynamicPhrases = ['EXPAND', 'DISCOVER', 'SHARE', 'COMMUNICATE', 'LAUNCH', 'CONNECT'];
  public sampleImages = ['home\\3d-sofa.png', 'home\\3d bear.png'];

  constructor() {
    // Redraw the grid automatically if any configuration input changes dynamically
    effect(() => {
      this.squareSize();
      this.thickness();
      this.gridColor();
      if (this.pixiApp && this.gridGraphics) {
        this.drawGridNet();
      }
    });
  }

  async ngAfterViewInit() {
    await this.initPixiGrid();

    this.initGridInteractions();

    // Wire up resize handler so grid updates perfectly on window adjustments
    window.addEventListener('resize', this.onResize);
  }

  private async initPixiGrid() {
    const canvasElement = this.gridCanvas().nativeElement;

    // 1. Initialize Pixi Application targeting the existing HTML canvas element
    this.pixiApp = new Application();
    await this.pixiApp.init({
      canvas: canvasElement,
      resizeTo: canvasElement.parentElement || window, // Automatically matches container boundaries
      backgroundAlpha: 0, // Keeps background transparent so parent CSS controls context
      antialias: true,
    });

    // 2. Instantiate a single persistent Graphics instance for low overhead drawing
    this.gridGraphics = new Graphics();
    this.pixiApp.stage.addChild(this.gridGraphics);

    // 3. Render the initial grid line framework
    this.drawGridNet();
  }

  /**
   * Procedural vector rendering engine loops based on viewport and cell sizing
   */
  private drawGridNet() {
    const width = this.pixiApp.screen.width;
    const height = this.pixiApp.screen.height;

    // Clear previous drawing states to prevent performance leaks/clipping
    this.gridGraphics.clear();

    // 💡 Convert string hex to numbers dynamically during the redraw execution loop
    const cleanHex = this.gridColor().replace('#', '0x');
    const numericColor = parseInt(cleanHex, 16);

    this.gridGraphics.setStrokeStyle({
      width: this.thickness(),
      color: isNaN(numericColor) ? 0xe4e4e7 : numericColor,
    });

    // Draw Vertical Lines
    for (let x = 0; x <= width; x += this.squareSize()) {
      this.gridGraphics.moveTo(x, 0);
      this.gridGraphics.lineTo(x, height);
    }

    // Draw Horizontal Lines
    for (let y = 0; y <= height; y += this.squareSize()) {
      this.gridGraphics.moveTo(0, y);
      this.gridGraphics.lineTo(width, y);
    }

    // Command Pixi to flush the drawing states straight into the GPU canvas context
    this.gridGraphics.stroke();
  }
  private initGridInteractions() {
    this.dynamicGraphics = new Graphics();
    this.pixiApp.stage.addChild(this.dynamicGraphics);

    let wordsRenderedCount = 0;
    const maxWords = 11;

    const width = this.pixiApp.screen.width;
    const height = this.pixiApp.screen.height;
    const cellSize = this.squareSize();

    // 1. Get total number of cells in the grid
    const totalCols = Math.floor(width / cellSize);
    const totalRows = Math.floor(height / cellSize);

    // 2. Find the exact center cell indices (using Math.floor to get a clean integer)
    const centerCol = Math.floor(totalCols / 2);
    const centerRow = Math.floor(totalRows / 2);

    // ==========================================
    // PRE-CALCULATED STRUCTURAL GRID NODES
    // ==========================================
    // Instead of random numbers, we define 10 precise architectural anchor points.
    // Format: { colOffset, rowOffset, isVertical }
    // colOffset/rowOffset represent multipliers of your 80px cell size.
    const structuralNodes = [
      { col: centerCol - 3, row: centerRow - 1, isVertical: false },

      { col: centerCol - 2, row: centerRow - 1, isVertical: true },

      { col: centerCol + 2, row: centerRow - 1, isVertical: true },

      { col: centerCol + 2, row: centerRow + 2, isVertical: true },

      { col: centerCol - 1, row: centerRow - 0, isVertical: false },

      { col: centerCol + 4, row: centerRow - 1, isVertical: true },

      { col: centerCol + 3, row: centerRow - 0, isVertical: false },

      { col: centerCol - 2, row: centerRow + 1, isVertical: false },

      { col: centerCol - 1, row: centerRow + 2, isVertical: false },

      { col: centerCol + 2, row: centerRow - 0, isVertical: true },

      { col: centerCol + 3, row: centerRow + 1, isVertical: false },
    ];

    this.activeCellFlashInterval = setInterval(async () => {
      if (wordsRenderedCount >= maxWords) {
        clearInterval(this.activeCellFlashInterval);
        return;
      }

      // Look up our precise structural node coordinate token for this iteration step
      const currentNode = structuralNodes[wordsRenderedCount];

      // Convert the blueprint column/row indices straight to absolute viewport pixels
      const startX = currentNode.col * cellSize;
      const startY = currentNode.row * cellSize;

      // Ensure the node doesn't accidentally attempt to draw completely off a small browser screen
      if (startX > width - 100 || startY > height - 50) {
        wordsRenderedCount++; // Skip to next slot safely without hanging
        return;
      }

      // ==========================================
      // RENDER INTENTIONAL TYPOGRAPHY NODE
      // ==========================================
      const randomPhrase =
        this.dynamicPhrases[Math.floor(Math.random() * this.dynamicPhrases.length)];

      const fontStyle = new TextStyle({
        fontFamily: 'Open Sans, sans-serif',
        fontSize: 12,
        fontWeight: '900',
        fill: 0x1c1c1e, // Charcoal black alignment text
        letterSpacing: 4,
      });

      const textNode = new Text({ text: randomPhrase, style: fontStyle });

      if (currentNode.isVertical) {
        textNode.x = startX + this.thickness() * 10;
        textNode.y = startY;
        textNode.rotation = Math.PI / 2; // Exact 90-degree typographic line turn
      } else {
        textNode.x = startX;
        textNode.y = startY - 16; // Rest cleanly right above the grid baseline rule
      }

      this.dynamicGraphics.addChild(textNode);
      wordsRenderedCount++;
    }, 100);
  }

  /**
   * Safe arrow function preserves instance binding contexts during browser resize ticks
   */
  private onResize = () => {
    if (this.pixiApp && this.gridGraphics) {
      this.drawGridNet();
    }
  };

  /**
   * Prevent memory leaks when components route away or are destroyed
   */
  ngOnDestroy() {
    window.removeEventListener('resize', this.onResize);
    if (this.pixiApp) {
      this.pixiApp.destroy(true, { children: true, texture: true });
    }
  }
}
