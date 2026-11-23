import numpy as np
EXT=[(0,4.23),(6.13,8.53),(29.37,32.23),(37.37,99)]
def is_ext(t): return any(a<=t<b for a,b in EXT)
def rgb2hsv(a):
    r,g,b=a[...,0],a[...,1],a[...,2]
    mx=a.max(-1); mn=a.min(-1); d=mx-mn+1e-6
    h=np.where(mx==r,((g-b)/d)%6,np.where(mx==g,(b-r)/d+2,(r-g)/d+4))*60
    s=np.where(mx>0,(mx-mn)/(mx+1e-6),0); return h,s,mx
def hsv2rgb(h,s,v):
    h=(h%360)/60; i=np.floor(h).astype(int)%6; f=h-np.floor(h)
    p=v*(1-s); q=v*(1-s*f); t=v*(1-s*(1-f))
    r=np.choose(i,[v,q,p,p,t,v]); g=np.choose(i,[t,v,v,q,p,p]); b=np.choose(i,[p,p,t,v,v,q])
    return np.stack([r,g,b],-1)
def band(x,lo,hi,soft):
    return np.clip((x-lo)/soft+1,0,1)*np.clip((hi-x)/soft+1,0,1)
def smooth(x):
    return x*x*(3-2*x)
def grade(frame,t,wb=None):
    a=frame.astype(np.float32)/255.0
    out=a.copy()
    if wb is not None:
        # undo the pulsing red alarm tint so the shirt mask sees true colours
        ga,gb=wb; a=np.clip(a*ga+gb,0,1)
    h,s,v=rgb2hsv(a)
    if is_ext(t):
        # train livery: saturated mid/bright blue -> crimson
        m=band(h,200,240,12)*np.clip((s-0.42)/0.12,0,1)*np.clip((v-0.24)/0.08,0,1)
        nh=np.full_like(h,352.0); ns=np.clip(s*1.05,0,0.85); nv=np.clip(v*0.95,0,1)
        rec=hsv2rgb(nh,ns,nv)
        out=out*(1-m[...,None])+rec*m[...,None]
        # upper livery: pale steel-blue -> warm cream (red & cream look)
        m2=band(h,200,242,12)*np.clip((s-0.12)/0.05,0,1)*np.clip((0.5-s)/0.06,0,1)*np.clip((v-0.46)/0.08,0,1)*(1-m)
        rec2=hsv2rgb(np.full_like(h,38.0),np.clip(s*0.45,0,0.2),np.clip(v*1.03,0,1))
        out=out*(1-m2[...,None])+rec2*m2[...,None]
        m=np.maximum(m,m2)
        # night split-tone: shadows -> deep violet/indigo, highlights warm
        lum=(0.2126*out[...,0]+0.7152*out[...,1]+0.0722*out[...,2])[...,None]
        sh=np.clip(1-lum/0.35,0,1); hi=np.clip((lum-0.55)/0.45,0,1)
        out=out+sh*np.array([0.055,-0.005,0.035])*(0.4+lum*3)+hi*np.array([0.06,0.03,-0.04])
        out=(out-0.5)*1.08+0.5
    else:
        # ABHI shirt: low/mid-sat light blue -> saffron orange
        m=band(h,195,240,12)*np.clip((s-0.07)/0.04,0,1)*np.clip((0.62-s)/0.08,0,1)*np.clip((v-0.42)/0.08,0,1)
        nh=np.full_like(h,28.0); ns=np.clip(0.25+s*2.6,0,0.82); nv=np.clip(v*1.02,0,1)
        rec=hsv2rgb(nh,ns,nv)
        if wb is not None:
            rec=np.clip((rec-wb[1])/wb[0],0,1)
            gate=np.zeros_like(m); gate[470:1060,110:480]=1; m=m*gate
        out=out*(1-m[...,None])+rec*m[...,None]
        # interior: warm cream walls, teal-tinted shadows, contrast
        lum=(0.2126*out[...,0]+0.7152*out[...,1]+0.0722*out[...,2])[...,None]
        sh=np.clip(1-lum/0.4,0,1); hi=np.clip((lum-0.5)/0.5,0,1)
        out=out+hi*np.array([0.035,0.012,-0.035])+sh*np.array([-0.02,0.01,0.03])
        out=(out-0.5)*1.1+0.5
    # mild saturation boost
    lum=(0.2126*out[...,0]+0.7152*out[...,1]+0.0722*out[...,2])[...,None]
    out=lum+(out-lum)*1.12
    return (np.clip(out,0,1)*255+0.5).astype(np.uint8), m
