import { EDGE_HOTSPOT_USERNAME, EDGE_IP_HOTSPOT, EDGE_IP_WIFI, EDGE_ROS_PORT, EDGE_WEB_PORT, MY_IP_WIFI } from '@/config';
import React, { useEffect, useRef, useState } from 'react';
import useExec from './useExec';
import { CONNECTIONS_STATES } from '@/constants';
import axios from 'axios';
import ROSLIB from 'roslib';

const STEPS = {
    CHECK_IF_ALREADY_CONNECTED: 'CHECK_IF_ALREADY_CONNECTED',
    CONNECT_TO_EDGE_HOTSPOT: 'CONNECT_TO_EDGE_HOTSPOT',
    CONNECT_TO_ROS_HOTSPOT: 'CONNECT_TO_ROS_HOTSPOT',
    CONNECT_EDGE_TO_WIFI: 'CONNECT_EDGE_TO_WIFI',
    CHECK_IF_DONE: 'CHECK_IF_DONE'
};

const steps = [
    STEPS.CHECK_IF_ALREADY_CONNECTED,
    STEPS.CONNECT_TO_EDGE_HOTSPOT,
    STEPS.CONNECT_TO_ROS_HOTSPOT,
    STEPS.CONNECT_EDGE_TO_WIFI,
    STEPS.CHECK_IF_DONE
]

const [wifiUsername, wifiPassword] = ['LuxolisAI', 'Roove@123']

export default function useHandshake() {

    const { connectToEdge, connectToWifi, getWifiName } = useExec();
    const [currentStep, setCurrentStep] = useState(-1);
    const [state, setState] = useState(CONNECTIONS_STATES.INIT);
    const wifiCreds = useRef<any>();
    const ros = useRef<ROSLIB.Ros>();

    const connectEdgeToWifi = (ros: any, ssid: string = 'LuxolisAI', pass: string = 'Roove@123') => {
        new ROSLIB.Service({
            ros: ros,
            name: '/launch',
            serviceType: 'pointcloud_server/srv/LaunchCommands'
        }).callService(new ROSLIB.ServiceRequest({
            command: `echo "khadas" |\
                        sudo -S nmcli c down Hotspot &&\
                        sleep 5 &&\
                        echo "khadas" |\
                        sudo -S nmcli d wifi connect ${ssid} password ${pass}` + " &" 
        }), res => console.log('ros req: wifi, res:', res));
    }

    const checkIfConnected = async () => {
        try {
            return (await axios.get(`http://${EDGE_IP_WIFI}:${EDGE_WEB_PORT}/`, { timeout: 1000 })).status === 200;
        } catch (e) {
            return false;
        }
    };

    const provideWifiCreds = function(ssid: any, pass: any){
        wifiCreds.current = {ssid, pass};
        setState(CONNECTIONS_STATES.READY);
        setCurrentStep(1);
    }

    const connect = async () => {
        console.log('currentStep', currentStep);
        let response = null;
        switch (currentStep) {
            case -1:
                if (await checkIfConnected()) setState(CONNECTIONS_STATES.DONE);
                else {
                    setState(CONNECTIONS_STATES.READY);
                    setCurrentStep(0);
                }
                break;
            case 1:
                response = null;
                while (response !== EDGE_HOTSPOT_USERNAME) {
                    response = (await connectToEdge()).data;
                    if (response.startsWith('Could not find network') || response.startsWith('Could not find network')) continue;
                    response = (await getWifiName()).data;
                }
                setCurrentStep(2);
                break;
            case 2:
                ros.current = new ROSLIB.Ros({ url: `ws://${EDGE_IP_HOTSPOT}:${EDGE_ROS_PORT}` });
                ros.current.on('connection', () => {
                    setCurrentStep(3);
                });
                ros.current.on('error', () => setTimeout(connect, 1000));
                break;
            case 3:
                connectEdgeToWifi(ros.current, wifiUsername, wifiPassword);
                setCurrentStep(4);
                break;
            case 4:
                response = null;
                while (response !== wifiUsername) {
                    response = (await connectToWifi(wifiUsername, wifiPassword)).data;
                    if (response.startsWith('Could not find network') || response.startsWith('Could not find network')) continue;
                    response = (await getWifiName()).data;
                }
                ros.current?.close();
                setState(CONNECTIONS_STATES.DONE);
                break;
        }
    }

    useEffect(() => {
        connect();
    }, [currentStep]);

    return {
        steps, state, currentStep, provideWifiCreds
    };

}
