'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CONNECTIONS_STATES } from '@/constants';
import useExec from '@/hooks/useExec';
import Button from './Button';

export default function Connect({ steps, state, currentStep, provideWifiCreds }: any) {
    const [loadingDots, setLoadingDots] = useState(1);
    const [ssid, setSsid] = useState<string>();
    const [pass, setPass] = useState<string>('Roove@123');
    const { getWifiName } = useExec();

    useEffect(() => {
        let timeout: any;
        if (state === CONNECTIONS_STATES.PROCESSING) {
            timeout = setTimeout(() => {
                setLoadingDots((loadingDots) % 4 + 1);
            }, 500);

        } else {
            setLoadingDots(1);
        }
        return () => clearTimeout(timeout)
    }, [loadingDots, state]);

    useEffect(()=>{
        getWifiName().then(res => {setSsid(res.data)});
    }, [])

    return (
        <div>
            <div className='grid grid-cols-3 items-center w-full grid-4 justify-between mb-[10px]'>
                <div>state: {state}{new Array(loadingDots).join(".")}</div>
            </div>
            {state === CONNECTIONS_STATES.READY && (
                <div>
                    <label>wifi name: </label>
                    <label>{ssid} </label>
                    <label>password: </label>
                    <input className='text-black' value={pass} onChange={event => setPass(event.target.value)} />
                    <Button text='connect' onClick={() => {provideWifiCreds(ssid, pass)}} />
                </div>
            )}
            {state !== CONNECTIONS_STATES.DONE && steps.map((step: any, i: any) => {
                return (
                    <div className='flex flex-row items-center' key={step}>
                        {currentStep === i && <div className='mr-[10px] w-[10px] h-[10px] bg-green-500' />}
                        {currentStep > i && <div className='mr-[10px] w-[10px] h-[10px] bg-green-500' />}
                        {currentStep < i && <div className='mr-[10px] w-[10px] h-[10px]' />}
                        <span>{i} - {step}</span>
                    </div>
                );
            })}
            
        </div>
    )
}
