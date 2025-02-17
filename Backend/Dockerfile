FROM python:3.9-slim

# Set the working directory
WORKDIR /app

# Copy requirements.txt and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your application code
COPY . .

# Expose the port your app will run on (5000 is the default Flask port)
EXPOSE 5050

# Use Gunicorn to run the app (4 workers for production use)
CMD ["gunicorn", "-w", "4", "-k", "eventlet", "src.server:app", "--bind", "0.0.0.0:5050"]

