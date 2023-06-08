import { DL_DIR, EDGE_HOTSPOT_PASSWORD, EDGE_HOTSPOT_USERNAME, EDGE_IP_WIFI, HOME_DIR, MY_IP_WIFI, MY_SERVER_PORT } from '@/config';
import axios from 'axios';
const PLATFORMS = {
    MAC: 'MAC',
    LINUX: 'LINUX',
    WINDOWS: 'WINDOWS'
};
const platformName = (typeof window !== 'undefined' ? (navigator.userAgent || navigator.platform || navigator.userAgentData.platform) : 'mac').toUpperCase();
let platform = PLATFORMS.MAC;
if(platformName.toUpperCase().indexOf("LINUX") >= 0) platform = PLATFORMS.LINUX;
if(platformName.toUpperCase().indexOf("WINDOWS") >= 0) platform = PLATFORMS.WINDOWS;

export default function useExec() {

    const exec = async (command: string) => {
        console.log("Sending local message:", command);
        const response = await axios.post(`http://${MY_IP_WIFI}:${MY_SERVER_PORT}/run`, command);
        console.log("Got local response:", response);
        return response;
    }

    function connectToEdge() {
        return platform === PLATFORMS.MAC ?
            exec(`WIFIINT=$(networksetup -listallhardwareports | awk '/Wi-Fi|AirPort/{getline; print $2}') && networksetup -setairportnetwork $WIFIINT ${EDGE_HOTSPOT_USERNAME} ${EDGE_HOTSPOT_PASSWORD}`) : // mac command
            exec(`nmcli dev wifi connect ${EDGE_HOTSPOT_USERNAME} password ${EDGE_HOTSPOT_PASSWORD}`); // ubuntu command
    };

    function decompress(fileName: string) {
        return exec(`unzip ${fileName} -d ${DL_DIR}`);
    };

    function runDocker(folder: string) {
        return exec(`${HOME_DIR}/Work/Codespace/IveroReconstruction/Docker/run_gui.sh -d ${folder}`);
    };

    function remove(folder: string) {
        return exec(`rm -rf ${folder}`);
    };

    function organize(folder: string) {
        return exec(`python3 ${HOME_DIR}/Work/Codespace/IveroReconstruction/data_organizer.py --path ${folder}`);
    };

    function reconstruct(folder: string) {
        return exec(`python3 ${HOME_DIR}/Work/Codespace/IveroReconstruction/reconstruction_system/run_system.py --make --register --refine --integrate --config ${folder}/ivero.json `);
    };

    function connectToWifi(ssid: string, pass: string) {
        return platform === PLATFORMS.MAC ?
            exec(`WIFIINT=$(networksetup -listallhardwareports | awk '/Wi-Fi|AirPort/{getline; print $2}') && networksetup -setairportnetwork $WIFIINT ${ssid} ${pass}`) : // mac command
            exec(`nmcli dev wifi connect ${ssid} password ${pass}`); // ubuntu command
    };

    function getWifiName() {
        return platform === PLATFORMS.MAC ?
            exec("WIFIINT=$(networksetup -listallhardwareports | awk '/Wi-Fi|AirPort/{getline; print $2}') && networksetup -getairportnetwork $WIFIINT | rev | cut -d' ' -f1 | rev") : // mac command
            exec("nmcli c show | grep wlan0 | grep -v grep | cut -d' ' -f1"); // ubuntu command
    };

    return {
        exec, connectToEdge, connectToWifi, getWifiName, decompress, runDocker, reconstruct, organize, remove
    };

}
