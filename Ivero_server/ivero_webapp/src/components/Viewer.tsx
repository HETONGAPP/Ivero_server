import React, { forwardRef, memo, useEffect, useRef, useState, useTransition } from 'react';
import useStream from '@/hooks/useStream';
import ThreeViewer from './ThreeViewer';
import Button from './Button';
import useExec from '@/hooks/useExec';
import { PAGES } from '@/constants';

function Viewer({
    setPage,
    ros: {
        rosStatus, rosError, getStatus,
        startRecord, stopRecord, cancelRecord, startWebServer
    } }: any, ref: any) {
    const rgbVideo = useRef<HTMLVideoElement>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [streamObj, setStreamObj] = useState<any>(null);
    const { getLivePointCloud } = useStream('ros_image:/ivero_slam/tracked_image', startWebServer, rosStatus, (rgbStreamObj: any) => { if (rgbVideo.current) rgbVideo.current.srcObject = rgbStreamObj; setStreamObj(rgbStreamObj) });
    const { decompress, runDocker } = useExec();
    const [response, setResponse] = useState('');
    const [command, setCommand] = useState('');

    useEffect(() => {
        if(rosStatus) getStatus(({started}: any) => {
            setIsRecording(started);
        });
    }, [rosStatus]);

    useEffect(() => {
        if (rgbVideo.current) rgbVideo.current.srcObject = streamObj;
    }, [streamObj]);

    useEffect(() => {
        let interval: any;
        if (isRecording) {
            interval = setInterval(() => {
                getLivePointCloud()
            }, 1000);
        } else {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isRecording]);

    return (
        <div className='content w-full'>

            <div className='flex flex-row w-full justify-around'>
                <video className='w-[45%] aspect-[1.3] border-1' ref={rgbVideo} autoPlay id="remote-video" muted preload="none" />
                <div className='w-[45%] aspect-[1.3] border-1 pt-[5px]'><ThreeViewer ref={ref} /></div>
            </div>

            <div className="relative flex flex-row justify-around p-[15px] mb-[20px]">
                <div>
                    <div className='flex flex-row justify-center gap-4'>
                        {isRecording ?
                            <Button icon={'/recording.svg'} text='Scanning' disabled /> :
                            <Button onClick={() => startRecord(() => setIsRecording(true))} icon={'/record.svg'} text='Start' />}
                        <Button onClick={() => stopRecord(() => setIsRecording(false))} icon={'/stopRecording.svg'} text='Stop' disabled={!isRecording && false} />
                        <Button onClick={() => cancelRecord(() => setIsRecording(false))} icon={'/cancel.svg'} text='Cancel' disabled={!isRecording && false} />
                    </div>
                    <div className='w-full mt-[20px]'>
                        <Button className='w-full h-[48px] items-center flex justify-center' onClick={() => setPage(PAGES.FILES)} text='files' />
                    </div>
                </div>
                <div className='w-fit left-[15px] absolute'>
                    <p>Edge2: {rosStatus ? <span className='text-green-500'>Connected!</span> : rosError ? <span className='text-red-500'>{rosError}</span> : <span className='text-blue-500'>Not Connected!</span>}</p>
                    <p>Status: {isRecording ? <span className='text-green-500'>Recording!</span> : <span className='text-blue-500'>Not Recording!</span>}</p>
                </div>
            </div>

            {/* <div>
                <input className='text-black' value={command} onChange={(event) => setCommand(event.target.value)} />
                <Button text={'unzip'} onClick={() => {
                    decompress(command).then((res: any) => { setResponse(res.data) });
                }} />
                <Button text={'run'} onClick={() => {
                    runDocker(command).then((res: any) => { setResponse(res.data) });
                }} />
                <div>{response || 'No Response'}</div>
            </div> */}

        </div>
    )
}

export default memo(forwardRef(Viewer));