import { BUTTON_TYPES } from "@/constants";
import Image from "next/image";

function Button({onClick, text, icon, type, className='', disabled=false, loading=false}: any) {
    if(disabled) className += ' invisible';
    if(icon && !text) return (
        <button disabled={disabled} className={`btn-primary flex w-[44px] h-[44px] rounded-[22px] bg-[#1A2335] border-0 items-center justify-center ${className}`} onClick={onClick}>
            <Image className={loading ? 'animate-spin' : ''} width='20' height='20' alt={text || 'btn'} src={icon} />
        </button>);
    if(text && !icon) return (
        <button disabled={disabled} className={`btn-primary px-[12px] py-[8px] h-[34px] bg-[#3C4352] ${className}`} onClick={onClick}>
                <span className="text-[12px] font-normal leading-3">{text}</span>
        </button>
    );
    if(type === BUTTON_TYPES.H) return (
        <button disabled={disabled} className={`btn-primary ${className}`} onClick={onClick}>
            <div className='btn-content flex-row'>
                <Image className={loading ? 'animate-spin' : ''} width='16' height='16' alt={text || 'btn'} src={icon} />
                <span className="ml-[8px] text-[12px] font-normal leading-3">{text}</span>
            </div>
        </button>
    );
    else return (
        <button disabled={disabled} className={`btn-primary min-w-[60px] w-[60px] h-[60px] ${className}`} onClick={onClick}>
            <div className='btn-content flex-col'>
                <Image className={loading ? 'animate-spin' : ''} width='20' height='20' alt={text || 'btn'} src={icon} />
                <span className="text-[12px] font-normal leading-3">{text}</span>
            </div>
        </button>
    );
};

export default Button;