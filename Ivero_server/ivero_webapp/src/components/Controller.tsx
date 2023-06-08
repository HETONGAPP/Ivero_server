'use client';

import React, { useEffect, useRef, useState } from 'react';
import useHandshake from '@/hooks/useHandshake';
import { CONNECTIONS_STATES } from '@/constants';
import Connect from './Connect';
import Main from './Main';

export default function Controller() {
    const { steps, state, currentStep, provideWifiCreds } = useHandshake();
    const [loadingDots, setLoadingDots] = useState(1);

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

    return (
        <div className='content bg-transparent'>
            <Connect steps={steps} state={state} currentStep={currentStep} provideWifiCreds={provideWifiCreds} />
            {state === CONNECTIONS_STATES.DONE && <Main />}
        </div>
    )
}
