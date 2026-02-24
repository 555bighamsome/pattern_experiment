#!/usr/bin/env python3
"""
25-Pattern Standardized Stimulus Set Generator
==============================================

This script generates publication-quality figures for the 25-Pattern
Standardized Stimulus Set used in the Pattern DSL Experiment.

Colors match the exact experiment display:
- Filled cells: #08306B (deep blue)
- Background: #FFFFFF (white)
- Grid lines: #9ca3af (gray)

Output formats:
- PNG (300 DPI for print, 150 DPI for web)
- SVG (vector, infinitely scalable)
- PDF (vector, for LaTeX/journals)

Author: Pattern DSL Experiment Team
"""

import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np
import os
from pathlib import Path

# ============================================================================
# EXACT EXPERIMENT COLORS (from js/modules/patterns.js)
# ============================================================================
FILL_COLOR = '#08306B'      # Deep blue - filled cells
GRID_COLOR = '#9ca3af'      # Gray - grid lines
BG_COLOR = '#FFFFFF'        # White - background/empty cells
BORDER_COLOR = '#000000'    # Black - outer border

# ============================================================================
# THE 25-PATTERN STANDARDIZED STIMULUS SET
# ============================================================================
PATTERNS = {
    "P01": [  # Cross (十字)
        [0,0,0,0,1,1,0,0,0,0],
        [0,0,0,0,1,1,0,0,0,0],
        [0,0,0,0,1,1,0,0,0,0],
        [0,0,0,0,1,1,0,0,0,0],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [0,0,0,0,1,1,0,0,0,0],
        [0,0,0,0,1,1,0,0,0,0],
        [0,0,0,0,1,1,0,0,0,0],
        [0,0,0,0,1,1,0,0,0,0]
    ],
    "P02": [  # Hollow square (空心正方形)
        [1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,1,1,0,0,0,1],
        [1,0,0,0,1,1,0,0,0,1],
        [1,0,0,0,1,1,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,1,1,0,0,0,1],
        [1,0,0,0,1,1,0,0,0,1],
        [1,0,0,0,1,1,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1]
    ],
    "P03": [  # Four corners (四个角)
        [0,0,0,0,0,0,0,0,0,0],
        [0,1,1,1,0,0,1,1,1,0],
        [0,1,1,1,0,0,1,1,1,0],
        [0,1,1,1,0,0,1,1,1,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,1,1,1,0,0,1,1,1,0],
        [0,1,1,1,0,0,1,1,1,0],
        [0,1,1,1,0,0,1,1,1,0],
        [0,0,0,0,0,0,0,0,0,0]
    ],
    "P04": [  # Rounded hollow square
        [0,1,1,1,1,1,1,1,1,0],
        [1,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,1],
        [0,1,1,1,1,1,1,1,1,0]
    ],
    "P05": [  # Filled X (填充X，中间X形空白)
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,0,0,0,0,0,0,1,1],
        [1,0,1,0,0,0,0,1,0,1],
        [1,0,0,1,0,0,1,0,0,1],
        [1,0,0,0,1,1,0,0,0,1],
        [1,0,0,0,1,1,0,0,0,1],
        [1,0,0,1,0,0,1,0,0,1],
        [1,0,1,0,0,0,0,1,0,1],
        [1,1,0,0,0,0,0,0,1,1],
        [1,1,1,1,1,1,1,1,1,1]
    ],
    "P06": [  # Inverted Pattern 5
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,1,1,1,1,1,1,0,0],
        [0,1,0,1,1,1,1,0,1,0],
        [0,1,1,0,1,1,0,1,1,0],
        [0,1,1,1,0,0,1,1,1,0],
        [0,1,1,1,0,0,1,1,1,0],
        [0,1,1,0,1,1,0,1,1,0],
        [0,1,0,1,1,1,1,0,1,0],
        [0,0,1,1,1,1,1,1,0,0],
        [0,0,0,0,0,0,0,0,0,0]
    ],
    "P07": [  # Cross + X diagonal
        [1,0,0,0,1,1,0,0,0,1],
        [0,1,0,0,1,1,0,0,1,0],
        [0,0,1,0,1,1,0,1,0,0],
        [0,0,0,1,1,1,1,0,0,0],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [0,0,0,1,1,1,1,0,0,0],
        [0,0,1,0,1,1,0,1,0,0],
        [0,1,0,0,1,1,0,0,1,0],
        [1,0,0,0,1,1,0,0,0,1]
    ],
    "P08": [  # Center small square (中心小正方形)
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,1,1,0,0,0,0],
        [0,0,0,0,1,1,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0]
    ],
    "P09": [  # Square with border and center (带边框和中心)
        [1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,1,1,0,0,0,1],
        [1,0,0,0,1,1,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1]
    ],
    "P10": [  # Filled square with center hole
        [0,0,0,0,0,0,0,0,0,0],
        [0,1,1,1,1,1,1,1,1,0],
        [0,1,1,1,1,1,1,1,1,0],
        [0,1,1,1,1,1,1,1,1,0],
        [0,1,1,1,0,0,1,1,1,0],
        [0,1,1,1,0,0,1,1,1,0],
        [0,1,1,1,1,1,1,1,1,0],
        [0,1,1,1,1,1,1,1,1,0],
        [0,1,1,1,1,1,1,1,1,0],
        [0,0,0,0,0,0,0,0,0,0]
    ],
    "P11": [  # Inverted cross pattern
        [1,1,1,1,0,0,1,1,1,1],
        [1,1,1,1,0,0,1,1,1,1],
        [1,1,1,1,0,0,1,1,1,1],
        [1,1,1,1,0,0,1,1,1,1],
        [0,0,0,0,1,1,0,0,0,0],
        [0,0,0,0,1,1,0,0,0,0],
        [1,1,1,1,0,0,1,1,1,1],
        [1,1,1,1,0,0,1,1,1,1],
        [1,1,1,1,0,0,1,1,1,1],
        [1,1,1,1,0,0,1,1,1,1]
    ],
    "P12": [  # Checkerboard cross (棋盘十字)
        [1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,1,1,0,0,0,1],
        [1,0,0,0,1,1,0,0,0,1],
        [1,0,0,0,1,1,0,0,0,1],
        [1,1,1,1,0,0,1,1,1,1],
        [1,1,1,1,0,0,1,1,1,1],
        [1,0,0,0,1,1,0,0,0,1],
        [1,0,0,0,1,1,0,0,0,1],
        [1,0,0,0,1,1,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1]
    ],
    "P13": [  # X with center gap
        [1,0,0,0,0,0,0,0,0,1],
        [0,1,0,0,0,0,0,0,1,0],
        [0,0,1,0,0,0,0,1,0,0],
        [0,0,0,1,0,0,1,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,1,0,0,1,0,0,0],
        [0,0,1,0,0,0,0,1,0,0],
        [0,1,0,0,0,0,0,0,1,0],
        [1,0,0,0,0,0,0,0,0,1]
    ],
    "P14": [  # Combined cross and X with center hole
        [1,0,0,0,1,1,0,0,0,1],
        [0,1,0,0,1,1,0,0,1,0],
        [0,0,1,0,1,1,0,1,0,0],
        [0,0,0,1,1,1,1,0,0,0],
        [1,1,1,1,0,0,1,1,1,1],
        [1,1,1,1,0,0,1,1,1,1],
        [0,0,0,1,1,1,1,0,0,0],
        [0,0,1,0,1,1,0,1,0,0],
        [0,1,0,0,1,1,0,0,1,0],
        [1,0,0,0,1,1,0,0,0,1]
    ],
    "P15": [  # Triangle pointing up
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,1,1,0,0,0,0],
        [0,0,0,1,1,1,1,0,0,0],
        [0,0,1,1,1,1,1,1,0,0],
        [0,1,1,1,1,1,1,1,1,0],
        [0,0,0,0,0,0,0,0,0,0]
    ],
    "P16": [  # Triangle with center column
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,1,1,0,0,0,0],
        [0,0,0,0,1,1,0,0,0,0],
        [0,0,0,1,1,1,1,0,0,0],
        [0,0,1,1,1,1,1,1,0,0],
        [0,1,1,1,1,1,1,1,1,0],
        [0,0,0,0,0,0,0,0,0,0]
    ],
    "P17": [  # Arrow/chevron shape
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,1,0,0,0,0,0,0,1,0],
        [0,1,1,0,0,0,0,1,1,0],
        [0,1,1,1,0,0,1,1,1,0],
        [0,1,1,1,0,0,1,1,1,0],
        [0,1,1,1,1,1,1,1,1,0],
        [0,1,1,1,1,1,1,1,1,0],
        [0,1,1,1,1,1,1,1,1,0],
        [0,0,0,0,0,0,0,0,0,0]
    ],
    "P18": [  # Hourglass/bowtie
        [0,0,0,0,0,0,0,0,0,0],
        [0,1,1,1,1,1,1,1,1,0],
        [0,0,1,1,1,1,1,1,0,0],
        [0,0,0,1,1,1,1,0,0,0],
        [0,0,0,0,1,1,0,0,0,0],
        [0,0,0,0,1,1,0,0,0,0],
        [0,0,0,1,1,1,1,0,0,0],
        [0,0,1,1,1,1,1,1,0,0],
        [0,1,1,1,1,1,1,1,1,0],
        [0,0,0,0,0,0,0,0,0,0]
    ],
    "P19": [  # Inverted hourglass in frame
        [1,1,1,1,1,1,1,1,1,1],
        [1,0,1,1,1,1,1,1,0,1],
        [1,0,0,1,1,1,1,0,0,1],
        [1,0,0,0,1,1,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,1,1,0,0,0,1],
        [1,0,0,1,1,1,1,0,0,1],
        [1,0,1,1,1,1,1,1,0,1],
        [1,1,1,1,1,1,1,1,1,1]
    ],
    "P20": [  # Keyhole shape
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,0,0,0,0,0,0,1,1],
        [1,1,1,0,0,0,0,1,1,1],
        [1,1,1,1,0,0,1,1,1,1],
        [1,1,1,1,0,0,1,1,1,1],
        [1,1,1,1,0,0,1,1,1,1],
        [1,1,1,1,0,0,1,1,1,1],
        [1,1,1,0,0,0,0,1,1,1],
        [1,1,0,0,0,0,0,0,1,1],
        [1,1,1,1,1,1,1,1,1,1]
    ],
    "P21": [  # Flower (花朵图案)
        [0,0,0,0,0,0,0,0,0,0],
        [0,1,1,1,0,0,1,1,1,0],
        [0,0,1,1,0,0,1,1,0,0],
        [0,0,0,1,0,0,1,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,1,0,0,1,0,0,0],
        [0,0,1,1,0,0,1,1,0,0],
        [0,1,1,1,0,0,1,1,1,0],
        [0,0,0,0,0,0,0,0,0,0]
    ],
    "P22": [  # Flower2 (连接的花朵)
        [0,0,0,0,0,0,0,0,0,0],
        [0,1,1,1,0,0,1,1,1,0],
        [0,0,1,1,0,0,1,1,0,0],
        [0,0,0,1,0,0,1,0,0,0],
        [0,0,0,0,1,1,0,0,0,0],
        [0,0,0,0,1,1,0,0,0,0],
        [0,0,0,1,0,0,1,0,0,0],
        [0,0,1,1,0,0,1,1,0,0],
        [0,1,1,1,0,0,1,1,1,0],
        [0,0,0,0,0,0,0,0,0,0]
    ],
    "P23": [  # Flower 3 (小花朵)
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,1,1,0,0,1,1,0,0],
        [0,1,0,1,0,0,1,0,1,0],
        [0,1,1,0,0,0,0,1,1,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,1,1,0,0,0,0,1,1,0],
        [0,1,0,1,0,0,1,0,1,0],
        [0,0,1,1,0,0,1,1,0,0],
        [0,0,0,0,0,0,0,0,0,0]
    ],
    "P24": [  # Composite Flower (组合花朵)
        [1,0,0,0,0,0,0,0,0,1],
        [0,0,1,1,0,0,1,1,0,0],
        [0,1,0,1,0,0,1,0,1,0],
        [0,1,1,0,0,0,0,1,1,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,1,1,0,0,0,0,1,1,0],
        [0,1,0,1,0,0,1,0,1,0],
        [0,0,1,1,0,0,1,1,0,0],
        [1,0,0,0,0,0,0,0,0,1]
    ],
    "P25": [  # Flower 5 (复杂花朵)
        [1,0,0,0,0,0,0,0,0,1],
        [0,0,1,1,0,0,1,1,0,0],
        [0,1,0,1,0,0,1,0,1,0],
        [0,1,1,0,0,0,0,1,1,0],
        [0,0,0,0,1,1,0,0,0,0],
        [0,0,0,0,1,1,0,0,0,0],
        [0,1,1,0,0,0,0,1,1,0],
        [0,1,0,1,0,0,1,0,1,0],
        [0,0,1,1,0,0,1,1,0,0],
        [1,0,0,0,0,0,0,0,0,1]
    ],
}

# Pattern names for documentation
PATTERN_NAMES = {
    "P01": "Cross (十字)",
    "P02": "Hollow Square (空心正方形)",
    "P03": "Four Corners (四个角)",
    "P04": "Rounded Hollow Square",
    "P05": "Filled X (填充X)",
    "P06": "Inverted X",
    "P07": "Cross + X Diagonal",
    "P08": "Center Small Square (中心小正方形)",
    "P09": "Square with Border and Center",
    "P10": "Filled Square with Center Hole",
    "P11": "Inverted Cross Pattern",
    "P12": "Checkerboard Cross (棋盘十字)",
    "P13": "X with Center Gap",
    "P14": "Combined Cross and X",
    "P15": "Triangle Pointing Up",
    "P16": "Triangle with Center Column",
    "P17": "Arrow/Chevron Shape",
    "P18": "Hourglass/Bowtie",
    "P19": "Inverted Hourglass in Frame",
    "P20": "Keyhole Shape",
    "P21": "Flower (花朵图案)",
    "P22": "Connected Flower (连接的花朵)",
    "P23": "Small Flower (小花朵)",
    "P24": "Composite Flower (组合花朵)",
    "P25": "Complex Flower (复杂花朵)",
}


def render_pattern(pattern, ax, show_grid=True, cell_size=1.0):
    """
    Render a single 10x10 pattern onto a matplotlib axes.
    
    Parameters:
    -----------
    pattern : list of list of int
        10x10 binary matrix (0 or 1)
    ax : matplotlib.axes.Axes
        The axes to draw on
    show_grid : bool
        Whether to show grid lines
    cell_size : float
        Size of each cell in data units
    """
    n = len(pattern)
    
    # Set background
    ax.set_facecolor(BG_COLOR)
    
    # Draw cells
    for i in range(n):
        for j in range(n):
            if pattern[i][j] == 1:
                rect = patches.Rectangle(
                    (j * cell_size, (n - 1 - i) * cell_size),
                    cell_size, cell_size,
                    linewidth=0,
                    facecolor=FILL_COLOR,
                    edgecolor='none'
                )
                ax.add_patch(rect)
    
    # Draw grid
    if show_grid:
        for i in range(n + 1):
            ax.axhline(y=i * cell_size, color=GRID_COLOR, linewidth=0.5)
            ax.axvline(x=i * cell_size, color=GRID_COLOR, linewidth=0.5)
    
    # Draw border
    border = patches.Rectangle(
        (0, 0), n * cell_size, n * cell_size,
        linewidth=2,
        edgecolor=BORDER_COLOR,
        facecolor='none'
    )
    ax.add_patch(border)
    
    # Set limits and aspect
    ax.set_xlim(0, n * cell_size)
    ax.set_ylim(0, n * cell_size)
    ax.set_aspect('equal')
    ax.axis('off')


def generate_single_figure(pattern_id, pattern, output_dir, dpi=300, 
                           figsize=(4, 4), show_grid=True, formats=['png', 'svg', 'pdf']):
    """
    Generate publication-quality figure for a single pattern.
    
    Parameters:
    -----------
    pattern_id : str
        Pattern identifier (e.g., "P01")
    pattern : list of list of int
        10x10 binary matrix
    output_dir : Path
        Output directory
    dpi : int
        DPI for raster formats
    figsize : tuple
        Figure size in inches
    show_grid : bool
        Whether to show grid lines
    formats : list
        Output formats to generate
    """
    fig, ax = plt.subplots(1, 1, figsize=figsize)
    render_pattern(pattern, ax, show_grid=show_grid)
    
    # Tight layout
    plt.tight_layout(pad=0.1)
    
    for fmt in formats:
        filepath = output_dir / f"{pattern_id}.{fmt}"
        fig.savefig(filepath, dpi=dpi, bbox_inches='tight', 
                    facecolor='white', edgecolor='none',
                    transparent=False if fmt == 'png' else True)
        print(f"  ✓ Saved: {filepath}")
    
    plt.close(fig)


def generate_overview_figure(patterns, output_dir, dpi=300, show_grid=True):
    """
    Generate a single overview figure showing all 25 patterns in a 5x5 grid.
    
    Parameters:
    -----------
    patterns : dict
        Dictionary of pattern_id -> pattern matrix
    output_dir : Path
        Output directory
    dpi : int
        DPI for raster formats
    show_grid : bool
        Whether to show grid lines in individual patterns
    """
    fig, axes = plt.subplots(5, 5, figsize=(15, 15))
    fig.patch.set_facecolor('white')
    
    pattern_ids = sorted(patterns.keys())
    
    for idx, pattern_id in enumerate(pattern_ids):
        row = idx // 5
        col = idx % 5
        ax = axes[row, col]
        
        render_pattern(patterns[pattern_id], ax, show_grid=show_grid)
        ax.set_title(pattern_id, fontsize=12, fontweight='bold', pad=5)
    
    plt.tight_layout(pad=1.0)
    
    # Save in multiple formats
    for fmt in ['png', 'svg', 'pdf']:
        filepath = output_dir / f"25_Pattern_Stimulus_Set_Overview.{fmt}"
        fig.savefig(filepath, dpi=dpi, bbox_inches='tight',
                    facecolor='white', edgecolor='none')
        print(f"  ✓ Saved: {filepath}")
    
    plt.close(fig)


def main():
    """Main entry point for generating the stimulus set figures."""
    
    print("=" * 60)
    print("25-Pattern Standardized Stimulus Set Generator")
    print("=" * 60)
    print()
    
    # Create output directories
    base_dir = Path(__file__).parent
    
    # Individual figures directory (high-res for publication)
    individual_dir = base_dir / "individual_figures"
    individual_dir.mkdir(exist_ok=True)
    
    # Web-resolution directory
    web_dir = base_dir / "web_figures"
    web_dir.mkdir(exist_ok=True)
    
    # Overview directory
    overview_dir = base_dir / "overview"
    overview_dir.mkdir(exist_ok=True)
    
    print(f"Output directories:")
    print(f"  - Individual figures: {individual_dir}")
    print(f"  - Web figures: {web_dir}")
    print(f"  - Overview: {overview_dir}")
    print()
    
    # Generate individual figures (publication quality, 300 DPI)
    print("Generating individual figures (300 DPI, publication quality)...")
    for pattern_id in sorted(PATTERNS.keys()):
        print(f"  Processing {pattern_id}...")
        generate_single_figure(
            pattern_id, PATTERNS[pattern_id], individual_dir,
            dpi=300, figsize=(4, 4), show_grid=True,
            formats=['png', 'svg', 'pdf']
        )
    print()
    
    # Generate web figures (150 DPI)
    print("Generating web figures (150 DPI)...")
    for pattern_id in sorted(PATTERNS.keys()):
        print(f"  Processing {pattern_id}...")
        generate_single_figure(
            pattern_id, PATTERNS[pattern_id], web_dir,
            dpi=150, figsize=(3, 3), show_grid=True,
            formats=['png']
        )
    print()
    
    # Generate overview figure
    print("Generating overview figure (5x5 grid)...")
    generate_overview_figure(PATTERNS, overview_dir, dpi=300, show_grid=True)
    print()
    
    print("=" * 60)
    print("Generation complete!")
    print(f"  - {len(PATTERNS)} individual patterns generated")
    print(f"  - Formats: PNG (300 DPI), SVG, PDF")
    print(f"  - Colors: Fill={FILL_COLOR}, Grid={GRID_COLOR}")
    print("=" * 60)


if __name__ == "__main__":
    main()
