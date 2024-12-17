#!/bin/bash

# Path to your logs directory
LOG_DIR="/path/to/your/logs"

# Find and remove all files in the logs folder (except directories)
find "$LOG_DIR" -type f -exec rm -f {} \;

echo "Logs cleaned successfully."
