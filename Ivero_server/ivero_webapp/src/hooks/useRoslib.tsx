import React, { useEffect, useRef, useState } from 'react';
import ROSLIB from 'roslib';
import { EDGE_IP_WIFI, EDGE_ROS_PORT, GET_FILE_LIST_TIMEOUT } from "@/config";

export default function useRoslib(canvasRef: any) {

    const [rosStatus, setRosStatus] = useState(false);
    const [rosError, setRosError] = useState<string | null>(null);
    const [ros, setRos] = useState<ROSLIB.Ros>(() => new ROSLIB.Ros({ url: `ws://${EDGE_IP_WIFI}:${EDGE_ROS_PORT}` }));
    const launchClient: any = useRef(null);
    const startRecordTrigger: any = useRef(null);
    const stopRecordTrigger: any = useRef(null);
    const cancelRecordTrigger: any = useRef(null);
    const getStatusService: any = useRef(null);

    useEffect(() => {
        let topicClient: any;

        if (ros) {
            ros.on('connection', () => {
                console.log('Ros connection started');
                setRosError(null);
                setRosStatus(true);
            });

            // When the Rosbridge server experiences an error, fill the “status" span with the returned error
            ros.on('error', (error: any) => {
                console.error('Ros connection error:', error);
                setRosError('Error connecting to Ros server');
                setRosStatus(false);
                setTimeout(() => {
                    setRos(new ROSLIB.Ros({ url: `ws://${EDGE_IP_WIFI}:${EDGE_ROS_PORT}` }));
                }, 1000);
            });

            // When the Rosbridge server shuts down, fill the “status" span with “closed"
            ros.on('close', () => {
                console.log('Ros connection closed');
                setRosStatus(false);
            });

            // Create a service client to call the ROS2 launch service:
            launchClient.current = new ROSLIB.Service({
                ros: ros,
                name: '/launch',
                serviceType: 'pointcloud_server/srv/LaunchCommands'
            });

            startRecordTrigger.current = new ROSLIB.Service({
                ros: ros,
                name: '/ivero_slam/start',
                serviceType: 'std_srv::Trigger'
            });
            stopRecordTrigger.current = new ROSLIB.Service({
                ros: ros,
                name: '/ivero_slam/stop',
                serviceType: 'std_srv::Trigger'
            });
            cancelRecordTrigger.current = new ROSLIB.Service({
                ros: ros,
                name: '/ivero_slam/cancel',
                serviceType: 'std_srv::Trigger'
            });
            getStatusService.current = new ROSLIB.Service({
                ros: ros,
                name: '/ivero_slam/get_status',
                serviceType: 'iveroslam_interfaces/srv/SystemStatus'
            });

            topicClient = new ROSLIB.Topic({
                ros: ros,
                name: "/my_topic",
                messageType: "std_msgs/String"
            });

            topicClient.subscribe(function (message: any) {
                const json_obj = JSON.parse(message.data);
                // console.log('message recieved on my_topic', json_obj)
                canvasRef.current?.addPoints?.(json_obj);
            });

        }

        return () => {
            topicClient?.unsubscribe();
            ros.close();
        }
    }, [ros]);

    function parseFileList(message: string) {
        const files: any = [];
        for (const line of message.split('\n').slice(0, -1)) {
            const [fileName, fileSize] = line.substring(6, line.length - 6).split(' Size: ');
            files.push([fileName, Math.max(Math.round((parseFloat(fileSize) * 1000) / (1024 ** 3)) / 100, 0.001)]);
        }
        return files;
    }

    //Create a function to call the launch service and pass the launch command as a string
    function launchCommand(command: any, cb: any = null) {
        var request = new ROSLIB.ServiceRequest({ command: command + " &" });
        launchClient.current.callService(request, function (result: any) {
            console.log('Edge2 Command:', command, '\nResult:', result);
            if (result.success) {
                cb?.(result);
            }
        }
        );
    };
    //Create a function to call the launch service and pass the launch command as a string
    function startRecord(cb: any = null) {
        var request = new ROSLIB.ServiceRequest({});
        console.log('starting record ...');
        startRecordTrigger.current.callService(request, function (result: any) {
            console.log('Edge2 StartRecord:', '\nResult:', result);
            if (result.success) {
                cb?.(result);
            }
        }
        );
    };
    //Create a function to call the launch service and pass the launch command as a string
    function stopRecord(cb: any = null) {
        var request = new ROSLIB.ServiceRequest({});
        console.log('stoping record ...');
        stopRecordTrigger.current.callService(request, function (result: any) {
            console.log('Edge2 StopRecord:', '\nResult:', result);
            if (result.success) {
                cb?.(result);
            }
        }
        );
    };
    //Create a function to call the launch service and pass the launch command as a string
    function cancelRecord(cb: any = null) {
        var request = new ROSLIB.ServiceRequest({});
        console.log('canceling record ...');
        cancelRecordTrigger.current.callService(request, function (result: any) {
            console.log('Edge2 CancelRecord:', '\nResult:', result);
            if (result.success) {
                cb?.(result);
            }
        }
        );
    };
    //Create a function to call the launch service and pass the launch command as a string
    function getStatus(cb: any = null) {
        var request = new ROSLIB.ServiceRequest({});
        console.log('getting status ...');
        getStatusService.current.callService(request, function (result: any) {
            console.log('Edge2 getStatus:', '\nResult:', result);
            if (result.success) {
                cb?.(result);
            }
        }
        );
    };

    function startWebServer(cb: any) {
        launchCommand("tmux new-session -s Server -d 'webrtc_ros/./webrtc_ros_server_node'", cb);
    }

    function serveDownloadFile(filename: string, cb: any) {
        launchCommand(`killall FileSender; python ~/sender.py ${filename}`, cb);
    };

    function deleteFile(filename: string, cb: any) {
        launchCommand(`rm -rf ~/ivero_results/${filename}`, cb);
    };

    function getFileList(cb: any = null) {
        return new Promise((resolve, reject) => {
            const listener = new ROSLIB.Topic({
                ros: ros,
                name: '/file_list_topic',
                messageType: 'std_msgs/String'
            });
            const callback = (message: any) => {
                listener.unsubscribe();
                console.log('Received message on ' + listener.name + ': ' + message.data);
                resolve(parseFileList(message.data));
            };
            listener.subscribe(callback);
            launchCommand("ros2 run pointcloud_server filelist", cb);
            setTimeout(() => {
                listener.unsubscribe();
                reject('Timeout reading filelist from edge!');
            }, GET_FILE_LIST_TIMEOUT);
        });
    };

    return {
        rosStatus, rosError, serveDownloadFile, getFileList, deleteFile, getStatus,
        startRecord, stopRecord, cancelRecord, startWebServer
    }
}
