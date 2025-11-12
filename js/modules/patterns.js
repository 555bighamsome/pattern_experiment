import { SIZE, CELL_SIZE } from './state.js';

const geomDSL = {
    blank: () => Array(SIZE).fill(0).map(() => Array(SIZE).fill(0)),
    line_horizontal: (row = Math.floor(SIZE / 2)) => {
        const pattern = geomDSL.blank();
        pattern[row].fill(1);
        return pattern;
    },
    line_vertical: (col = Math.floor(SIZE / 2)) => {
        const pattern = geomDSL.blank();
        for (let i = 0; i < SIZE; i++) pattern[i][col] = 1;
        return pattern;
    },
    diagonal: () => {
        const pattern = geomDSL.blank();
        for (let i = 0; i < SIZE; i++) pattern[i][i] = 1;
        return pattern;
    },
    square: () => {
        const pattern = geomDSL.blank();
        for (let i = 0; i < SIZE; i++) {
            pattern[0][i] = pattern[SIZE - 1][i] = 1;
            pattern[i][0] = pattern[i][SIZE - 1] = 1;
        }
        return pattern;
    },
    triangle: () => {
        const pattern = geomDSL.blank();
        for (let i = 0; i < SIZE; i++) {
            for (let j = 0; j <= i; j++) {
                pattern[i][j] = 1;
            }
        }
        return pattern;
    }
};

const transDSL = {
    subtract: (a, b) => a.map((row, i) => row.map((val, j) => (val && !b[i][j] ? 1 : 0))),
    add: (a, b) => a.map((row, i) => row.map((val, j) => (val || b[i][j] ? 1 : 0))),
    union: (a, b) => a.map((row, i) => row.map((val, j) => (val && b[i][j] ? 1 : 0))),
    invert: (a) => a.map((row) => row.map((val) => (val ? 0 : 1))),
    reflect_horizontal: (a) => [...a].reverse(),
    reflect_vertical: (a) => a.map((row) => [...row].reverse()),
    reflect_diag: (a) => a[0].map((_, i) => a.map((row) => row[i]))
};

const OP_ABBREVIATIONS = {
    subtract: 'sub',
    reflect_horizontal: 'refl_h',
    reflect_vertical: 'refl_v',
    reflect_diag: 'refl_d',
    line_horizontal: 'line_h',
    line_vertical: 'line_v',
    diagonal: 'diag',
    triangle: 'tri'
};

function getOperationAbbreviation(name) {
    if (!name) return '';
    const trimmed = name.trim();
    return OP_ABBREVIATIONS[trimmed] || trimmed;
}

function formatOperationText(op) {
    if (!op) return '';
    const trimmed = op.trim();
    const match = trimmed.match(/^(.*?)(\(.*\))?$/);
    if (!match) return trimmed;
    const base = match[1];
    const suffix = match[2] || '';
    return `${getOperationAbbreviation(base)}${suffix}`;
}

function renderPattern(pattern, containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const width = SIZE * CELL_SIZE;
    const height = SIZE * CELL_SIZE;
    const borderWidth = 3;

    svg.setAttribute('width', width + borderWidth * 2);
    svg.setAttribute('height', height + borderWidth * 2);
    svg.setAttribute('viewBox', `0 0 ${width + borderWidth * 2} ${height + borderWidth * 2}`);

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${borderWidth}, ${borderWidth})`);

    for (let i = 0; i <= SIZE; i++) {
        const vline = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        vline.setAttribute('x1', i * CELL_SIZE);
        vline.setAttribute('y1', 0);
        vline.setAttribute('x2', i * CELL_SIZE);
        vline.setAttribute('y2', height);
        vline.setAttribute('stroke', '#9ca3af');
        vline.setAttribute('stroke-width', '1');
        g.appendChild(vline);

        const hline = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        hline.setAttribute('x1', 0);
        hline.setAttribute('y1', i * CELL_SIZE);
        hline.setAttribute('x2', width);
        hline.setAttribute('y2', i * CELL_SIZE);
        hline.setAttribute('stroke', '#9ca3af');
        hline.setAttribute('stroke-width', '1');
        g.appendChild(hline);
    }

    const diffMode = options.diffMode || null;
    const basePattern = options.basePattern || null;

    const palette = {
        add: {
            base: '#265dff',
            newCell: '#22c55e',
            ghost: 'rgba(37, 99, 235, 0.18)'
        },
        subtract: {
            base: '#312e81',
            removed: '#f97316',
            newCell: '#22d3ee',
            ghost: 'rgba(249, 115, 22, 0.2)'
        },
        union: {
            overlap: '#9333ea',
            onlyBase: '#3b82f6',
            onlyOther: '#facc15',
            ghost: 'rgba(148, 163, 184, 0.2)'
        }
    };

    pattern.forEach((row, i) => {
        row.forEach((cell, j) => {
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', j * CELL_SIZE);
            rect.setAttribute('y', i * CELL_SIZE);
            rect.setAttribute('width', CELL_SIZE);
            rect.setAttribute('height', CELL_SIZE);
            rect.setAttribute('stroke', '#9ca3af');
            rect.setAttribute('stroke-width', '1');

            if (diffMode && basePattern) {
                const baseVal = basePattern[i]?.[j] || 0;
                if (diffMode === 'add') {
                    if (cell && baseVal) {
                        rect.setAttribute('fill', palette.add.base);
                        rect.setAttribute('fill-opacity', '0.75');
                    } else if (cell && !baseVal) {
                        rect.setAttribute('fill', palette.add.newCell);
                        rect.setAttribute('fill-opacity', '0.88');
                    } else if (!cell && baseVal) {
                        rect.setAttribute('fill', palette.add.ghost);
                    } else {
                        rect.setAttribute('fill', 'transparent');
                    }
                } else if (diffMode === 'subtract') {
                    if (baseVal && !cell) {
                        rect.setAttribute('fill', palette.subtract.removed);
                        rect.setAttribute('fill-opacity', '0.75');
                    } else if (cell && baseVal) {
                        rect.setAttribute('fill', palette.subtract.base);
                        rect.setAttribute('fill-opacity', '0.68');
                    } else if (cell && !baseVal) {
                        rect.setAttribute('fill', palette.subtract.newCell);
                        rect.setAttribute('fill-opacity', '0.88');
                    } else if (!cell && baseVal) {
                        rect.setAttribute('fill', palette.subtract.ghost);
                    } else {
                        rect.setAttribute('fill', 'transparent');
                    }
                } else if (diffMode === 'union') {
                    if (cell && baseVal) {
                        rect.setAttribute('fill', palette.union.overlap);
                        rect.setAttribute('fill-opacity', '0.85');
                    } else if (cell && !baseVal) {
                        rect.setAttribute('fill', palette.union.onlyOther);
                        rect.setAttribute('fill-opacity', '0.95');
                    } else if (!cell && baseVal) {
                        rect.setAttribute('fill', palette.union.onlyBase);
                        rect.setAttribute('fill-opacity', '0.82');
                    } else {
                        rect.setAttribute('fill', palette.union.ghost);
                    }
                }
            } else {
                if (cell) {
                    rect.setAttribute('fill', '#08306B');
                } else {
                    rect.setAttribute('fill', 'transparent');
                }
            }

            if (cell || (diffMode && basePattern && basePattern[i]?.[j])) {
                g.appendChild(rect);
            }
        });
    });

    svg.appendChild(g);

    const border = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    border.setAttribute('x', borderWidth / 2);
    border.setAttribute('y', borderWidth / 2);
    border.setAttribute('width', width + borderWidth);
    border.setAttribute('height', height + borderWidth);
    border.setAttribute('fill', 'none');
    border.setAttribute('stroke', '#000');
    border.setAttribute('stroke-width', borderWidth);
    svg.appendChild(border);

    container.appendChild(svg);
}

function renderThumbnail(pattern, scale = 6) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', SIZE * scale);
    svg.setAttribute('height', SIZE * scale);
    svg.setAttribute('viewBox', `0 0 ${SIZE} ${SIZE}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.style.display = 'block';

    const gridStroke = Math.max(0.04, (scale / 6) * 0.08);
    for (let i = 0; i <= SIZE; i++) {
        const vline = document.createElementNS(svgNS, 'line');
        vline.setAttribute('x1', i);
        vline.setAttribute('y1', 0);
        vline.setAttribute('x2', i);
        vline.setAttribute('y2', SIZE);
        vline.setAttribute('stroke', '#e5e7eb');
        vline.setAttribute('stroke-width', gridStroke);
        vline.setAttribute('shape-rendering', 'crispEdges');
        svg.appendChild(vline);

        const hline = document.createElementNS(svgNS, 'line');
        hline.setAttribute('x1', 0);
        hline.setAttribute('y1', i);
        hline.setAttribute('x2', SIZE);
        hline.setAttribute('y2', i);
        hline.setAttribute('stroke', '#e5e7eb');
        hline.setAttribute('stroke-width', gridStroke);
        hline.setAttribute('shape-rendering', 'crispEdges');
        svg.appendChild(hline);
    }

    pattern.forEach((row, i) => {
        row.forEach((cell, j) => {
            if (cell) {
                const rect = document.createElementNS(svgNS, 'rect');
                rect.setAttribute('x', j);
                rect.setAttribute('y', i);
                rect.setAttribute('width', 1);
                rect.setAttribute('height', 1);
                rect.setAttribute('fill', '#08306B');
                rect.setAttribute('shape-rendering', 'crispEdges');
                svg.appendChild(rect);
            }
        });
    });

    return svg;
}

function renderPrimitiveIcon(pattern, scale = 3.5) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', SIZE * scale);
    svg.setAttribute('height', SIZE * scale);
    svg.style.display = 'block';

    pattern.forEach((row, i) => {
        row.forEach((cell, j) => {
            if (cell) {
                const rect = document.createElementNS(svgNS, 'rect');
                rect.setAttribute('x', j * scale);
                rect.setAttribute('y', i * scale);
                rect.setAttribute('width', scale);
                rect.setAttribute('height', scale);
                rect.setAttribute('fill', '#08306B');
                svg.appendChild(rect);
            }
        });
    });

    return svg;
}

function initializePrimitiveIcons() {
    const primitiveNames = ['blank', 'line_horizontal', 'line_vertical', 'diagonal', 'square', 'triangle'];
    primitiveNames.forEach((name) => {
        const btn = document.querySelector(`button[data-op="${name}"]`);
        if (!btn) return;
        const iconSpan = btn.querySelector('.btn-icon');
        if (!iconSpan) return;
        iconSpan.innerHTML = '';
        const pattern = geomDSL[name]();
        const icon = renderPrimitiveIcon(pattern);
        iconSpan.appendChild(icon);
    });
}

export {
    geomDSL,
    transDSL,
    OP_ABBREVIATIONS,
    getOperationAbbreviation,
    formatOperationText,
    renderPattern,
    renderThumbnail,
    initializePrimitiveIcons
};
