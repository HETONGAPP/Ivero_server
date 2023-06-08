"use server";
import { EDGE_DOWNLOAD_PORT, EDGE_IP_WIFI, HOME_DIR } from '@/config';
import fs from 'fs';

async function fileReceive() {
  const websocket = new WebSocket(`ws://${EDGE_IP_WIFI}:${EDGE_DOWNLOAD_PORT}`);
  console.log('downloadFile', 1);
  await new Promise((resolve, reject) => {
    websocket.onopen = resolve;
    websocket.onerror = reject;
  });
  console.log('downloadFile', 2);

  // Receive the file name and size from the server
  const fileInfo: string = await new Promise(resolve => {
    websocket.onmessage = event => resolve(String(event.data));
  });

  console.log('downloadFile', 3);
  const parts = fileInfo.split(":");
  const fileSize = parseFloat(parts[1]);
  const fileName = parts[0];

  let receivedSize = 0;

  // Open a new file to save the received data
  const fileStream = fs.createWriteStream(`${HOME_DIR}/Ivero_files/` + fileName);

  // Receive file data as chunks
  while (receivedSize < fileSize) {
    const chunk: any = await new Promise(resolve => {
      websocket.onmessage = event => resolve(event.data);
    });

    receivedSize += chunk.length;
    fileStream.write(chunk);
  }

  fileStream.end();

  // Send confirmation message to the server
  websocket.send('File received');
}

async function downloadFile() {
  console.log('downloadFile: start');
  try {
    await fileReceive();
    console.log('File received successfully.');
  } catch (error) {
    console.error('Error receiving file:', error);
  }
}

export default downloadFile;