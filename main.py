#!/usr/bin/env python3
"""
Vector Plot Application - Initial Setup
Uses PySide6 for UI and matplotlib for 2D plotting.
"""

import sys
from pathlib import Path

import numpy as np

from PySide6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QPushButton, QLineEdit, QFormLayout, QTextEdit, QTabWidget
)
from PySide6.QtCore import Qt

import matplotlib
matplotlib.use('QtAgg')
from matplotlib.backends.backend_qtagg import FigureCanvasQTAgg as FigureCanvas
from matplotlib.figure import Figure
from matplotlib.patches import Arc

DEFAULT_THETA_DEG = 20.0
FRAME_X = 0.0
OUTBOARD_X = 3.0
OUTBOARD_Y = 0.0
DESIGN_NOTES_PATH = Path(__file__).with_name("design_notes.md")


class VectorPlotCanvas(FigureCanvas):
    """Matplotlib canvas embedded in PySide6 for plotting vectors."""
    
    def __init__(self, parent=None, width=6, height=5, dpi=100):
        self.fig = Figure(figsize=(width, height), dpi=dpi)
        self.axes = self.fig.add_subplot(111)
        super().__init__(self.fig)
        self.setParent(parent)
        self.plot_right_triangle(DEFAULT_THETA_DEG)

    def plot_right_triangle(self, theta_deg):
        """Illustrate the link meeting the vertical frame reference.

        Theta is the angle between the link and the vertical frame.
        Link length is whatever is required to reach the frame.
        """
        self.axes.clear()

        start = np.array([OUTBOARD_X, OUTBOARD_Y])
        meets_frame = theta_deg > 0
        if meets_frame:
            theta_rad = np.deg2rad(theta_deg)
            rise = (OUTBOARD_X - FRAME_X) / np.tan(theta_rad)
            frame_point = np.array([FRAME_X, OUTBOARD_Y + rise])
        else:
            frame_point = None

        if meets_frame:
            y_top = max(frame_point[1], OUTBOARD_Y) + 1.0
        else:
            y_top = 4.0
        y_bottom = -1.0
        self.axes.set_xlim(-1.6, OUTBOARD_X + 1.0)
        self.axes.set_ylim(y_bottom, y_top)

        self.axes.axvline(
            FRAME_X, color='red', linewidth=2, label='0\u00b0 - Frame reference'
        )
        self.axes.text(
            FRAME_X - 0.12, (y_bottom + y_top) / 2,
            '0\u00b0 - Frame reference',
            rotation=90, va='center', ha='right', color='red', fontsize=9,
        )

        self.axes.axhline(0, color='green', linewidth=2, label='Axle')
        self.axes.text(
            OUTBOARD_X + 0.15, 0.15, 'Axle',
            va='bottom', ha='left', color='green', fontsize=9,
        )

        if meets_frame:
            self.axes.plot(
                [start[0], frame_point[0]], [start[1], frame_point[1]],
                color='purple', linewidth=2, label='Link',
            )
            self.axes.annotate(
                '', xy=frame_point, xytext=start,
                arrowprops=dict(arrowstyle='->', color='purple', lw=2),
            )
            self.axes.plot(start[0], start[1], 'o', color='purple', markersize=5)

            arc_size = min(1.4, 0.28 * max(frame_point[1] - OUTBOARD_Y, 1.0))
            self.axes.add_patch(Arc(
                tuple(frame_point), arc_size, arc_size, angle=0,
                theta1=-90, theta2=theta_deg - 90, color='black', lw=1.2,
            ))
            label_angle = np.deg2rad(-90 + theta_deg / 2)
            label_r = arc_size * 0.85
            self.axes.text(
                frame_point[0] + label_r * np.cos(label_angle),
                frame_point[1] + label_r * np.sin(label_angle),
                f'{theta_deg:g}\u00b0',
                fontsize=9,
            )
        else:
            self.axes.axvline(
                OUTBOARD_X, color='purple', linewidth=2, linestyle='--',
                label='Link (parallel to frame)',
            )
            self.axes.text(
                OUTBOARD_X + 0.15, (y_bottom + y_top) / 2,
                '0\u00b0 link does not meet the frame',
                rotation=90, va='center', ha='left', color='purple', fontsize=9,
            )

        self.axes.set_xlabel('Lateral')
        self.axes.set_ylabel('Longitudinal')
        self.axes.set_title(
            f'Top view  |  theta = {theta_deg:g}\u00b0 from frame'
        )
        self.axes.grid(True, alpha=0.3)
        self.axes.set_aspect('equal', adjustable='box')

        # Keep the key in a fixed figure margin so it cannot cover the geometry,
        # even when a shallow angle makes the axes very narrow.
        self.fig.subplots_adjust(left=0.12, right=0.62, top=0.88, bottom=0.12)
        for old_legend in list(self.fig.legends):
            old_legend.remove()
        self.fig.legend(
            loc='center left',
            bbox_to_anchor=(0.64, 0.5),
            frameon=True,
            fontsize=9,
        )
        self.draw()


class MainWindow(QMainWindow):
    """Main application window."""
    
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Link Force Calculator")
        self.setGeometry(100, 100, 1000, 600)

        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QVBoxLayout(central_widget)

        content_layout = QHBoxLayout()

        # Left half: calculator and design notes
        tabs = QTabWidget()
        tabs.setMaximumWidth(520)

        calculator_tab = QWidget()
        input_layout = QVBoxLayout(calculator_tab)
        input_layout.setContentsMargins(12, 16, 12, 12)
        input_layout.setSpacing(12)

        form_layout = QFormLayout()
        form_layout.setLabelAlignment(Qt.AlignRight)
        form_layout.setSpacing(12)

        self.theta_input = QLineEdit(f'{DEFAULT_THETA_DEG:g}')
        self.theta_input.setPlaceholderText("degrees from frame, top view")
        self.force_input = QLineEdit()
        self.force_input.setPlaceholderText("Force (Unitless)")

        form_layout.addRow("Theta", self.theta_input)
        form_layout.addRow("Force (Lateral)", self.force_input)

        self.btn_update = QPushButton("Update")
        self.btn_update.clicked.connect(self.update_plot)
        form_layout.addRow(self.btn_update)
        input_layout.addLayout(form_layout)

        self.results_display = QTextEdit()
        self.results_display.setReadOnly(True)
        self.results_display.setPlaceholderText("Results appear here after Update")
        self.results_display.setStyleSheet("font-size: 16px;")
        input_layout.addWidget(self.results_display)

        design_tab = QWidget()
        design_layout = QVBoxLayout(design_tab)
        design_layout.setContentsMargins(12, 12, 12, 12)
        design_notes = QTextEdit()
        design_notes.setReadOnly(True)
        design_notes.setMarkdown(self._load_design_notes())
        design_layout.addWidget(design_notes)

        tabs.addTab(calculator_tab, "Calculator")
        tabs.addTab(design_tab, "Design")
        content_layout.addWidget(tabs, stretch=1)

        # Right half: plot
        self.plot_canvas = VectorPlotCanvas(self, width=6, height=5)
        content_layout.addWidget(self.plot_canvas, stretch=1)

        main_layout.addLayout(content_layout)

    def _load_design_notes(self):
        """Read the Design tab copy from design_notes.md."""
        try:
            return DESIGN_NOTES_PATH.read_text(encoding="utf-8")
        except OSError as exc:
            return f"Could not read {DESIGN_NOTES_PATH.name}: {exc}"

    def _read_theta(self):
        """Return theta in degrees, or None if the input is not usable."""
        text = self.theta_input.text().strip()
        try:
            theta = float(text)
        except ValueError:
            return None
        if not 0 <= theta <= 90:
            return None
        return theta

    def _read_force(self):
        """Return the lateral force, or None if the box is empty or invalid."""
        text = self.force_input.text().strip()
        if not text:
            return None
        try:
            return float(text)
        except ValueError:
            return None

    def _show_results(self, theta, lateral_force):
        """Show link loads when both inputs are present."""
        if theta is None or lateral_force is None:
            self.results_display.clear()
            return

        sin_theta = np.sin(np.deg2rad(theta))
        if sin_theta == 0:
            self.results_display.setHtml(
                "<p style='font-size:16px;'>Single link load is undefined at 0\u00b0 "
                "because sin(theta) is 0.</p>"
            )
            return

        value1 = lateral_force / sin_theta
        value2 = value1 / 4
        value1_text = f"{value1:.4g}"
        value2_text = f"{value2:.4g}"
        self.results_display.setHtml(
            "<p style='font-size:16px; margin-bottom:2px;'>"
            "Single link load isolated (hypothetical)</p>"
            f"<p style='font-size:26px; font-weight:600; margin-top:0;'>"
            f"{value1_text}</p>"
            "<p style='font-size:16px; margin-bottom:2px;'>"
            "Single link load in equal angle/length 4-link (realistic)</p>"
            f"<p style='font-size:26px; font-weight:600; margin-top:0;'>"
            f"{value1_text} / 4 = {value2_text}</p>"
        )

    def update_plot(self):
        """Replot from theta, and show loads when force is also present."""
        theta = self._read_theta()
        lateral_force = self._read_force()
        if theta is None or lateral_force is None:
            self.results_display.clear()
            if theta is not None:
                self.plot_canvas.plot_right_triangle(theta)
            return
        self.plot_canvas.plot_right_triangle(theta)
        self._show_results(theta, lateral_force)


def main():
    """Application entry point."""
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()