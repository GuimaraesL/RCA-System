import sys
import os
import subprocess
import time
import socket
import json

# Configuration
PID_FILE = os.path.join(os.path.dirname(__file__), '.preview_pid')
PORT = 3000 # Default Vite port

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0

def get_pid():
    if os.path.exists(PID_FILE):
        try:
            with open(PID_FILE, 'r') as f:
                return int(f.read().strip())
        except:
            return None
    return None

def start_server(port=PORT):
    if is_port_in_use(port):
        print(f"⚠️ Port {port} is already in use.")
        return

    print(f"🚀 Starting preview server on port {port}...")
    # Use 'npm run dev' or 'vite' directly
    # Using 'npm run dev' is safer as it respects package.json
    try:
        # Windows-specific: use shell=True and start in new process group if possible, 
        # but simplistic Popen often better for backgrounding
        if sys.platform == 'win32':
             process = subprocess.Popen(['npm', 'run', 'dev', '--', '--port', str(port)], 
                                       stdout=subprocess.PIPE, 
                                       stderr=subprocess.PIPE,
                                       shell=True)
        else:
            process = subprocess.Popen(['npm', 'run', 'dev', '--', '--port', str(port)], 
                                       stdout=subprocess.PIPE, 
                                       stderr=subprocess.PIPE,
                                       preexec_fn=os.setsid)
        
        with open(PID_FILE, 'w') as f:
            f.write(str(process.pid))
        
        # Wait a bit to see if it crashes immediately
        time.sleep(2)
        if process.poll() is not None:
             print("❌ Server failed to start immediately.")
             print(process.stderr.read().decode())
             return

        print(f"✅ Preview started! (PID: {process.pid})")
        print(f"   URL: http://localhost:{port}")
    except Exception as e:
        print(f"❌ Error starting server: {e}")

def stop_server():
    pid = get_pid()
    if not pid:
        print("ℹ️ No active preview server found (no PID file).")
        return

    print(f"🛑 Stopping server (PID: {pid})...")
    try:
        if sys.platform == 'win32':
            subprocess.run(['taskkill', '/F', '/T', '/PID', str(pid)], capture_output=True)
        else:
            os.killpg(os.getpgid(pid), 15) # Verify this on Linux/Mac
    except Exception as e:
        print(f"⚠️ Error stopping process: {e}")
    
    if os.path.exists(PID_FILE):
        os.remove(PID_FILE)
    print("✅ Server stopped.")

def status():
    pid = get_pid()
    running = False
    
    if pid:
        # Check if process actually exists
        # Basic check: usually kill(pid, 0) on *nix, tasklist on windows
        running = True # Assumption for now, or check generic
    
    # Real check: Port
    port_active = is_port_in_use(PORT)

    print("\n=== Preview Status ===\n")
    print(f"🌐 URL: http://localhost:{PORT}")
    print(f"📁 PID: {pid if pid else 'None'}")
    
    health = "OK" if port_active else "Stopped"
    if pid and not port_active: health = "Zombie (PID exists, Port closed)"
    if not pid and port_active: health = "Running (External/Orphaned)"
    
    print(f"💚 Health: {health}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        status()
    else:
        cmd = sys.argv[1]
        if cmd == 'start':
            port = int(sys.argv[2]) if len(sys.argv) > 2 else PORT
            start_server(port)
        elif cmd == 'stop':
            stop_server()
        elif cmd == 'status':
            status()
        elif cmd == 'check':
            status()
        else:
            status()
