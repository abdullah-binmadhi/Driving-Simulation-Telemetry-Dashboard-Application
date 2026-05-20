import os
import glob
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType

# Configurations
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'dataset')
# Export the model directly to the frontend's public folder so React can fetch it
MODEL_OUTPUT = os.path.join(BASE_DIR, '../public/models/tire_wear_model.onnx')

# Features (X) we want the model to learn from 
# (The inputs the driver provides and the physical forces on the car)
FEATURES = [
    'speed', 'throttle', 'brake', 'steering', 
    'gForceX', 'gForceY', 'jerk_x', 'jerk_y', 'pedal_overlap'
]

# Target (Y) we want to predict (e.g., Front-Left Tire Wear based on Ground Truth)
TARGET = 'true_tire_wear_fl'

def load_data():
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
        print(f"Created {DATA_DIR}. Please place your exported telemetry CSVs here.")
        return None
    
    csv_files = glob.glob(os.path.join(DATA_DIR, "*.csv"))
    if not csv_files:
        print(f"No CSV files found in {DATA_DIR}. Cannot train.")
        return None
    
    print(f"Loading {len(csv_files)} CSV files...")
    df_list = []
    for file in csv_files:
        try:
            df = pd.read_csv(file)
            df_list.append(df)
        except Exception as e:
            print(f"Error reading {file}: {e}")
            
    if not df_list:
        return None
        
    full_df = pd.concat(df_list, ignore_index=True)
    
    # Clean the data: Drop rows that are missing our required features or targets
    full_df = full_df.dropna(subset=FEATURES + [TARGET])
    return full_df

def train():
    df = load_data()
    if df is None or len(df) < 50:
        print("Not enough data to train. Please record and export more sessions.")
        return

    print(f"Data loaded successfully. Total valid rows: {len(df)}")
    
    X = df[FEATURES].values
    y = df[TARGET].values

    # 80% for training, 20% for testing the ML's accuracy
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    print("Training Random Forest Regressor on driving physics...")
    # n_estimators=50 is a good balance between speed and accuracy for ONNX web inference
    model = RandomForestRegressor(n_estimators=50, max_depth=10, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)

    # Evaluate the model against data it hasn't seen yet
    predictions = model.predict(X_test)
    mse = mean_squared_error(y_test, predictions)
    r2 = r2_score(y_test, predictions)
    
    print(f"Evaluation -> Mean Squared Error: {mse:.6f}, R2 Score: {r2:.4f}")

    # Ensure output directory exists
    os.makedirs(os.path.dirname(MODEL_OUTPUT), exist_ok=True)

    # Convert the Python model to ONNX so Javascript/React can run it
    print("Converting model to ONNX web format...")
    initial_types = [('float_input', FloatTensorType([None, len(FEATURES)]))]
    onnx_model = convert_sklearn(model, initial_types=initial_types)

    # Save the physical brain!
    with open(MODEL_OUTPUT, "wb") as f:
        f.write(onnx_model.SerializeToString())
    
    print(f"Success! Model exported to {os.path.abspath(MODEL_OUTPUT)}")
    print("The React Dashboard can now load this .onnx file to perform highly-accurate, offline-trained inference!")

if __name__ == "__main__":
    train()