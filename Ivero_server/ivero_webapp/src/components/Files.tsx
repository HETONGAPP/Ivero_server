import React, { forwardRef, memo, useEffect, useImperativeHandle, useRef, useState } from 'react';

import Button from './Button';
import { BUTTON_TYPES, PAGES } from '@/constants';
import useExec from '@/hooks/useExec';
import { DL_DIR, HOME_DIR } from '@/config';
import downloadFile from '@/helpers/downloadFile';

function Files({ page, setPage, ros }: any) {
    const [edgeFiles, setEdgeFiles] = useState<Array<string>>([]);
    const [localFiles, setLocalFiles] = useState<Array<string>>([]);
    const [localFolders, setLocalFolders] = useState<Array<string>>([]);
    const { exec, decompress, runDocker, remove } = useExec();
    const [loading, setLoading] = useState(false);
    const { serveDownloadFile, getFileList, deleteFile } = ros;

    useEffect(() => {
        if (page === PAGES.FILES) {
            refreshLists();
        }
    }, [page]);

    const download = (file: string) => {
        return new Promise(resolve => {
            serveDownloadFile(file, async() => {
                // startTransition(async () => {
                    console.log('startjs');
                    setTimeout(async () => {
                        await downloadFile();
                        console.log('endjs');
                        resolve(null);
                    }, 2000);
                // });
            });
        });
    };

    const refreshLists = async () => {
        setLoading(true);
        try{
            const localFileList = await refreshLocalFilesList();
            const localFolderList = await refreshLocalFoldersList();
            setLocalFiles(localFileList);
            setLocalFolders(localFolderList);
            const edgeList = await refreshEdgeList();
            setEdgeFiles(edgeList);
        } catch(e) {
            console.error(e)
        }
        setLoading(false);
    };

    const refreshEdgeList = async () => {
        return (await getFileList());
    };

    const refreshLocalFilesList = async () => {
        const res = (await exec(`ls ${DL_DIR}/*.zip`)).data;
        if (res.startsWith('ls') && res.endsWith('No such file or directory')) return ([]);
        else return (res.split('\n'));
    };

    const refreshLocalFoldersList = async () => {
        const res = (await exec(`ls -d ${DL_DIR}/*/`)).data;
        if (res.startsWith('ls') && res.endsWith('No such file or directory')) return ([]);
        else return (res.split('\n'));
    };

    const runPipeLine = async (file: any, name: any) => {
        if(!file.local) {
            if(file.edge) await download(name);
            else if (file.unzipped){
                runDocker(file.dir);
                return;
            } 
            else throw new Error('not existing');
        }
        await remove(DL_DIR+'/'+name);
        await decompress(DL_DIR+'/'+name+'.zip');
        await runDocker(DL_DIR+'/'+name);
    }

    const files: any = {};

    for (const edgeFile of edgeFiles) {
        let edgeFileStr: string = edgeFile[0];
        edgeFileStr = edgeFileStr.substring(0, edgeFileStr.length - 4);
        files[edgeFileStr] = { edge: true, local: false, unzipped: false, fileSize: edgeFile[1] };
    }

    for (const localfile of localFiles) {
        const path = localfile.split('/');
        let localfileStr = path[path.length - 1];
        localfileStr = localfileStr.substring(0, localfileStr.length - 4);
        if (files[localfileStr]) {
            files[localfileStr].local = true;
            files[localfileStr].path = localfile;
        } else {
            files[localfileStr] = { edge: false, local: true, unzipped: false, path: localfile };
        }
    }

    for (const localFolder of localFolders) {
        const path = localFolder.split('/');
        const localFolderStr = path[path.length - 2];
        if (files[localFolderStr]) {
            files[localFolderStr].unzipped = true;
            files[localFolderStr].dir = localFolder;
        } else {
            files[localFolderStr] = { edge: false, local: false, unzipped: true, dir: localFolder };
        }
    }

    return (
        <div className='content flex justify-center items-center bg-transparent w-full'>
            <div className='w-full flex flex-row justify-between items-center mb-[10px]'>
                <Button className='' icon={'back.svg'} onClick={() => setPage(PAGES.VIEWER)} />
                <Button type={BUTTON_TYPES.H} text='Refresh' icon={'refresh.svg'} onClick={refreshLists} loading={loading} disabled={false} />
            </div>
            {Object.keys(files).map((file: any) => {
                return <div className='w-full bg-[#192234] rounded-[4px] mb-[8px] p-[8px] text-[12px] flex flex-row justify-between items-center' key={file}>
                    <div className='flex flex-row items-center'>
                        <div>{file}</div>
                        {files[file].fileSize && <>
                            <div className='mx-[12px] w-[4px] h-[4px] rounded-[4px] bg-[#303848]' />
                            <div>{files[file].fileSize} GB</div>
                        </>}
                    </div>
                    <div className='flex gap-[12px]'>
                        <Button onClick={async () => {
                            download(file);
                        }} text='Download from Edge' disabled={!files[file].edge} />
                        <Button onClick={async () => {
                            decompress(files[file].path);
                        }} text='Unzip in Local' disabled={!files[file].local} />
                        <Button text='Reconstruct' onClick={() => {
                            runDocker(files[file].dir);
                        }} disabled={!files[file].unzipped} />
                        <Button text='Run Pipeline' onClick={() => {
                            runPipeLine(files[file], file);
                        }} />
                        <Button text='Delete from Edge' onClick={() => deleteFile(file)} disabled={!files[file].edge} />
                        <Button text='Delete from Local' onClick={() => remove(files[file].path)} disabled={!files[file].local} />
                        <Button text='Delete Unzipped' onClick={() => remove(files[file].dir)} disabled={!files[file].unzipped} />
                    </div>
                </div>
            }
            )}
        </div>
    )

    // return (
    //     <div className='content flex justify-center items-center bg-transparent w-full'>
    //         <div className='w-full flex flex-row justify-between items-center mb-[10px]'>
    //             <Button className='' icon={'back.svg'} onClick={() => setPage(PAGES.VIEWER)} />
    //             <Button type={BUTTON_TYPES.H} text='Refresh' icon={'refresh.svg'} onClick={refreshLists} loading={loading} disabled={false} />
    //         </div>
    //         <div className='w-full my-[10px]'>EDGE FILES</div>
    //         {edgeFiles.map(([fileName, fileSize]: any) => {
    //             let str = fileName;
    //             str = str.substring(0, str.length - 4);
    //             return <div className='w-full bg-[#192234] rounded-[4px] mb-[8px] p-[8px] text-[12px] flex flex-row justify-between items-center' key={fileName}>
    //                 <div className='flex flex-row items-center'>
    //                     <div>{str}</div>
    //                     <div className='mx-[12px] w-[4px] h-[4px] rounded-[4px] bg-[#303848]' />
    //                     <div>{fileSize} GB</div>
    //                 </div>
    //                 <div className='flex gap-[12px]'>
    //                     <Button onClick={async () => {
    //                         download(fileName);
    //                     }} text='Download' />
    //                     <Button text='Delete' onClick={() => deleteFile(fileName)} />
    //                 </div>
    //             </div>
    //         }
    //         )}
    //         <div className='w-full my-[10px]'>LOCAL FILES</div>
    //         {localFiles.map((fileName: any) => {
    //             const path = fileName.split('/');
    //             let str = path[path.length - 1];
    //             str = str.substring(0, str.length - 4);
    //             return <div className='w-full bg-[#192234] rounded-[4px] mb-[8px] p-[8px] text-[12px] flex flex-row justify-between items-center' key={fileName}>
    //                 <div className='flex flex-row items-center'>
    //                     <div>{str}</div>
    //                 </div>
    //                 <div className='flex gap-[12px]'>
    //                     <Button onClick={async () => {
    //                         decompress(fileName);
    //                     }} text='Unzip' />
    //                     <Button text='Delete' onClick={() => remove(fileName)} />
    //                 </div>
    //             </div>
    //         }
    //         )}
    //         <div className='w-full my-[10px]'>LOCAL FOLDERS</div>
    //         {localFolders.map((fileName: any) => {
    //             const path = fileName.split('/');
    //             const str = path[path.length - 2];
    //             return <div className='w-full bg-[#192234] rounded-[4px] mb-[8px] p-[8px] text-[12px] flex flex-row justify-between items-center' key={fileName}>
    //                 <div className='flex flex-row items-center'>
    //                     <div>{str}</div>
    //                 </div>
    //                 <div className='flex gap-[12px]'>
    //                     <Button text='Reconstruct' onClick={() => {
    //                         runDocker(fileName);
    //                     }} />
    //                     <Button text='Delete' onClick={() => remove(fileName)} />
    //                 </div>
    //             </div>
    //         }
    //         )}
    //     </div>
    // )
}

export default memo(Files);