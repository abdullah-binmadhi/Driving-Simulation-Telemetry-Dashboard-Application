"""
Centralized Configuration for the BeamNG.tech Road Surface Classification Pipeline.
This file contains all hardcoded variables, environment settings, and simulation parameters.
Keeping these in one place makes it easy to adjust the sensor resolution or polling rate 
without hunting through the implementation logic.
"""

import os
from datetime import datetime

# --- BeamNG Connection Settings ---
# Default IP and Port for BeamNG.tech's research server.
# Ensure the "Enable Research Server" option is checked in BeamNG options.
BEAMNG_HOST = 'localhost'
BEAMNG_PORT = 64251

# --- Camera & Visual Sensors ---
# Resolution affects both simulation performance and ML training data size.
# 512x512 is a good balance for ResNet-18 backbones.
CAMERA_WIDTH = 512
CAMERA_HEIGHT = 512
CAMERA_FOV = 70  # Field of View in degrees

# --- Sensor Polling Rate ---
# 10Hz (0.1 seconds) is standard for telemetry collection. 
# Higher rates significantly increase data volume and may lag the simulation.
POLLING_RATE = 0.1  # Seconds

# --- Dataset Paths ---
# We organize data into a subfolder named 'dataset' under the current script directory.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_DIR, 'dataset')

# Create the directory if it doesn't exist to prevent file write errors later.
if not os.path.exists(DATASET_PATH):
    os.makedirs(DATASET_PATH)

# --- Material ID Mappings ---
# These labels are retrieved from the BeamNG RoadSensor and used as Ground Truth.
# This dictionary maps the integer IDs from the simulator to human-readable strings.
MATERIAL_LABELS = {
    0: "Asphalt",
    1: "Dirt",
    2: "Grass",
    3: "Gravel",
    4: "Mud",
    5: "Sand",
    # Note: These IDs may vary based on the specific map being used.
}

# Total number of classes (used for the final output layer of our Neural Network).
NUM_CLASSES = len(MATERIAL_LABELS)
