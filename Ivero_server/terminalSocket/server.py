from http.server import BaseHTTPRequestHandler, HTTPServer
import asyncio
import platform
if platform.system()=='Windows':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

class MyRequestHandler(BaseHTTPRequestHandler):
    def _set_response(self, status_code=200, content_type='text/plain'):
        self.protocol_version = 'HTTP/1.0'
        self.send_response(status_code)
        self.send_header('Content-type', content_type)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def get_post_data(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length).decode('utf-8')
        return post_data

    def do_POST(self):
        if self.path == '/run':
            asyncio.set_event_loop(asyncio.new_event_loop())
            self.loop = asyncio.get_event_loop()
            self.loop.run_until_complete(self.handle_run(self.get_post_data()))
            self.loop.close()
        else:
            self.handle_not_found()

    async def handle_run(self, post_data):
        # Set response code and headers
        self._set_response(200, 'text/plain')

        # Print the received data
        print('Received POST data for handle_run:', post_data)

        result = await asyncio.create_subprocess_shell(
            post_data,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE)
        stdout, stderr = await result.communicate()

        # Send a response back
        response = stdout.decode().strip() + stderr.decode().strip()

        print('Responded to POST request for handle_run:', response)
        self.wfile.write(response.encode('utf-8'))

    def handle_not_found(self):
        # Set response code and headers
        self._set_response(404, 'text/plain')

        # Send a response back
        response = 'Endpoint not found'
        self.wfile.write(response.encode('utf-8'))

def run_server():
    server_address = ('localhost', 8766)
    httpd = HTTPServer(server_address, MyRequestHandler)
    print('Server running on http://localhost:8766')

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass

    httpd.server_close()
    print('Server stopped')

if __name__ == '__main__':
    run_server()

# curl --http1.1 -X POST -d "WIFIINT=$(networksetup -listallhardwareports | awk '/Wi-Fi|AirPort/{getline; print $2}') && networksetup -getairportnetwork $WIFIINT | rev | cut -d' ' -f1 | rev" http://localhost:8766/run
# wget --header 'Content-Type: text/plain' --post-data "WIFIINT=$(networksetup -listallhardwareports | awk '/Wi-Fi|AirPort/{getline; print $2}') && networksetup -getairportnetwork $WIFIINT | rev | cut -d' ' -f1 | rev" http://localhost:8766/run