import { useEffect, useState } from 'react';

import {EDGE_IP_WIFI, EDGE_WEB_PORT} from "@/config";

export default function useStream(src: any, runSocket: any, rosStatus: any, setSrcObj: any) {
    const [streamObj, setStreamObj] = useState(null);
    const [conn, setConn] = useState<any>(null);

    useEffect(()=>{
      if (rosStatus) {
        const websocketUrl = `ws://${EDGE_IP_WIFI}:${EDGE_WEB_PORT}/webrtc`;
        conn?.close();
        console.log('Establishing WebRTC connection')
        setConn(WebrtcRos.createConnection(websocketUrl, {}, () => {
          if (runSocket) {
            setTimeout(() => {
              runSocket(() => setTimeout(() =>
                setConn(WebrtcRos.createConnection(websocketUrl))), 1000); 
            }, 1000); 
          }
        }));
      }
    }, [rosStatus]);

    useEffect(() => {
      if (conn) {
        conn.onConfigurationNeeded = function () {
            console.log('Requesting WebRTC video subscription')
            let config: { video?: { id: string, src: string } } = {}
            config.video = { id: 'subscribed_video', src }
            conn.addRemoteStream(config).then(function (event: any) {
                console.log('Connecting WebRTC stream to <video> element', event.stream);
                setSrcObj(event.stream)
                setStreamObj(event.stream);
                event.remove.then(function () {
                    console.log('Disconnecting WebRTC stream from <video> element');
                    setStreamObj(null);
                })
            })
            conn.sendConfigure()
        }
        conn.connect()
      }
    }, [conn]);

    const getLivePointCloud = () => {
      conn?.sendMessage("ros2 launch rosbridge_server rosbridge_websocket_launch.xml")
    };

    return { getLivePointCloud };
}


const WebrtcRos = (function () {
    var newStreamId = function () {
      return (
        'webrtc_ros-stream-' + Math.floor(Math.random() * 1000000000).toString()
      )
    }
  
    var WebrtcRosConnection = function (this: any, signalingServerPath: any, configuration: any, onError: any) {
      this.signalingServerPath =
        signalingServerPath ||
        (window.location.protocol === 'https:' ? 'wss://' : 'ws://') +
          window.location.host +
          '/webrtc'
      this.onConfigurationNeeded = undefined
      this.signalingChannel = null
      this.peerConnection = null
      this.receiveChannel = null
      this.sendChannel = null
      this.dataChannelActive = false
  
      this.receiveBuffer = []
      this.fileReader = null
      this.receivedDataBuffer = new Uint8Array()
      this.receivedDataChunks = []
      this.peerConnectionMediaConstraints = {
        optional: [{ DtlsSrtpKeyAgreement: true }]
      }
      this.peerConnectionConfiguration = configuration

      this.onError = onError
  
      this.lastConfigureActionPromise = Promise.resolve([])
  
      this.addStreamCallbacks = {}
      this.removeTrackCallbacks = {}
    }
  
    WebrtcRosConnection.prototype.sendMessage = function (data: any) {
      console.log('ROS2 server has been launched: ', data)
      var message = data
      this.sendChannel.send(message)
    }
  
    WebrtcRosConnection.prototype.handleFileInputChange = async function () {
      const file = this.fileInput.files[0]
      if (!file) {
        console.log('No file chosen')
      } else {
        this.sendFileButton.disabled = false
      }
    }
  
    WebrtcRosConnection.prototype.connect = function () {
      var self = this
      this.close()
      this.signalingChannel = new WebSocket(this.signalingServerPath)
      this.signalingChannel.onmessage = function (e: any) {
        self.onSignalingMessage(e)
      }
      this.signalingChannel.onopen = function () {
        console.log('WebRTC signaling connection established')
        if (self.onConfigurationNeeded) {
          self.onConfigurationNeeded()
        }
      }
      this.signalingChannel.onerror = function () {
        self.onError?.();
        console.error('WebRTC signaling error')
      }
      this.signalingChannel.onclose = function () {
        console.log('WebRTC signaling connection closed')
      }
  
      this.peerConnection = new RTCPeerConnection(
        this.peerConnectionConfiguration,
        // this.peerConnectionMediaConstraints
      )
  
      var dataChannelOptions = {
        ordered: true,
        maxPacketLifeTime: 0
      }
      this.sendChannel = this.peerConnection.createDataChannel(
        'data_channel_2',
        dataChannelOptions
      )
      this.sendChannel.bufferedAmountLowThreshold = 1024 * 1024 * 16 // 1 MB

      this.sendChannel.onopen = function (event: any) {
        console.log('*** Channel Send Funcion Has Opened ***')
      }
      this.sendChannel.onclose = function (event: any) {
        console.log('*** Channel Send Funcion Closed ***')
      }
      this.sendChannel.onerror = function (event: { error: any; }) {
        console.error(event.error)
      }
  
      this.peerConnection.ondatachannel = function (event: { channel: any; }) {
        this.receiveChannel = event.channel

        this.receiveChannel.onopen = function (event: any) {
          console.log('*** Channel Receive Funcion Has Opened ***')
        }
        this.receiveChannel.onclose = function (event: any) {
          console.log('*** Channel Received Funcion Closed ***')
        }
        this.receiveChannel.onerror = function (err: any) {
          console.error(err)
        }
        this.receiveChannel.addEventListener('message', (event: { data: any; }) => {
          console.log('*** receive: ', event.data)
        })
      }
  
      this.peerConnection.onicecandidate = function (event: { candidate: { sdpMLineIndex: any; sdpMid: any; candidate: any; }; }) {
        if (event.candidate) {
          var candidate = {
            sdp_mline_index: event.candidate.sdpMLineIndex,
            sdp_mid: event.candidate.sdpMid,
            candidate: event.candidate.candidate,
            type: 'ice_candidate'
          }
          self.signalingChannel.send(JSON.stringify(candidate))
        }
      }
  
      this.peerConnection.ontrack = function (event: { streams: any[]; track: { id: string | number; }; }) {
        var callbackData = self.addStreamCallbacks[event.streams[0].id]
        if (callbackData) {
          event.streams[0].onremovetrack = function (event: { track: { id: string | number; }; }) {
            var callbackData = self.removeTrackCallbacks[event.track.id]
            if (callbackData) {
              callbackData.resolve({
                track: event.track
              })
            }
          }
          callbackData.resolve({
            stream: event.streams[0],
            remove: new Promise(function (resolve, reject) {
              self.removeTrackCallbacks[event.track.id] = {
                resolve: resolve,
                reject: reject
              }
            })
          })
        }
      }
    }
    WebrtcRosConnection.prototype.close = function () {
      if (this.peerConnection) {
        this.peerConnection.close()
        this.peerConnection = null
      }
      if (this.signalingChannel) {
        this.signalingChannel.close()
        this.signalingChannel = null
      }
      if (this.sendChannel) {
        this.sendChannel.onopen = null
        this.sendChannel.onclose = null
        this.sendChannel.close()
        this.sendChannel = null
      }
      if (this.receiveChannel) {
        this.receiveChannel.onmessage = null
        this.receiveChannel.onopen = null
        this.receiveChannel.onclose = null
        this.receiveChannel.close()
        this.receiveChannel = null
      }
    }
    WebrtcRosConnection.prototype.onSignalingMessage = function (e: { data: string; }) {
      var self = this
      var dataJson = JSON.parse(e.data)
      if (dataJson.type === 'offer') {
        console.log('Received WebRTC offer via WebRTC signaling channel')
        this.peerConnection.setRemoteDescription(
          new RTCSessionDescription(dataJson),
          function () {
            self.sendAnswer()
          },
          function (event: any) {
            console.error('onRemoteSdpError', event)
          }
        )
      } else if (dataJson.type === 'ice_candidate') {
        console.log('Received WebRTC ice_candidate via WebRTC signaling channel')
        var candidate = new RTCIceCandidate({
          sdpMLineIndex: dataJson.sdp_mline_index,
          candidate: dataJson.candidate
        })
        this.peerConnection.addIceCandidate(candidate)
      } else {
        console.warn(
          "Received unknown message type '" +
            dataJson.type +
            "' via WebRTC signaling channel"
        )
      }
    }
  
    WebrtcRosConnection.prototype.sendAnswer = function () {
      var self = this
      var mediaConstraints = { optional: [{ OfferToReceiveVideo: true }] }
      this.peerConnection.createAnswer(
        function (sessionDescription: any) {
          self.peerConnection.setLocalDescription(sessionDescription)
          var data = JSON.stringify(sessionDescription)
          self.signalingChannel.send(data)
        },
        function (error: any) {
          console.warn('Create answer error:', error)
        },
        mediaConstraints
      )
    }
    WebrtcRosConnection.prototype.addRemoteStream = function (config: { video: { id: string; src: any; }; audio: { id: string; src: any; }; }) {
      var stream_id = newStreamId()
      var self = this
  
      this.lastConfigureActionPromise = this.lastConfigureActionPromise.then(
        function (actions: { type: string; id: string; stream_id?: string; src?: any; }[]) {
          actions.push({ type: 'add_stream', id: stream_id })
          if (config.video) {
            actions.push({
              type: 'add_video_track',
              stream_id: stream_id,
              id: stream_id + '/' + config.video.id,
              src: config.video.src
            })
          }
          if (config.audio) {
            actions.push({
              type: 'add_audio_track',
              stream_id: stream_id,
              id: stream_id + '/' + config.audio.id,
              src: config.audio.src
            })
          }
          return actions
        }
      )
      return new Promise(function (resolve, reject) {
        self.addStreamCallbacks[stream_id] = {
          resolve: resolve,
          reject: reject
        }
      })
    }
    WebrtcRosConnection.prototype.removeRemoteStream = function (stream: { id: any; }) {
      var self = this
      this.lastConfigureActionPromise = this.lastConfigureActionPromise.then(
        function (actions: { type: string; id: any; }[]) {
          actions.push({ type: 'remove_stream', id: stream.id })
          return actions
        }
      )
    }
    WebrtcRosConnection.prototype.addLocalStream = function (
      user_media_config: MediaStreamConstraints | undefined,
      local_stream_config: { video: { dest: any; }; }
    ) {
      var self = this
      return new Promise(function (resolve, reject) {
        self.lastConfigureActionPromise = self.lastConfigureActionPromise.then(
          function (actions: { type: string; id: string; stream_id?: string; dest?: any; }[]) {
            return navigator.mediaDevices
              .getUserMedia(user_media_config)
              .then(function (stream) {
                actions.push({ type: 'expect_stream', id: stream.id })
                if (local_stream_config.video) {
                  actions.push({
                    type: 'expect_video_track',
                    stream_id: stream.id,
                    id: stream.getVideoTracks()[0].id,
                    dest: local_stream_config.video.dest
                  })
                }
                self.peerConnection.addStream(stream)
                resolve({
                  stream: stream,
                  remove: new Promise(function (resolve, reject) {
                    self.removeStreamCallbacks[stream.id] = {
                      resolve: resolve,
                      reject: reject
                    }
                  })
                })
                return actions
              })
          }
        )
      })
    }
    WebrtcRosConnection.prototype.removeLocalStream = function (stream: { id: string | number; }) {
      var self = this
      this.lastConfigureActionPromise = this.lastConfigureActionPromise.then(
        function (actions: any) {
          console.log('Removing stream')
          self.peerConnection.removeStream(stream)
          var callbackData = self.removeStreamCallbacks[stream.id]
          if (callbackData) {
            callbackData.resolve({
              stream: stream
            })
          }
          return actions
        }
      )
    }
    WebrtcRosConnection.prototype.sendConfigure = function () {
      var self = this
      var currentLastConfigureActionPromise = this.lastConfigureActionPromise
      this.lastConfigureActionPromise = Promise.resolve([])
  
      currentLastConfigureActionPromise.then(function (actions: any) {
        var configMessage = { type: 'configure', actions: actions }
        self.signalingChannel.send(JSON.stringify(configMessage))
        console.log('WebRTC ROS Configure: ', actions)
      })
    }
  
    var WebrtcRos = {
      createConnection: function (signalingServerPath: any, configuration: any = null, onError: any = null) {
        return new (WebrtcRosConnection as any)(signalingServerPath, configuration, onError)
      }
    }
    return WebrtcRos
  })()
  