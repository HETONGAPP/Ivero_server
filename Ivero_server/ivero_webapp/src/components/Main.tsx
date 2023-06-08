import React, { memo, useEffect, useRef, useState, useTransition } from 'react';
import useRoslib from '@/hooks/useRoslib';

type CanvasRefType = {
    addPoints: () => void;
};

import {EDGE_IP_WIFI, EDGE_TMUX_PORT} from "@/config";
import downloadFile from '@/helpers/downloadFile';
import Files from './Files';
import Viewer from './Viewer';
import { PAGES } from '@/constants';

function Main() {
    const [isPending, startTransition] = useTransition();
    const canvasRef = useRef<CanvasRefType>();
    const ros = useRoslib(canvasRef);
    const [currentPage, setCurrentPage] = useState(PAGES.VIEWER);

    // window.addEventListener('online', function() {
    //     // Browser is now online
    //     console.log('Network status: Online');
    // });

    return (
        <div>

            {currentPage === PAGES.VIEWER && <Viewer setPage={setCurrentPage} ros={ros} ref={canvasRef} />}

            {currentPage === PAGES.FILES && <Files page={currentPage} setPage={setCurrentPage} ros={ros} />}

            <div className='flex flex-col w-full justify-between'>
                <iframe id="my-iframe" src={`http://${EDGE_IP_WIFI}:${EDGE_TMUX_PORT}/`} className='h-[400px] overflow-auto mb-[20px]'/>
            </div>

        </div>
    )
}

export default memo(Main);