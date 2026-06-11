import http.server
import socketserver
import json
import os

PORT = 8085
DATA_DIR = "data"
DATA_FILE = os.path.join(DATA_DIR, "work_orders.json")

class MyHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/api/load":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            # CORS headers just in case
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            
            if os.path.exists(DATA_FILE):
                with open(DATA_FILE, "r", encoding="utf-8") as f:
                    self.wfile.write(f.read().encode("utf-8"))
            else:
                self.wfile.write(json.dumps([]).encode("utf-8"))
        else:
            super().do_GET()

    def do_POST(self):
        if self.path == "/api/save":
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                # Validate JSON format
                data = json.loads(post_data.decode("utf-8"))
                
                # Ensure data folder exists
                os.makedirs(DATA_DIR, exist_ok=True)
                
                # Write to file
                with open(DATA_FILE, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success", "count": len(data)}).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode("utf-8"))
        elif self.path == "/api/save-pdf":
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                payload = json.loads(post_data.decode("utf-8"))
                order_id = payload.get("id")
                pdf_base64 = payload.get("pdfBase64")
                
                if not order_id or not pdf_base64:
                    raise Exception("Missing id or pdfBase64 payload parameters")
                
                import base64
                pdf_data = base64.b64decode(pdf_base64)
                
                # Ensure pdf_reports folder exists
                pdf_dir = "pdf_reports"
                os.makedirs(pdf_dir, exist_ok=True)
                
                pdf_filename = os.path.join(pdf_dir, f"work_order_{order_id}.pdf")
                
                # Save binary PDF file
                with open(pdf_filename, "wb") as f:
                    f.write(pdf_data)
                
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success", "filename": f"{pdf_dir}/work_order_{order_id}.pdf"}).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    # Handle OPTIONS requests for CORS if necessary
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

if __name__ == "__main__":
    print(f"Starting ArmorCoat HTTP Server on port {PORT}...")
    print(f"Serving files from: {os.path.abspath('.')}")
    print(f"Data directory: {os.path.abspath(DATA_DIR)}")
    
    # Allow fast address reuse after stopping
    socketserver.TCPServer.allow_reuse_address = True
    
    with socketserver.TCPServer(("", PORT), MyHandler) as httpd:
        try:
            print("Server is running. Press Ctrl+C to stop.")
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopping server.")
